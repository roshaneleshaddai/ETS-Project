"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
    CreditCard,
    Ticket,
    Clock,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    ShieldCheck,
    Calendar,
    MapPin,
    Loader2
} from "lucide-react";

export default function CheckoutPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();

    const eventId = searchParams.get("eventId");
    const holdToken = searchParams.get("holdToken");

    const [event, setEvent] = useState(null);
    const [heldSeats, setHeldSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [timeLeft, setLeft] = useState("");
    const [customerId, setCustomerId] = useState(null);

    useEffect(() => {
        if (user?.email) {
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/email/${user.email}`)
                .then(res => res.json())
                .then(data => setCustomerId(data._id))
                .catch(err => console.error("Error fetching customer:", err));
        }
    }, [user]);

    useEffect(() => {
        if (!eventId || !holdToken) {
            setError("Invalid checkout session. Please return to the seating selection.");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch Event Details
                const eventRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/events/${eventId}`);
                if (!eventRes.ok) throw new Error("Event not found");
                const eventData = await eventRes.json();
                setEvent(eventData);

                // Decode Token for Seat IDs (or fetch from backend if we had an endpoint)
                // Since holdToken is base64(JSON({seatIds,...})), we can decode it:
                try {
                    const decoded = JSON.parse(atob(holdToken));
                    const seatDetailsRes = await Promise.all(
                        decoded.seatIds.map(id =>
                            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/seats/${id}`).then(r => r.json())
                        )
                    );
                    setHeldSeats(seatDetailsRes);
                } catch (e) {
                    console.error("Token decode error:", e);
                    throw new Error("Invalid hold token");
                }

                setLoading(false);
            } catch (err) {
                console.error("Checkout fetch error:", err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchData();
    }, [eventId, holdToken]);

    // Countdown timer
    useEffect(() => {
        const expiry = sessionStorage.getItem("holdExpiry");
        if (!expiry) return;

        const timer = setInterval(() => {
            const now = new Date();
            const exp = new Date(expiry);
            const diff = exp - now;

            if (diff <= 0) {
                setLeft("EXPIRED");
                clearInterval(timer);
                alert("Your seat hold has expired. Please select seats again.");
                router.push(`/events/${eventId}/seating`);
            } else {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setLeft(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [eventId, router]);

    const calculateSubtotal = () => {
        if (!event || !event.zones || !heldSeats.length) return 0;
        return heldSeats.reduce((acc, seat) => {
            const zone = event.zones.find(z => z._id === seat.zoneId);
            return acc + (zone ? zone.price : 0);
        }, 0);
    };

    const calculateTax = (subtotal) => subtotal * 0.15; // 15% VAT example

    const handleConfirmPurchase = async () => {
        if (!customerId) return;
        setProcessing(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/seats/confirm-purchase`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId,
                    seatIds: heldSeats.map(s => s._id),
                    customerId,
                    holdToken
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to confirm purchase");
            }

            setSuccess(true);
            sessionStorage.removeItem("holdToken");
            sessionStorage.removeItem("holdExpiry");
            sessionStorage.removeItem("selectedSeats");
        } catch (err) {
            alert(err.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Preparing your checkout...</p>
            </div>
        </div>
    );

    if (error || !event) return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="max-w-xl mx-auto px-4 py-20 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-slate-900 mb-4 font-display">Something went wrong</h1>
                <p className="text-slate-600 mb-8">{error}</p>
                <button
                    onClick={() => router.push(`/`)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    Return Home
                </button>
            </div>
        </div>
    );

    if (success) {
        return (
            <div className="min-h-screen bg-white">
                <Navbar />
                <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-4 font-display">Booking Confirmed!</h1>
                    <p className="text-lg text-slate-600 mb-12">
                        Your tickets for <span className="font-bold text-slate-900">{event.name}</span> have been sent to your email.
                    </p>

                    <div className="bg-slate-50 rounded-2xl p-8 mb-12 border border-slate-100 text-left">
                        <h3 className="font-bold text-slate-900 mb-6 flex items-center">
                            <Ticket className="w-5 h-5 mr-3 text-slate-400" />
                            Reservation Summary
                        </h3>
                        <div className="space-y-4">
                            {heldSeats.map(seat => (
                                <div key={seat._id} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <div>
                                        <p className="font-bold text-slate-900">Row {seat.row}, Seat {seat.seatNumber}</p>
                                        <p className="text-sm text-slate-500">{event.zones.find(z => z._id === seat.zoneId)?.name}</p>
                                    </div>
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-8 border-t border-slate-200 flex justify-between items-center text-xl">
                            <span className="font-bold text-slate-900">Total Paid</span>
                            <span className="font-black text-slate-900">{event.currency || "ZAR"} {(calculateSubtotal() + calculateTax(calculateSubtotal())).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => router.push('/customer')}
                            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            My Bookings
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="px-8 py-3 bg-white text-slate-900 border-2 border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const total = subtotal + tax;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Left Column: Summary & Payment */}
                    <div className="flex-grow space-y-8">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 font-display">Secure Checkout</h2>
                                <div className="flex items-center bg-amber-50 text-amber-700 px-4 py-2 rounded-full border border-amber-100">
                                    <Clock className="w-4 h-4 mr-2" />
                                    <span className="font-mono font-bold">{timeLeft}</span>
                                </div>
                            </div>

                            {/* Event Mini Card */}
                            <div className="flex gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
                                {event.image && (
                                    <img src={event.image} alt={event.name} className="w-24 h-32 object-cover rounded-xl shadow-md" />
                                )}
                                <div className="flex flex-col justify-center">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{event.name}</h3>
                                    <div className="space-y-1 text-slate-500 text-sm">
                                        <div className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-2" />
                                            {new Date(event.startDate).toLocaleDateString(undefined, {
                                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                        <div className="flex items-center text-indigo-600 font-medium">
                                            <MapPin className="w-4 h-4 mr-2" />
                                            {event.location || "Venue Information"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Seats Selection */}
                            <div className="mb-8">
                                <h3 className="font-bold text-slate-900 mb-4">Your Selection</h3>
                                <div className="space-y-3">
                                    {heldSeats.map(seat => (
                                        <div key={seat._id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-4">
                                                    <Ticket className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">Row {seat.row}, Seat {seat.seatNumber}</p>
                                                    <p className="text-xs text-slate-500 uppercase tracking-wider">{event.zones.find(z => z._id === seat.zoneId)?.name}</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-slate-900">
                                                {event.currency || "ZAR"} {event.zones.find(z => z._id === seat.zoneId)?.price.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Method Interface */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 mb-2">Payment Method</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/50 flex flex-col justify-between h-32 relative overflow-hidden group">
                                        <div className="flex justify-between items-start">
                                            <CreditCard className="w-8 h-8 text-indigo-600" />
                                            <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <p className="font-bold text-slate-900">Card Payment</p>
                                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-600/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                                    </div>
                                    <div className="p-4 rounded-2xl border-2 border-slate-200 bg-white flex flex-col justify-between h-32 hover:border-slate-300 transition-colors grayscale opacity-60">
                                        <div className="flex justify-between items-start">
                                            <div className="text-2xl font-black text-slate-300 italic">PayFast</div>
                                        </div>
                                        <p className="font-bold text-slate-400">Electronic Funds</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center text-slate-400 text-sm gap-4">
                            <div className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1" /> Secure Encryption</div>
                            <div className="flex items-center"><AlertCircle className="w-4 h-4 mr-1" /> No Hidden Fees</div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary Card */}
                    <div className="lg:w-96">
                        <div className="bg-slate-900 text-white rounded-3xl p-8 sticky top-10 shadow-xl overflow-hidden">
                            {/* Grain Effect Background */}
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                            <h3 className="text-xl font-bold mb-8 relative">Order Summary</h3>

                            <div className="space-y-4 mb-8 relative">
                                <div className="flex justify-between text-slate-400">
                                    <span>Subtotal ({heldSeats.length} seats)</span>
                                    <span>{event.currency || "ZAR"} {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>Booking Fee (15%)</span>
                                    <span>{event.currency || "ZAR"} {tax.toFixed(2)}</span>
                                </div>
                                <div className="h-px bg-white/10 my-6"></div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-slate-400 text-sm">Total Amount</p>
                                        <p className="text-3xl font-black">{event.currency || "ZAR"} {total.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 relative">
                                <button
                                    onClick={handleConfirmPurchase}
                                    disabled={processing || timeLeft === "EXPIRED"}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2 active:scale-[0.98]"
                                >
                                    {processing ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Complete Purchase</span>
                                            <ChevronRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-xs text-slate-500 px-4">
                                    By clicking complete purchase, you agree to our Terms of Service.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
