"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import {formatLikes} from "../../utils/formatLikes";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  Share2, 
  Heart,
  Users,
  Info,
  Ticket
} from 'lucide-react';

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);

  useEffect(() => {
    if (params?.id) {
      fetchEventDetails(params.id);
    }
  }, [params?.id]);

  const fetchEventDetails = async (eventId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/events/${eventId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch event details');
      }
      
      const data = await response.json();
      console.log('Event details:', data);
      setEvent(data);
      
      // Set default zone if available
      if (data.zones && data.zones.length > 0) {
        setSelectedZone(data.zones[0]);
      }
      
    } catch (err) {
      console.error('Error fetching event details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  const getEventImage = (event) => {
    if (event.image) {
      // Handle different image formats
      if (typeof event.image === 'string') {
        if (event.image.startsWith('data:')) {
          return event.image;
        } else if (event.image.startsWith('http')) {
          return event.image;
        } else {
          return `data:image/jpeg;base64,${event.image}`;
        }
      }
    }
    // Fallback to Unsplash with proper URL format
    const searchTerm = event.type || 'event';
    return `https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=1000&auto=format&fit=crop`;
  };

  const handleBooking = () => {
    if (!selectedZone) {
      alert('Please select a seating zone');
      return;
    }

    const bookingData = {
      eventId: event._id,
      eventName: event.name,
      zone: selectedZone,
      quantity: ticketQuantity,
      totalPrice: selectedZone.price * ticketQuantity,
      eventDate: event.startDateTime
    };

    console.log('Booking:', bookingData);
    // Navigate to checkout page or handle booking
    // router.push(`/checkout?eventId=${event._id}&zone=${selectedZone._id}&qty=${ticketQuantity}`);
    alert(`Booking ${ticketQuantity} ticket(s) for ${selectedZone.name} - $${selectedZone.price * ticketQuantity}`);
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
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-4">
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Navbar />
      <header className="bg-white top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Heart className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Event Hero */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Event Image */}
            <div className="lg:col-span-1">
              <div className="relative rounded-xl overflow-hidden aspect-[3/4] shadow-lg bg-gray-200">
                <img 
                //   src={getEventImage(event)} 
                src="https://img.freepik.com/free-vector/flat-design-movie-theater-background_23-2150998489.jpg?semt=ais_hybrid&w=740&q=80"
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
                  <p className="text-gray-600">{event.description} - {formatLikes(event.likes)}❤️</p>
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

                {/* Additional Info */}
                {event.additionalInfo && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Important Information</p>
                        <p className="text-sm text-blue-800 mt-1">{event.additionalInfo}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section className="bg-white border-t border-gray-200 sticky bottom-0 lg:static shadow-lg lg:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Seating Zones */}
            <div className="lg:col-span-2">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Select Your Seats</h3>
              
              {event.zones && event.zones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {event.zones.map((zone) => (
                    <div
                      key={zone._id}
                      onClick={() => setSelectedZone(zone)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedZone?._id === zone._id
                          ? 'border-slate-800 bg-slate-50'
                          : 'border-gray-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{zone.name}</h4>
                        <span className="text-lg font-bold text-blue-600">${zone.price}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {zone.availableSeats || 0} seats available
                        </span>
                        {selectedZone?._id === zone._id && (
                          <span className="text-slate-800 font-medium">Selected</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-gray-50 rounded-lg text-center">
                  <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Seating information coming soon</p>
                </div>
              )}
            </div>

            {/* Booking Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-6 sticky top-20">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Summary</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Event</span>
                    <span className="font-medium text-gray-900">{event.name}</span>
                  </div>
                  
                  {selectedZone && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Zone</span>
                        <span className="font-medium text-gray-900">{selectedZone.name}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Price per ticket</span>
                        <span className="font-medium text-gray-900">${selectedZone.price}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-3">
                    <span className="text-gray-600">Quantity</span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="font-medium text-gray-900 w-8 text-center">{ticketQuantity}</span>
                      <button
                        onClick={() => setTicketQuantity(Math.min(10, ticketQuantity + 1))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {selectedZone && (
                  <div className="flex justify-between items-center text-lg font-bold text-gray-900 mb-6 pt-4 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-blue-600">${selectedZone.price * ticketQuantity}</span>
                  </div>
                )}

                <button
                  onClick={handleBooking}
                  disabled={!selectedZone}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    selectedZone
                      ? 'bg-slate-800 hover:bg-slate-900 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {selectedZone ? 'Book Now' : 'Select a Zone'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}