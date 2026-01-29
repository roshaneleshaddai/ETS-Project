"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Calendar, MapPin, Heart, ChevronRight, ChevronLeft, Ticket, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from "../components/Navbar";
import {formatLikes} from "../utils/formatLikes";

export default function CustomerHomePage({ user, logout }) {
  const router = useRouter();
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
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
      }, 4000);

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
      // console.log('Fetched customer data:', customerData);
      
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
      // if (typeof event.image === 'string') {
      //   if (event.image.startsWith('data:')) {
      //     return event.image;
      //   } else if (event.image.startsWith('http')) {
      //     return event.image;
      //   } else {
      //     return `data:image/jpeg;base64,${event.image}`;
      //   }
      // }
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-2 rounded-lg mb-4">
            <p className="font-semibold">Error Loading Events</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={fetchEvents}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="relative w-full w-full mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-12 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"
            />
          </div>
        </div>
      </div>


      {/* Featured Carousel with Dots - Hidden when searching */}
      {shouldShowCarousel && featuredEvents.length > 0 && (
        <section className="bg-white">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="relative group">
              <div className="overflow-hidden rounded-xl">
                <div 
                  className="flex transition-transform duration-700 ease-in-out" 
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {featuredEvents.map((event, index) => (
                    <div
                      key={event._id}
                      onClick={() => handleEventClick(event._id)}
                      className="w-full flex-shrink-0 cursor-pointer"
                    >
                      <div className="relative rounded-xl overflow-hidden aspect-[24/9] bg-gray-900">
                        <img 
                          src={getEventImage(event)}
                          alt={event.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/1200x500/8B5CF6/FFFFFF?text=' + encodeURIComponent(event.name);
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-3">
                            {event.type}
                          </span>
                          <h3 className="text-3xl font-bold mb-2">{event.name}</h3>
                          <p className="text-sm opacity-90 max-w-2xl">{event.description || 'Experience the best entertainment'} - {formatLikes(event.likes || 0)}❤️</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Carousel Navigation Buttons */}
              {featuredEvents.length > 1 && (
                <>
                  <button
                    onClick={scrollToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-800" />
                  </button>
                  <button
                    onClick={scrollToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-800" />
                  </button>
                </>
              )}

              {/* Dot Indicators */}
              {featuredEvents.length > 1 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
                  {featuredEvents.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`transition-all duration-300 rounded-full ${
                        currentSlide === index
                          ? 'w-8 h-2 bg-white'
                          : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Category Filters */}
      <section className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 py-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryFilter(category)}
                className={`flex-none px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === category
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content - Show filtered results or category sections */}
      {activeCategory !== 'All' || searchQuery ? (
        /* Filtered Results */
        <section className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {searchQuery 
                ? `Search Results for "${searchQuery}"` 
                : `${activeCategory} Events`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{filteredEvents.length} events found</p>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {filteredEvents.map((event) => (
                <div
                  key={event._id}
                  onClick={() => handleEventClick(event._id)}
                  className="group cursor-pointer"
                >
                  <div className="relative rounded-lg overflow-hidden aspect-[2/3] mb-3 bg-gray-200">
                    <img 
                      src={event.image} 
                    // src="https://img.freepik.com/free-vector/flat-design-movie-theater-background_23-2150998489.jpg?semt=ais_hybrid&w=740&q=80"
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x600/8B5CF6/FFFFFF?text=' + encodeURIComponent(event.name);
                      }}
                    />
                    
                    {/* Likes Count Badge */}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                        <span className="text-white text-xs font-semibold">
                          {formatLikes(event.likes || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Heart Button */}
                    <div className="absolute top-2 right-2">
                      <button 
                        onClick={(e) => handleLikeToggle(event._id, e)}
                        disabled={likingInProgress.has(event._id)}
                        className={`bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all z-10 ${
                          likingInProgress.has(event._id) ? 'opacity-50 cursor-wait' : ''
                        }`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                      >
                        <Heart className={`w-4 h-4 ${
                            likedEvents.has(event._id) ? 'fill-red-500 text-red-500' : 'text-gray-700'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Status Badge */}
                    {event.status === 'ACTIVE' && (
                      <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                        Available
                      </div>
                    )}
                  </div>
                  
                  {/* Simple Event Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
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
          ) : (
            <div className="text-center py-16">
              <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          )}
        </section>
      ) : (
        /* Category Sections */
        <div className="pb-16">
          {Object.entries(groupedEvents).map(([category, events]) => (
            <section key={category} className="bg-white border-b border-gray-200">
              <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      The Best of {category}
                    </h2>
                    <p className="text-sm text-gray-600">{events.length}+ Events</p>
                  </div>
                  <button 
                    onClick={() => handleCategoryFilter(category)}
                    className="text-red-600 hover:text-red-700 flex items-center text-sm font-medium"
                  >
                    See All <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                  {events.slice(0, 5).map((event) => (
                    <div
                      key={event._id}
                      onClick={() => handleEventClick(event._id)}
                      className="group cursor-pointer"
                    >
                      <div className="relative rounded-lg overflow-hidden aspect-[2/3] mb-3 bg-gray-200">
                        <img 
                          src={getEventImage(event)}
                          alt={event.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x600/8B5CF6/FFFFFF?text=' + encodeURIComponent(event.name);
                          }}
                        />

                        {/* Likes Count Badge */}
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                            <span className="text-white text-xs font-semibold">
                              {formatLikes(event.likes || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="absolute top-2 right-2">
                          <button 
                            onClick={(e) => handleLikeToggle(event._id, e)}
                            disabled={likingInProgress.has(event._id)}
                            className={`bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all ${
                              likingInProgress.has(event._id) ? 'opacity-50 cursor-wait' : ''
                            }`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                          >
                            <Heart className={`w-4 h-4 ${
                                likedEvents.has(event._id) ? 'fill-red-500 text-red-500' : 'text-gray-700'
                              }`}
                            />
                          </button>
                        </div>
                        {event.status === 'ACTIVE' && (
                          <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                            Available
                          </div>
                        )}
                      </div>
                      
                      {/* Simple Event Info */}
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
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
              </div>
            </section>
          ))}

          {Object.keys(groupedEvents).length === 0 && (
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
              <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Available</h3>
              <p className="text-gray-600">Check back soon for upcoming events!</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden"></div>
    </div>
  );
}