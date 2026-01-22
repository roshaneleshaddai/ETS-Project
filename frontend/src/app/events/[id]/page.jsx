"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
      
      const response = await fetch(`http://localhost:5000/events/${eventId}`);
      
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
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
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
                src="data:image/jpeg;base64,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"
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
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
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
                  <p className="text-gray-600">{event.description}</p>
                </div>

                {/* Event Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Date</p>
                      <p className="text-gray-900 font-semibold">{formatDate(event.startDateTime)}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Clock className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Time</p>
                      <p className="text-gray-900 font-semibold">{formatTime(event.startDateTime)}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg sm:col-span-2">
                    <MapPin className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
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
                      <Users className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
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
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{zone.name}</h4>
                        <span className="text-lg font-bold text-indigo-600">${zone.price}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {zone.availableSeats || 0} seats available
                        </span>
                        {selectedZone?._id === zone._id && (
                          <span className="text-indigo-600 font-medium">Selected</span>
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
                    <span className="text-indigo-600">${selectedZone.price * ticketQuantity}</span>
                  </div>
                )}

                <button
                  onClick={handleBooking}
                  disabled={!selectedZone}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    selectedZone
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
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