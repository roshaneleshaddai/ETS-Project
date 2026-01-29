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
    AlertCircle
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
                .then(res => res.json())
                .then(data => setCustomerId(data._id))
                .catch(err => console.error("Error fetching customer:", err));
        }
    }, [user]);

    useEffect(() => {
        if (!customerId) return;

        const fetchTickets = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/tickets/customer/${customerId}`);
                if (!response.ok) throw new Error("Failed to fetch tickets");
                const data = await response.json();
                setTickets(data);
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
            doc.setFillColor(15, 23, 42); // slate-900
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
            doc.setTextColor(15, 23, 42); // slate-900

            // QR Code
            doc.addImage(qrCodeDataUrl, 'PNG', 15, 50, 40, 40);

            // Event Details
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Event Details', 65, 55);

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105); // slate-600

            const eventDate = ticket.eventId?.startDate
                ? new Date(ticket.eventId.startDate).toLocaleDateString(undefined, {
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
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Seat Information', 15, 105);

            doc.setFillColor(241, 245, 249); // slate-100
            doc.roundedRect(15, 110, 180, 30, 3, 3, 'F');

            doc.setFontSize(20);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(79, 70, 229); // indigo-600
            doc.text(`Row ${ticket.seatId?.row || 'N/A'}`, 25, 125);
            doc.text(`Seat ${ticket.seatId?.seatNumber || 'N/A'}`, 105, 125);

            // Access Code
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Access Code', 15, 155);

            doc.setFillColor(254, 243, 199); // amber-100
            doc.roundedRect(15, 160, 180, 15, 3, 3, 'F');

            doc.setFontSize(14);
            doc.setFont('courier', 'bold');
            doc.setTextColor(146, 64, 14); // amber-900
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
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
                <p className="text-slate-600 font-medium font-display">Fetching your tickets...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar />

            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 font-display mb-2">My Tickets</h1>
                            <p className="text-slate-500">You have {tickets.length} active tickets across {new Set(tickets.map(t => t.eventId?._id)).size} events</p>
                        </div>
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center justify-center px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-slate-200"
                        >
                            Browse More Events
                            <ChevronRight className="w-5 h-5 ml-1" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {tickets.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-200">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <TicketIcon className="w-12 h-12 text-slate-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">No tickets found</h2>
                        <p className="text-slate-500 max-w-sm mx-auto mb-8">
                            It looks like you haven't booked any events yet. Once you do, your tickets will appear right here!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {tickets.map((ticket) => (
                            <div
                                key={ticket._id}
                                className="bg-white rounded-[2rem] overflow-hidden flex flex-col sm:flex-row shadow-sm border border-slate-100 group hover:shadow-xl hover:border-indigo-100 transition-all duration-500"
                            >
                                {/* Visual "Stub" Area */}
                                <div className="w-full sm:w-48 h-64 sm:h-auto relative overflow-hidden bg-slate-900">
                                    {ticket.eventId?.image ? (
                                        <img
                                            src={ticket.eventId.image}
                                            alt={ticket.eventId.name}
                                            className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                                            <Trophy className="w-12 h-12 text-white/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50"></div>
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] uppercase tracking-widest font-black text-white border border-white/20">
                                            {ticket.eventId?.type || "Event"}
                                        </span>
                                    </div>
                                </div>

                                {/* Main Ticket Area */}
                                <div className="flex-grow p-8 flex flex-col justify-between relative">
                                    {/* Decorative Ticket Punch Holes */}
                                    <div className="hidden sm:block absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border border-slate-100"></div>

                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-2xl font-black text-slate-900 font-display leading-tight">{ticket.eventId?.name || "Event Name Unavailable"}</h3>
                                            <div className="flex flex-col items-end">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${ticket.status === 'VALID' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-50 text-slate-400'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-4 mb-8">
                                            <div className="flex items-center text-slate-500">
                                                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                                <div className="text-sm">
                                                    <p className="font-bold text-slate-900 leading-none mb-1">
                                                        {ticket.eventId?.startDate ? new Date(ticket.eventId.startDate).toLocaleDateString(undefined, {
                                                            month: 'short', day: 'numeric', year: 'numeric'
                                                        }) : "Date TBA"}
                                                    </p>
                                                    <p className="text-[10px] font-medium uppercase tracking-wider">Show date</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center text-slate-500">
                                                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                                <div className="text-sm">
                                                    <p className="font-bold text-slate-900 leading-none mb-1">{ticket.eventId?.location || "Venue TBA"}</p>
                                                    <p className="text-[10px] font-medium uppercase tracking-wider">Location</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center text-slate-500">
                                                <TicketIcon className="w-4 h-4 mr-2 text-slate-400" />
                                                <div className="text-sm">
                                                    <p className="font-bold text-slate-900 leading-none mb-1">Row {ticket.seatId?.row}, Seat {ticket.seatId?.seatNumber}</p>
                                                    <p className="text-[10px] font-medium uppercase tracking-wider">{ticket.zoneId?.name || "General Admission"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center text-slate-500">
                                                <QrCode className="w-4 h-4 mr-2 text-slate-400" />
                                                <div className="text-sm">
                                                    <p className="font-mono font-bold text-slate-900 leading-none mb-1">{ticket.ticketCode}</p>
                                                    <p className="text-[10px] font-medium uppercase tracking-wider">Access Code</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleDownloadPDF(ticket)}
                                            disabled={downloading[ticket._id]}
                                            className="flex-grow flex items-center justify-center px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-indigo-600 transition-all shadow-lg shadow-slate-100 relative group overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="relative z-10 flex items-center">
                                                {downloading[ticket._id] ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download PDF
                                                    </>
                                                )}
                                            </span>
                                            <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        </button>
                                        <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
                                            <AlertCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
