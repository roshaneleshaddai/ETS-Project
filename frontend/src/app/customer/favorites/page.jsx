'use client';
import { useState, useEffect } from "react";
import { Heart, Calendar, MapPin, Ticket, HeartOff, ArrowLeft } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import RoleGuard from "@/app/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { formatLikes } from "../../utils/formatLikes";

export default function FavoritesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [customerId, setCustomerId] = useState(null);
  const [likedEventIds, setLikedEventIds] = useState([]);
  const [likedEvents, setLikedEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unlikingInProgress, setUnlikingInProgress] = useState(new Set());

  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  useEffect(() => {
    if (likedEventIds.length > 0) {
      fetchLikedEvents();
    } else {
      setIsLoading(false);
    }
  }, [likedEventIds]);

  const fetchCustomerData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch customer data using user ID
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/user/${user._id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No customer record found for this user');
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch customer data');
      }
      
      const customerData = await response.json();
      
      // Store the customer ID
      setCustomerId(customerData._id);
      
      // Get array of liked event IDs
      const eventIds = customerData.likedEvents || [];
      setLikedEventIds(eventIds);
      
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const fetchLikedEvents = async () => {
    try {
      setIsLoading(true);
      
      // Fetch events in batch using the new endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: likedEventIds })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch liked events');
      }

      const events = await response.json();
      setLikedEvents(events);
      
    } catch (err) {
      console.error('Error fetching liked events:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlike = async (eventId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!customerId) {
      alert('Unable to process unlike. Please refresh the page and try again.');
      return;
    }

    if (unlikingInProgress.has(eventId)) {
      return;
    }

    try {
      setUnlikingInProgress(prev => new Set([...prev, eventId]));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/${customerId}/like-event`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ eventId: eventId })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to unlike event' }));
        throw new Error(errorData.message || 'Failed to unlike event');
      }

      // Update local state - remove from liked events
      setLikedEvents(prev => prev.filter(event => event._id !== eventId));
      setLikedEventIds(prev => prev.filter(id => id !== eventId));

    } catch (err) {
      console.error('Error unliking event:', err);
      alert(err.message || 'Failed to unlike event');
    } finally {
      setUnlikingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

  const handleEventClick = (eventId) => {
    router.push(`/events/${eventId}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your favorites...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-semibold mb-2">Error Loading Favorites</p>
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["CUSTOMER"]}>
      <div className="min-h-screen bg-white">
        <Navbar />
        
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-20 md:pb-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium hidden sm:inline">Back</span>
              </button>
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="w-6 h-6 text-red-600 fill-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Favorite Events</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {likedEvents.length === 0 
                    ? "You haven't liked any events yet" 
                    : `${likedEvents.length} favorite event${likedEvents.length !== 1 ? 's' : ''} saved`
                  }
                </p>
              </div>
            </div>
          </div>

          {likedEvents.length === 0 ? (
            /* Empty State */
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 border border-gray-200">
                  <HeartOff className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Favorite Events Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start exploring events and tap the heart icon to save your favorites here
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium shadow-sm"
                >
                  Discover Events
                </button>
              </div>
            </div>
          ) : (
            /* Events Grid - Simple style like customer page */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {likedEvents.map((event) => (
                <div
                  key={event._id}
                  onClick={() => handleEventClick(event._id)}
                  className="group cursor-pointer"
                >
                  <div className="relative rounded-lg overflow-hidden aspect-[2/3] mb-3 bg-gray-200">
                    <img 
                      src={event.image}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x600/f3f4f6/1f2937?text=' + encodeURIComponent(event.name);
                      }}
                    />
                    
                    {/* Unlike Button */}
                    <div className="absolute top-2 right-2">
                      <button 
                        onClick={(e) => handleUnlike(event._id, e)}
                        disabled={unlikingInProgress.has(event._id)}
                        className={`bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all z-10 ${
                          unlikingInProgress.has(event._id) ? 'opacity-50 cursor-wait' : ''
                        }`}
                        title="Remove from favorites"
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                      >
                        <Heart 
                          className="w-4 h-4 fill-red-500 text-red-500"
                        />
                      </button>
                    </div>

                    {/* Likes Count Badge */}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                        <span className="text-white text-xs font-semibold">
                          {formatLikes(event.likes || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {event.status === 'ACTIVE' && (
                      <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                        Available
                      </div>
                    )}
                  </div>
                  
                  {/* Simple Event Info - Like customer page */}
                  <div>
                    <h3 className="font-semibold text-gray-900 text-md line-clamp-2 mb-1">
                      {event.name}
                    </h3>
                    <p className="text-sm text-gray-800">{event.type}</p>
                    <div className="flex items-center text-sm text-gray-800">
                          <Calendar className="w-3 h-3 mr-1" />
                      <span>{formatDate(event.startDateTime)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}