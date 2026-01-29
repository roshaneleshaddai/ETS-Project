"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import VenueMap from "@/app/components/VenueMap";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";
import { io } from "socket.io-client";

export default function EventSeatingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [venue, setVenue] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState(new Set());
  const [customerId, setCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocking, setIsLocking] = useState(false);
  const [socket, setSocket] = useState(null);

  const eventId = params?.id;

  useEffect(() => {
    if (!eventId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Event
        const eventRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URI}/events/${eventId}`
        );
        if (!eventRes.ok) throw new Error("Failed to fetch event details");
        const eventData = await eventRes.json();
        setEvent(eventData);

        // Venue
        if (eventData.venue?._id || eventData.venueId) {
          const venueId = eventData.venue?._id || eventData.venueId;
          const venueRes = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URI}/venue/${venueId}`
          );
          if (venueRes.ok) {
            const venueData = await venueRes.json();
            setVenue(venueData);
          }
        }

        // All seats for event
        const seatsRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URI}/seats/event/${eventId}`
        );
        if (!seatsRes.ok) throw new Error("Failed to fetch seats");
        const seatsData = await seatsRes.json();
        setSeats(seatsData.seats || []);

        // Customer
        if (user) {
          const customerRes = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/user/${user._id}`
          );
          if (customerRes.ok) {
            const customerData = await customerRes.json();
            setCustomerId(customerData._id);
          }
        }
      } catch (err) {
        console.error("Error loading seating data:", err);
        setError(err.message || "Failed to load seating map");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId, user]);

  // WebSocket Connection
  useEffect(() => {
    if (!eventId) return;

    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URI || "http://localhost:3001", {
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket");
      newSocket.emit("join-event", eventId);
    });

    newSocket.on("seatStatusChanged", ({ seatId, status }) => {
      console.log(`Seat ${seatId} changed to ${status}`);
      setSeats((currentSeats) =>
        currentSeats.map((s) => (s._id === seatId ? { ...s, status } : s))
      );

      // If a seat we had selected was locked by someone else or sold, remove it
      if (status !== "AVAILABLE" && status !== "LOCKED") {
        setSelectedSeats(prev => {
          if (prev.has(seatId)) {
            const next = new Set(prev);
            next.delete(seatId);
            return next;
          }
          return prev;
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave-event", eventId);
      newSocket.disconnect();
    };
  }, [eventId]);

  const handleSeatClick = async (seat) => {
    // If already selected, we just toggle it locally for now (unlocking is complex)
    // In a production app, we'd have a DELETE /lock-seat too.
    if (selectedSeats.has(seat._id)) {
      setSelectedSeats((prev) => {
        const next = new Set(prev);
        next.delete(seat._id);
        return next;
      });
      return;
    }

    if (seat.status !== "AVAILABLE") return;

    if (!user || !customerId) {
      alert("Please login to select seats");
      router.push("/auth/login");
      return;
    }

    try {
      setIsLocking(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URI}/seats/lock-seat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventSeatId: seat._id,
            userId: customerId,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to lock seat");
      }

      setSelectedSeats((prev) => {
        const next = new Set(prev);
        next.add(seat._id);
        return next;
      });
    } catch (err) {
      console.error("Lock error:", err);
      alert(err.message);
    } finally {
      setIsLocking(false);
    }
  };

  const calculateTotal = () => {
    if (!event || !event.zones) return 0;
    let total = 0;
    selectedSeats.forEach((seatId) => {
      const seat = seats.find((s) => s._id === seatId);
      if (!seat) return;
      const zone = event.zones.find((z) => z._id === seat.zoneId);
      if (zone) total += zone.price;
    });
    return total;
  };

  const handleCheckout = async () => {
    if (selectedSeats.size === 0) {
      alert("Please select at least one seat");
      return;
    }

    if (!user || !customerId) {
      alert("Please login to book tickets");
      router.push("/auth/login");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URI}/seats/hold`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event._id,
            seatIds: Array.from(selectedSeats),
            customerId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Some seats are no longer available"
        );
      }

      const { holdToken, expiresAt } = await response.json();

      sessionStorage.setItem("holdToken", holdToken);
      sessionStorage.setItem("holdExpiry", expiresAt);
      sessionStorage.setItem(
        "selectedSeats",
        JSON.stringify(Array.from(selectedSeats))
      );

      router.push(`/checkout?eventId=${event._id}&holdToken=${holdToken}`);
    } catch (err) {
      console.error("Error holding seats:", err);
      alert(err.message || "Failed to reserve seats. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading seating map...</p>
        </div>
      </div>
    );
  }

  if (error || !event || !venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-4">
            <p className="font-semibold">Error Loading Seating</p>
            <p className="text-sm mt-1">
              {error || "Event or venue not found"}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const zonePricing = new Map();
  if (event.zones) {
    event.zones.forEach((zone) => {
      zonePricing.set(zone._id, zone.price);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <header className="bg-white top-0 z-40 border-b border-gray-200">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to event</span>
          </button>
          <div className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">{event.name}</span>
          </div>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        {isLocking && (
          <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-bold text-lg">Reserving seat...</span>
            </div>
          </div>
        )}
        <VenueMap
          venue={venue}
          eventId={event._id}
          seats={seats}
          onSeatClick={handleSeatClick}
          selectedSeatIds={selectedSeats}
          zonePricing={zonePricing}
          currency={event.currency || "ZAR"}
        />
      </main>

      {selectedSeats.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white shadow-2xl z-50">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">
                  {selectedSeats.size} seat
                  {selectedSeats.size !== 1 ? "s" : ""} selected
                </p>
                <p className="text-2xl font-bold">
                  {event.currency || "ZAR"} {calculateTotal().toFixed(2)}
                </p>
              </div>
              <button
                onClick={handleCheckout}
                disabled={isLocking}
                className="flex items-center space-x-2 px-8 py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLocking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShoppingCart className="w-5 h-5" />
                )}
                <span>Continue to Checkout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

