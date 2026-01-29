"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import VenueMap from "@/app/components/VenueMap";
import { formatLikes } from "../../utils/formatLikes";
import { useAuth } from "@/context/AuthContext";
import { io } from 'socket.io-client';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  Share2, 
  Heart,
  Users,
  Info,
  Ticket,
  ShoppingCart,
  Star,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [venue, setVenue] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState(new Set());
  const [isLiked, setIsLiked] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (params?.id) {
      fetchEventDetails(params.id);
      if (user) {
        fetchCustomerData(params.id);
      }
      
      const socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_URI || 'http://localhost:4000');
      setSocket(socketInstance);
      
      socketInstance.emit('join-event', params.id);
      
      socketInstance.on('seatStatusChanged', ({ seatId, status }) => {
        setSeats(prevSeats => 
          prevSeats.map(seat => 
            seat._id === seatId ? { ...seat, status } : seat
          )
        );
      });

      socketInstance.on('joined-event', (data) => {
        console.log('Joined event room:', data);
      });

      return () => {
        socketInstance.emit('leave-event', params.id);
        socketInstance.disconnect();
      };
    }
  }, [params?.id, user]);

  const fetchEventDetails = async (eventId) => {
    try {
      setLoading(true);
      setError(null);
      
      const eventRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/events/${eventId}`);
      if (!eventRes.ok) throw new Error('Failed to fetch event details');
      const eventData = await eventRes.json();
      setEvent(eventData);
      
      if (eventData.venueId) {
        const venueRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URI}/venue/${eventData.venueId}`
        );

        if (venueRes.ok) {
          const venueData = await venueRes.json();
          setVenue(venueData);
        }
      }
      
      const seatsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/seats/event/${eventId}`);
      if (seatsRes.ok) {
        const seatsData = await seatsRes.json();
        setSeats(seatsData.seats || []);
      }
      
    } catch (err) {
      console.error('Error fetching event details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerData = async (eventId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/user/${user._id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No customer record found for this user');
          return;
        }
        throw new Error('Failed to fetch customer data');
      }
      
      const customerData = await response.json();
      setCustomerId(customerData._id);
      
      const liked = customerData.likedEvents?.some(id => id.toString() === eventId);
      setIsLiked(liked);
      
    } catch (err) {
      console.error('Error fetching customer data:', err);
    }
  };

  const handleLikeToggle = async () => {
    if (!user) {
      alert('Please login to like events');
      router.push('/auth/login');
      return;
    }

    if (!customerId) {
      alert('Unable to process like. Please refresh the page and try again.');
      return;
    }

    if (likingInProgress) return;

    try {
      setLikingInProgress(true);
      
      const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/${customerId}/like-event`;
      const method = isLiked ? 'DELETE' : 'POST';
      
      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event._id })
      });

      if (!response.ok) {
        throw new Error('Failed to update like status');
      }

      setIsLiked(!isLiked);
      setEvent(prevEvent => ({
        ...prevEvent,
        likes: (prevEvent.likes || 0) + (isLiked ? -1 : 1)
      }));

    } catch (err) {
      console.error('Error toggling like:', err);
      alert(err.message || 'Failed to update like status');
    } finally {
      setLikingInProgress(false);
    }
  };

  const handleSeatClick = (seat) => {
    setSelectedSeats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seat._id)) {
        newSet.delete(seat._id);
      } else {
        if (newSet.size >= 10) {
          alert('Maximum 10 seats can be selected at once');
          return prev;
        }
        newSet.add(seat._id);
      }
      return newSet;
    });
  };

  const handleCheckout = async () => {
    if (selectedSeats.size === 0) {
      alert('Please select at least one seat');
      return;
    }

    if (!user || !customerId) {
      alert('Please login to book tickets');
      router.push('/auth/login');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/seats/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event._id,
          seatIds: Array.from(selectedSeats),
          customerId: customerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Some seats are no longer available');
      }

      const { holdToken, expiresAt } = await response.json();
      
      sessionStorage.setItem('holdToken', holdToken);
      sessionStorage.setItem('holdExpiry', expiresAt);
      sessionStorage.setItem('selectedSeats', JSON.stringify(Array.from(selectedSeats)));
      
      router.push(`/checkout?eventId=${event._id}&holdToken=${holdToken}`);
      
    } catch (error) {
      console.error('Error holding seats:', error);
      alert(error.message || 'Failed to reserve seats. Please try again.');
      fetchEventDetails(params.id);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    selectedSeats.forEach(seatId => {
      const seat = seats.find(s => s._id === seatId);
      if (seat && event.zones) {
        const zone = event.zones.find(z => z._id === seat.zoneId);
        if (zone) {
          total += zone.price;
        }
      }
    });
    return total;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const handleSectionClick = () => {
    router.push(`/events/${event._id}/seating`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-4">
            <p className="font-semibold">Event Not Found</p>
            <p className="text-sm mt-1">{error || 'This event could not be loaded'}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const zonePricing = new Map();
  if (event.zones) {
    event.zones.forEach(zone => {
      zonePricing.set(zone._id, zone.price);
    });
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Main Content */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          {/* Back Button & Actions */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium hidden sm:inline">Back</span>
            </button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Event Poster */}
            <div className="lg:col-span-4">
              <div className="sticky top-20">
                <div className="rounded-lg overflow-hidden shadow-md">
                  <div className="relative aspect-[4/5] bg-gray-100">
                    <img 
                      src={event.image} 
                      alt={event.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/600x900/f3f4f6/1f2937?text=' + encodeURIComponent(event.name);
                      }}
                    /> 
                  {/* 🔥 Likes + Favorite Overlay (Top Left) */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    <span className="text-white text-sm font-semibold">
                      {formatLikes(event.likes || 0)}
                    </span>
                  </div>

                  {/* ❤️ Like / Unlike Button on Image */}
                  {user && customerId && (
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      
                      {/* Like Button */}
                      <button
                        onClick={handleLikeToggle}
                        disabled={likingInProgress}
                        className={`p-2 rounded-full bg-white/90 hover:bg-white shadow transition
                          ${likingInProgress ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        <Heart
                          className={`w-5 h-5 transition ${
                            isLiked
                              ? 'fill-red-500 text-red-500 scale-110'
                              : 'text-gray-700'
                          }`}
                        />
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: event.name,
                              text: event.description || 'Check out this event!',
                              url: window.location.href,
                            });
                          } else {
                            navigator.clipboard.writeText(window.location.href);
                            alert('Event link copied to clipboard!');
                          }
                        }}
                        className="p-2 rounded-full bg-white/90 hover:bg-white shadow transition"
                      >
                        <Share2 className="w-5 h-5 text-gray-700" />
                      </button>

                    </div>
                  )}

                  {/* Status Badge */}
                  {event.status === 'ACTIVE' && (
                    <div className="absolute bottom-3 right-3">
                      <div className="px-3 py-1.5 bg-green-600 rounded-md text-white text-xs font-semibold flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Available</span>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="lg:col-span-8">
              {/* Event Title & Type */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-xs font-semibold uppercase">
                      {event.type}
                    </span>
                    {event.seatingType && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium capitalize flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{event.seatingType.toLowerCase()}</span>
                      </span>
                    )}
                  </div>
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {event.name}
                </h1>
                
                {event.description && (
                  <p className="text-base text-gray-600">
                    {event.description}
                  </p>
                )}
              </div>

              {/* Event Details Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Date Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-red-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase mb-0.5">Date</p>
                      <p className="text-gray-900 font-semibold">{formatDate(event.startDateTime)}</p>
                    </div>
                  </div>
                </div>

                {/* Time Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Clock className="w-5 h-5 text-red-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase mb-0.5">Time</p>
                      <p className="text-gray-900 font-semibold">{formatTime(event.startDateTime)}</p>
                    </div>
                  </div>
                </div>

                {/* Venue Card */}
                <div className="sm:col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-red-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase mb-0.5">Venue</p>
                      <p className="text-gray-900 font-semibold">
                        {venue?.name || 'Venue TBA'}
                      </p>
                      {venue?.city && (
                        <p className="text-gray-600 text-sm mt-0.5">
                          {venue.city}
                        </p>
                      )}
                      {venue?.location && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          {venue.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone Pricing */}
              {event.zones && event.zones.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Ticket className="w-4 h-4 text-gray-700" />
                    <h3 className="text-base font-semibold text-gray-900">Ticket Pricing</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {event.zones.map((zone) => (
                      <div 
                        key={zone._id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <p className="text-gray-600 text-xs mb-0.5">{zone.name}</p>
                        <p className="text-lg font-bold text-gray-900">
                          ₹{zone.price.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Button */}
              <div className="mb-4">
                <button 
                  onClick={handleSectionClick}
                  className="w-full sm:w-auto px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Ticket className="w-5 h-5" />
                    <span>Book Tickets</span>
                  </div>
                </button>
              </div>

              {/* Additional Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900 mb-1.5">Important Information</p>
                    <ul className="space-y-0.5 text-gray-600 text-xs">
                      <li>• Arrive at least 30 minutes before the event</li>
                      <li>• No cancellations or refunds</li>
                      <li>• Entry subject to terms and conditions</li>
                      <li>• Outside food and beverages not allowed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}