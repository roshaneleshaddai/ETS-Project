"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
    Ticket as TicketIcon,
    Calendar,
    MapPin,
    Download,
    QrCode,
    ChevronRight,
    Trophy,
    Loader2,
    AlertCircle,
    ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export default function MyTicketsPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [customerId, setCustomerId] = useState(null);
    const [downloading, setDownloading] = useState({});

    useEffect(() => {
        if (user?.email) {
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/email/${user.email}`)
                .then(res => {
                    if (!res.ok) throw new Error('Customer not found');
                    return res.json();
                })
                .then(data => setCustomerId(data._id))
                .catch(err => {
                    console.error("Error fetching customer:", err);
                    setLoading(false); // Stop loading if customer fetch fails
                });
        } else {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!customerId) return;

        const fetchTickets = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/tickets/customer/${customerId}`);
                if (!response.ok) throw new Error("Failed to fetch tickets");
                const ticketData = await response.json();

                // 1. Collect all unique event IDs from tickets
                const eventIds = [...new Set(ticketData.map(t => {
                    const id = t.eventId?._id || t.eventId;
                    return id;
                }).filter(Boolean))];

                // 2. Fetch fresh event details via batch API
                let eventDetailsMap = new Map();
                if (eventIds.length > 0) {
                    try {
                        const batchResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/events/batch`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids: eventIds })
                        });
                        if (batchResponse.ok) {
                            const eventsData = await batchResponse.json();
                            eventsData.forEach(event => eventDetailsMap.set(event._id, event));
                        }
                    } catch (batchErr) {
                        console.error("Failed to fetch batch events:", batchErr);
                    }
                }

                // 3. Merge event details back into tickets
                const data = ticketData.map(ticket => ({
                    ...ticket,
                    eventId: eventDetailsMap.get(ticket.eventId?._id || ticket.eventId) || ticket.eventId
                }));

                // Sorting logic
                const now = new Date();

                const upcomingTickets = data.filter(t => {
                    const event = t.eventId;
                    const eventDate = event?.endDateTime ? new Date(event.endDateTime) :
                        event?.startDateTime ? new Date(event.startDateTime) : null;
                    return eventDate && eventDate > now;
                }).sort((a, b) => {
                    const dateA = new Date(a.eventId?.startDateTime || 0);
                    const dateB = new Date(b.eventId?.startDateTime || 0);
                    return dateA - dateB;
                });

                const completedTickets = data.filter(t => {
                    const event = t.eventId;
                    const eventDate = event?.endDateTime ? new Date(event.endDateTime) :
                        event?.startDateTime ? new Date(event.startDateTime) : null;
                    return eventDate && eventDate <= now;
                }).sort((a, b) => {
                    const dateA = new Date(a.eventId?.startDateTime || 0);
                    const dateB = new Date(b.eventId?.startDateTime || 0);
                    return dateB - dateA; // Show most recent completed first
                });

                setTickets([...upcomingTickets, ...completedTickets]);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [customerId]);

    const handleDownloadPDF = async (ticket) => {
        setDownloading(prev => ({ ...prev, [ticket._id]: true }));

        try {
            const doc = new jsPDF();

            // Generate QR Code
            const qrCodeDataUrl = await QRCode.toDataURL(ticket.ticketCode, { width: 120 });

            // Header - Event Name
            doc.setFillColor(30, 41, 59); // slate-800
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont(undefined, 'bold');
            doc.text(ticket.eventId?.name || "Event Ticket", 105, 25, { align: 'center' });

            // Ticket Status Badge
            doc.setFillColor(16, 185, 129); // green
            doc.roundedRect(150, 10, 45, 8, 2, 2, 'F');
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(ticket.status, 172.5, 15, { align: 'center' });

            // Reset text color
            doc.setTextColor(30, 41, 59);

            // QR Code
            doc.addImage(qrCodeDataUrl, 'PNG', 15, 50, 40, 40);

            // Event Details
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Event Details', 65, 55);

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);

            const eventDate = (ticket.eventId?.startDateTime || ticket.eventId?.startDate)
                ? new Date(ticket.eventId.startDateTime || ticket.eventId.startDate).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : "Date TBA";

            doc.text(`📅 ${eventDate}`, 65, 65);
            doc.text(`📍 ${ticket.eventId?.location || "Venue TBA"}`, 65, 72);
            doc.text(`🎫 ${ticket.zoneId?.name || "General Admission"}`, 65, 79);

            // Seat Information
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Seat Information', 15, 105);

            doc.setFillColor(241, 245, 249); // slate-100
            doc.roundedRect(15, 110, 180, 30, 3, 3, 'F');

            doc.setFontSize(20);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text(`Row ${ticket.seatId?.row || 'N/A'}`, 25, 125);
            doc.text(`Seat ${ticket.seatId?.seatNumber || 'N/A'}`, 105, 125);

            // Access Code
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Access Code', 15, 155);

            doc.setFillColor(254, 243, 199); // amber-100
            doc.roundedRect(15, 160, 180, 15, 3, 3, 'F');

            doc.setFontSize(14);
            doc.setFont('courier', 'bold');
            doc.setTextColor(180, 83, 9); // amber-700
            doc.text(ticket.ticketCode, 105, 170, { align: 'center' });

            // Important Information
            doc.setTextColor(71, 85, 105);
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.text('📌 Important Information:', 15, 190);
            doc.text('• Please arrive at least 30 minutes before the event starts', 20, 197);
            doc.text('• This ticket is valid for one person only', 20, 203);
            doc.text('• Present the QR code or access code at the entrance', 20, 209);
            doc.text('• Keep this ticket safe and do not share the access code', 20, 215);

            // Footer
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.line(15, 230, 195, 230);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text('Ticket issued by ETS - Event Ticketing System', 105, 238, { align: 'center' });
            doc.text(`Ticket ID: ${ticket._id}`, 105, 244, { align: 'center' });
            doc.text(`Downloaded: ${new Date().toLocaleString()}`, 105, 250, { align: 'center' });

            // Save PDF
            const fileName = `Ticket_${ticket.eventId?.name?.replace(/[^a-zA-Z0-9]/g, '_')}_${ticket.ticketCode}.pdf`;
            doc.save(fileName);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setDownloading(prev => ({ ...prev, [ticket._id]: false }));
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Fetching your tickets...</p>
            </div>
        </div>
    );

    return (
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

                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-inner">
                                <TicketIcon className="w-7 h-7 text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Tickets</h1>
                                <p className="text-slate-500 font-medium mt-1">
                                    You have {tickets.length} total tickets across {new Set(tickets.map(t => t.eventId?._id)).size} events
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center justify-center px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-slate-900/20"
                        >
                            Browse More Events
                            <ChevronRight className="w-5 h-5 ml-1" />
                        </button>
                    </div>
                </div>

                <div className="w-full">
                    {tickets.length === 0 ? (
                        <div className="w-full py-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <TicketIcon className="w-12 h-12 text-slate-300" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">No tickets found</h2>
                            <p className="text-slate-500 max-w-sm mx-auto mb-8">
                                It looks like you haven't booked any events yet. Once you do, your tickets will appear right here!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {tickets.map((ticket) => {
                                const isCompleted = new Date(ticket.eventId?.endDateTime || ticket.eventId?.startDateTime || ticket.eventId?.startDate) < new Date();

                                return (
                                    <div
                                        key={ticket._id}
                                        className={`h-[300px] rounded-[2.5rem] overflow-hidden flex flex-col sm:flex-row shadow-lg shadow-slate-200/50 border transition-all duration-500 relative group
                                            ${isCompleted
                                                ? 'bg-slate-50 border-slate-200 opacity-80 grayscale-[0.5]'
                                                : 'bg-white border-slate-100 hover:shadow-2xl hover:border-slate-200'}`}
                                    >
                                        {/* Visual "Stub" Area */}
                                        <div className="w-full sm:w-56 h-48 sm:h-auto relative overflow-hidden bg-slate-900">
                                            {ticket.eventId?.image ? (
                                                <img
                                                    src={ticket.eventId.image}
                                                    alt={ticket.eventId.name}
                                                    className={`w-full h-full object-cover transition-all duration-700
                                                        ${isCompleted ? 'opacity-40' : 'opacity-80 group-hover:scale-110 group-hover:opacity-60'}`}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center">
                                                    <Trophy className="w-12 h-12 text-white/20" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>

                                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${ticket.status === 'VALID' ? 'bg-green-500/20 border-green-400/30 text-green-300' : 'bg-white/10 text-slate-300 border-white/10'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                                {isCompleted && (
                                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-500/40 border border-slate-400/30 text-white backdrop-blur-md">
                                                        Completed
                                                    </span>
                                                )}
                                            </div>

                                            <div className="absolute bottom-4 left-4 right-4 text-white">
                                                <p className="text-xs font-medium opacity-70 uppercase tracking-wider mb-1">Event Type</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-slate-400' : 'bg-indigo-500'}`}></span>
                                                    <span className="font-bold">{ticket.eventId?.type || ticket.eventId?.category || "Event"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Ticket Area */}
                                        <div className={`flex-grow p-4 flex flex-col justify-between relative ${isCompleted ? 'bg-slate-50/50' : 'bg-white'}`}>
                                            {/* Decorative Ticket Separation */}
                                            <div className="hidden sm:block absolute top-[15%] bottom-[15%] -left-[1px] w-[2px] border-l-2 border-dashed border-slate-200"></div>
                                            <div className="hidden sm:block absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner"></div>

                                            <div className="flex flex-col justify-center h-full">
                                                <h3 className={`text-2xl font-black leading-tight mb-2 line-clamp-2 ${isCompleted ? 'text-slate-500' : 'text-slate-900'}`}>
                                                    {ticket.eventId?.name || "Event Name Unavailable"}
                                                </h3>

                                                <div className="space-y-2 mb-8">
                                                    <div className="flex items-center gap-4 group/item">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isCompleted ? 'bg-slate-200' : 'bg-slate-50 group-hover/item:bg-indigo-50'}`}>
                                                            <Calendar className={`w-5 h-5 transition-colors ${isCompleted ? 'text-slate-400' : 'text-slate-400 group-hover/item:text-indigo-600'}`} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Time</p>
                                                            <p className={`font-bold ${isCompleted ? 'text-slate-500' : 'text-slate-900'}`}>
                                                                {(ticket.eventId?.startDateTime || ticket.eventId?.startDate) ? new Date(ticket.eventId.startDateTime || ticket.eventId.startDate).toLocaleDateString(undefined, {
                                                                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                                }) : "Date TBA"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 group/item">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isCompleted ? 'bg-slate-200' : 'bg-slate-50 group-hover/item:bg-indigo-50'}`}>
                                                            <MapPin className={`w-5 h-5 transition-colors ${isCompleted ? 'text-slate-400' : 'text-slate-400 group-hover/item:text-indigo-600'}`} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Venue</p>
                                                            <p className={`font-bold ${isCompleted ? 'text-slate-500' : 'text-slate-900'}`}>{ticket.eventId?.location || "Venue TBA"}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 group/item">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isCompleted ? 'bg-slate-200' : 'bg-slate-50 group-hover/item:bg-indigo-50'}`}>
                                                            <TicketIcon className={`w-5 h-5 transition-colors ${isCompleted ? 'text-slate-400' : 'text-slate-400 group-hover/item:text-indigo-600'}`} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seat Details</p>
                                                            <p className={`font-bold ${isCompleted ? 'text-slate-500' : 'text-slate-900'}`}>
                                                                {ticket.zoneName || "General"} • Row {ticket.seatId?.row || 'N/A'} • Seat {ticket.seatId?.seatNumber || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleDownloadPDF(ticket)}
                                                    disabled={downloading[ticket._id] || isCompleted}
                                                    className={`flex-grow flex items-center justify-center px-6 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group/btn
                                                        ${isCompleted
                                                            ? 'bg-slate-200 text-slate-400 shadow-none'
                                                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'}`}
                                                >
                                                    {downloading[ticket._id] ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                            <span>Processing...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="w-5 h-5 mr-2 group-hover/btn:-translate-y-0.5 transition-transform" />
                                                            <span>{isCompleted ? 'Event Completed' : 'Download Ticket'}</span>
                                                        </>
                                                    )}
                                                </button>

                                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border transition-colors ${isCompleted ? 'bg-slate-200 border-slate-300' : 'bg-slate-50 border-slate-100'}`}>
                                                    <QrCode className={`w-6 h-6 ${isCompleted ? 'text-slate-400' : 'text-slate-900'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
