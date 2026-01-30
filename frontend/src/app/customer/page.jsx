"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Calendar, MapPin, Heart, ChevronRight, ChevronLeft, Ticket, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from "../components/Navbar";
import { formatLikes } from "../utils/formatLikes";

export default function CustomerHomePage({ user, logout }) {
  const router = useRouter();
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [likedEvents, setLikedEvents] = useState(new Set());
  const [likingInProgress, setLikingInProgress] = useState(new Set());
  const [customerId, setCustomerId] = useState(null);

  const categories = ['All', 'Music', 'Sports', 'Cinema', 'Comedy', 'Casino'];
  const autoRotateRef = useRef(null);

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  useEffect(() => {
    filterEvents();
  }, [activeCategory, searchQuery, allEvents]);

  // Auto-rotate carousel
  useEffect(() => {
    if (featuredEvents.length > 1 && !searchQuery) {
      autoRotateRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
      }, 5000); // Slower, more elegant rotation

      return () => {
        if (autoRotateRef.current) {
          clearInterval(autoRotateRef.current);
        }
      };
    }
  }, [featuredEvents.length, searchQuery]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/events`);

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      console.log('Fetched events:', data);

      setAllEvents(data || []);
      setFeaturedEvents((data || []).slice(0, 5));

    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerData = async () => {
    try {
      // Fetch customer data using user ID
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/user/${user._id}`);
      if (!response.ok) {
        console.error('Failed to fetch customer data');
        return;
      }

      const customerData = await response.json();

      // Store the customer ID
      setCustomerId(customerData._id);

      // Create a Set of liked event IDs for quick lookup
      const likedEventIds = new Set(customerData.likedEvents?.map(id => id.toString()) || []);
      setLikedEvents(likedEventIds);

    } catch (err) {
      console.error('Error fetching customer data:', err);
    }
  };

  const handleLikeToggle = async (eventId, e) => {
    e.stopPropagation(); // Prevent event card click

    if (!user) {
      alert('Please login to like events');
      return;
    }

    if (!customerId) {
      alert('Customer data not loaded. Please try again.');
      return;
    }

    // Prevent multiple simultaneous requests for the same event
    if (likingInProgress.has(eventId)) {
      return;
    }

    try {
      setLikingInProgress(prev => new Set([...prev, eventId]));

      const isLiked = likedEvents.has(eventId);
      const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/${customerId}/like-event`;
      const method = isLiked ? 'DELETE' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId: eventId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update like status');
      }

      // Update local state optimistically
      setLikedEvents(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(eventId);
        } else {
          newSet.add(eventId);
        }
        return newSet;
      });

      // Update the event's like count in the local state
      setAllEvents(prevEvents =>
        prevEvents.map(event =>
          event._id === eventId
            ? { ...event, likes: (event.likes || 0) + (isLiked ? -1 : 1) }
            : event
        )
      );

      setFeaturedEvents(prevEvents =>
        prevEvents.map(event =>
          event._id === eventId
            ? { ...event, likes: (event.likes || 0) + (isLiked ? -1 : 1) }
            : event
        )
      );

    } catch (err) {
      console.error('Error toggling like:', err);
      alert(err.message || 'Failed to update like status');
    } finally {
      setLikingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

  const filterEvents = () => {
    let filtered = [...allEvents];

    if (activeCategory !== 'All') {
      filtered = filtered.filter(event =>
        event.type?.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.name?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.venue?.name?.toLowerCase().includes(query)
      );
    }

    setFilteredEvents(filtered);
  };

  const handleSearch = () => {
    filterEvents();
  };

  const handleCategoryFilter = (category) => {
    setActiveCategory(category);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleEventClick = (eventId) => {
    router.push(`/events/${eventId}`);
  };

  const scrollToPrevious = () => {
    if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current);
    }
    setCurrentSlide((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length);
  };

  const scrollToNext = () => {
    if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current);
    }
    setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
  };

  const goToSlide = (index) => {
    if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current);
    }
    setCurrentSlide(index);
  };

  const getEventImage = (event) => {
    if (event.image) {
      return event.image;
    }
    const searchTerm = event.type || 'event';
    return `https://source.unsplash.com/800x450/?${encodeURIComponent(searchTerm)},concert,entertainment`;
  };

  const groupedEvents = categories.slice(1).reduce((acc, category) => {
    const categoryEvents = allEvents.filter(event =>
      event.type?.toLowerCase() === category.toLowerCase()
    );
    if (categoryEvents.length > 0) {
      acc[category] = categoryEvents;
    }
    return acc;
  }, {});

  const shouldShowCarousel = !searchQuery.trim() && activeCategory === 'All';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Curating events for you...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
            <p className="font-bold mb-1">Unable to Load Events</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchEvents}
            className="px-6 py-3 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-slate-700/20"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        showSearch={true}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
      />

      {/* Category Filter Sticky Section */}
      <div className="bg-white/80 backdrop-blur-md sticky top-20 z-40 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Categories */}
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryFilter(category)}
                className={`flex-none px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeCategory === category
                  ? 'bg-slate-700 text-white shadow-md shadow-slate-700/20'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-700'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>


      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-12 overflow-hidden">

        {/* Featured Stacked Carousel */}
        {shouldShowCarousel && featuredEvents.length > 0 && (
          <section className="relative w-full h-[550px] max-w-7xl mx-auto py-4">
            <div className="relative w-full h-full flex items-center justify-center perspective-1000">
              {featuredEvents.map((event, index) => {
                // Calculate position relative to currents slide
                const length = featuredEvents.length;
                let position = 'hidden'; // hidden, active, prev, next

                if (index === currentSlide) {
                  position = 'active';
                } else if (index === (currentSlide - 1 + length) % length) {
                  position = 'prev';
                } else if (index === (currentSlide + 1) % length) {
                  position = 'next';
                }

                // Styles based on position
                let cardStyle = "opacity-0 z-0 scale-75 pointer-events-none translate-x-0";

                if (position === 'active') {
                  cardStyle = "opacity-100 z-30 scale-100 translate-x-0 cursor-pointer shadow-2xl shadow-slate-900/20";
                } else if (position === 'prev') {
                  cardStyle = "opacity-40 z-20 scale-85 -translate-x-[60%] md:-translate-x-[70%] cursor-pointer hover:opacity-60";
                } else if (position === 'next') {
                  cardStyle = "opacity-40 z-20 scale-85 translate-x-[60%] md:translate-x-[70%] cursor-pointer hover:opacity-60";
                }

                return (
                  <div
                    key={event._id}
                    onClick={() => {
                      if (position === 'active') handleEventClick(event._id);
                      if (position === 'prev') scrollToPrevious();
                      if (position === 'next') scrollToNext();
                    }}
                    className={`absolute top-0 w-full md:w-[80%] lg:w-[70%] h-full transition-all duration-700 ease-in-out ${cardStyle}`}
                  >
                    <div className="relative w-full h-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-200/20">
                      <img
                        src={getEventImage(event)}
                        alt={event.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/1200x500/1e293b/FFFFFF?text=' + encodeURIComponent(event.name);
                        }}
                      />
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>

                      {/* Content - Only show for Active Slide */}
                      <div className={`absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white transition-opacity duration-500 ${position === 'active' ? 'opacity-100 delay-300' : 'opacity-0'}`}>
                        <div className="max-w-4xl">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider border border-white/10">
                              {event.type}
                            </span>
                            {event.status === 'ACTIVE' && (
                              <span className="flex items-center gap-1 text-green-400 text-xs font-bold px-2 py-0.5 bg-green-900/30 border border-green-500/30 rounded-full backdrop-blur-sm">
                                <Sparkles className="w-3 h-3" /> Featured
                              </span>
                            )}
                          </div>

                          <h3 className="text-2xl md:text-5xl font-black mb-4 leading-tight tracking-tight line-clamp-2">
                            {event.name}
                          </h3>

                          <div className="flex items-center gap-6 text-slate-200 font-medium hidden sm:flex">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-slate-400" />
                              <span>{formatDate(event.startDateTime)}</span>
                            </div>
                            {event.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-slate-400" />
                                <span>{event.venue.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                              <span>{formatLikes(event.likes || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Carousel Navigation */}
            {featuredEvents.length > 1 && (
              <>
                {/* Left Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); scrollToPrevious(); }}
                  className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white rounded-full p-4 z-40 transition-all transform hover:scale-110"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Right Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); scrollToNext(); }}
                  className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white rounded-full p-4 z-40 transition-all transform hover:scale-110"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Dot Indicators */}
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-40">
                  {featuredEvents.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => { e.stopPropagation(); goToSlide(index); }}
                      className={`transition-all duration-500 rounded-full ${currentSlide === index
                        ? 'w-8 h-2 bg-slate-800'
                        : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                        }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* Dynamic Content Sections */}
        {activeCategory !== 'All' || searchQuery ? (
          /* Filtered Results */
          <section>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                {searchQuery
                  ? `Results for "${searchQuery}"`
                  : `${activeCategory} Events`}
              </h2>
              <span className="text-sm font-medium text-slate-500">
                {filteredEvents.length} events found
              </span>
            </div>

            {filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event._id}
                    event={event}
                    onClick={() => handleEventClick(event._id)}
                    onLike={(e) => handleLikeToggle(event._id, e)}
                    isLiked={likedEvents.has(event._id)}
                    isLiking={likingInProgress.has(event._id)}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </section>
        ) : (
          /* Category Sections */
          <div className="max-w-7xl mx-auto space-y-16">
            {Object.entries(groupedEvents).map(([category, events]) => (
              <section key={category}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-1 h-6 bg-red-700 rounded-full"></span>
                    {category}
                  </h2>
                  <button
                    onClick={() => handleCategoryFilter(category)}
                    className="group flex items-center text-sm font-bold text-slate-700 hover:text-slate-700 transition"
                  >
                    View All
                    <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {events.slice(0, 4).map((event) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      onClick={() => handleEventClick(event._id)}
                      onLike={(e) => handleLikeToggle(event._id, e)}
                      isLiked={likedEvents.has(event._id)}
                      isLiking={likingInProgress.has(event._id)}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </section>
            ))}

            {Object.keys(groupedEvents).length === 0 && <EmptyState />}
          </div>
        )}
      </main>

      <div className="h-12"></div>
    </div>
  );
}

// Sub-components for cleaner code

function EventCard({ event, onClick, onLike, isLiked, isLiking, formatDate }) {
  return (
    <div
      onClick={onClick}
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
            onClick={onLike}
            disabled={isLiking}
            className={`p-2 rounded-full backdrop-blur-md transition-all shadow-sm ${isLiked
              ? 'bg-red-500 text-white'
              : 'bg-white/90 text-slate-400 hover:text-red-500'
              } ${isLiking ? 'opacity-70 cursor-wait' : 'hover:scale-110 active:scale-95'}`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
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
  );
}

function EmptyState() {
  return (
    <div className="w-full py-24 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Ticket className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">No Events Found</h3>
      <p className="text-slate-500 max-w-sm mx-auto">
        We couldn't find any events matching your criteria. Try adjusting your filters or search terms.
      </p>
    </div>
  );
}