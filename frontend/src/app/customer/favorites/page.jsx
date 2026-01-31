"use client";

import { useState, useEffect } from "react";
import { Heart, Calendar, MapPin, Ticket, HeartOff, ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
            <p className="font-bold mb-1">Error Loading Favorites</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["CUSTOMER"]}>
      <div className="min-h-screen bg-slate-50 pb-20">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.back()}
                className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center shadow-inner">
                <Heart className="w-7 h-7 text-red-600 fill-red-600" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Favorites</h1>
                <p className="text-slate-500 font-medium mt-1">
                  {likedEvents.length === 0
                    ? "You haven't liked any events yet"
                    : `You have saved ${likedEvents.length} event${likedEvents.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>
          </div>

          {likedEvents.length === 0 ? (
            /* Empty State */
            <div className="w-full py-4 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <HeartOff className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No Favorites Yet</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8">
                Start exploring events and tap the heart icon to save your favorites here.
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 font-bold"
              >
                Discover Events
              </button>
            </div>
          ) : (
            /* Events Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {likedEvents.map((event) => (
                <div
                  key={event._id}
                  onClick={() => handleEventClick(event._id)}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[3/2] overflow-hidden bg-slate-200">
                    <img
                      src={event.image || `https://source.unsplash.com/800x600/?${encodeURIComponent(event.type)},event`}
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x300/e2e8f0/94a3b8?text=' + encodeURIComponent(event.name);
                      }}
                    />

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                      <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-lg text-xs font-bold text-slate-800 shadow-sm">
                        {event.type}
                      </span>

                      <button
                        onClick={(e) => handleUnlike(event._id, e)}
                        disabled={unlikingInProgress.has(event._id)}
                        className={`p-2 rounded-full backdrop-blur-md transition-all shadow-sm bg-red-500 text-white hover:bg-red-600 ${unlikingInProgress.has(event._id) ? 'opacity-70 cursor-wait' : 'hover:scale-110 active:scale-95'
                          }`}
                        title="Remove from favorites"
                      >
                        <Heart className={`w-4 h-4 fill-current`} />
                      </button>
                    </div>

                    {/* Status Badge */}
                    {event.status === 'ACTIVE' && (
                      <div className="absolute bottom-3 left-3 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                        Available
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-1 group-hover:text-slate-700 transition-colors">
                      {event.name}
                    </h3>

                    <div className="space-y-2 mb-4 flex-grow">
                      <div className="flex items-center text-sm text-slate-500 font-medium">
                        <Calendar className="w-4 h-4 mr-2 text-slate-500" />
                        <span>{formatDate(event.startDateTime)}</span>
                      </div>
                      {event.venue && (
                        <div className="flex items-center text-sm text-slate-500">
                          <MapPin className="w-4 h-4 mr-2 text-slate-500" />
                          <span className="line-clamp-1">{event.venue.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                        <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                        <span>{formatLikes(event.likes || 0)}</span>
                      </div>
                      <span className="text-red-700 text-sm font-bold flex items-center group-hover:translate-x-1 transition-transform">
                        Details <ChevronRight className="w-4 h-4 ml-0.5" />
                      </span>
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