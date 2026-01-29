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
  ShoppingCart
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
      
      // Setup WebSocket
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

  const getEventImage = (event) => {
    if (event.image) {
      return event.image;
    }
  }

  const fetchEventDetails = async (eventId) => {
    try {
      setLoading(true);
      setError(null);
      
      const eventRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/events/${eventId}`);
      if (!eventRes.ok) throw new Error('Failed to fetch event details');
      const eventData = await eventRes.json();
      setEvent(eventData);
      
      if (eventData.venue?._id || eventData.venueId) {
        const venueId = eventData.venue?._id || eventData.venueId;
        const venueRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/venue/${venueId}`);
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
      weekday: 'long',
      month: 'long', 
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
    // Navigate to a full-screen seating map that shows all seats
    router.push(`/events/${event._id}/seating`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-2 rounded-lg mb-4">
            <p className="font-semibold">Error Loading Event</p>
            <p className="text-sm mt-1">{error || 'Event not found'}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Navbar />
      {/* <header className="bg-white top-0 z-50">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Share2 className="w-5 h-5 text-gray-700" />
              </button>
              {user && customerId && (
                <button 
                  onClick={handleLikeToggle}
                  disabled={likingInProgress}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
                    likingInProgress ? 'opacity-50 cursor-wait' : ''
                  }`}
                >
                  <Heart className={`w-5 h-5 ${
                      isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </header> */}

      {/* Event Hero */}
      <section className="bg-white">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              {/* <span className="font-medium">Back</span> */}
            </button>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Event Image */}
            <div className="lg:col-span-1">
              <div className="relative rounded-xl overflow-hidden aspect-[9/12] shadow-lg bg-gray-200">
                <img 
                  src={getEventImage(event)} 
                  // src="https://img.freepik.com/free-vector/flat-design-movie-theater-background_23-2150998489.jpg?semt=ais_hybrid&w=740&q=80"
                  alt={event.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/600x800/8B5CF6/FFFFFF?text=' + encodeURIComponent(event.name);
                  }}
                  />
              </div>
            </div>

            {/* Event Info */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* Event Title & Type */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                     <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm font-medium">
                       {event.type}
                     </span>
                     {event.status === 'ACTIVE' && (
                       <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Available
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                    {event.name}
                  </h1>
                  <p className="text-gray-600">{event.description} - {formatLikes(event.likes || 0)}❤️</p>
                </div>

                {/* Event Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Date</p>
                      <p className="text-gray-900 font-semibold">{formatDate(event.startDateTime)}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Time</p>
                      <p className="text-gray-900 font-semibold">{formatTime(event.startDateTime)}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg sm:col-span-2">
                    <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Venue</p>
                      <p className="text-gray-900 font-semibold">{event.venue?.name || 'Venue TBA'}</p>
                      {event.venue?.city && (
                        <p className="text-sm text-gray-600 mt-1">{event.venue.city}</p>
                      )}
                    </div>
                  </div>

                  {event.seatingType && (
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Seating Type</p>
                        <p className="text-gray-900 font-semibold capitalize">{event.seatingType.toLowerCase()}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button 
                className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                onClick={handleSectionClick}>Book Tickets</button>
              </div>
            </div>
          </div>
          
                      <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Share2 className="w-5 h-5 text-gray-700" />
              </button>
              {user && customerId && (
                <button 
                  onClick={handleLikeToggle}
                  disabled={likingInProgress}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
                    likingInProgress ? 'opacity-50 cursor-wait' : ''
                  }`}
                >
                  <Heart className={`w-5 h-5 ${
                      isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {venue && seats.length > 0 ? (
          <VenueMap
            venue={venue}
            eventId={event._id}
            seats={seats}
            onSeatClick={handleSeatClick}
            selectedSeatIds={selectedSeats}
            zonePricing={zonePricing}
            currency={event.currency || 'ZAR'}
            onSectionClick={handleSectionClick}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Venue map loading...</p>
          </div>
        )}
      </section>

      {selectedSeats.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white shadow-2xl z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">
                  {selectedSeats.size} seat{selectedSeats.size !== 1 ? 's' : ''} selected
                </p>
                <p className="text-2xl font-bold">
                  {event.currency || 'ZAR'} {calculateTotal().toFixed(2)}
                </p>
              </div>
              <button
                onClick={handleCheckout}
                className="flex items-center space-x-2 px-8 py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-gray-100 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Continue to Checkout</span>
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}