"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar, Ticket, DollarSign, TrendingUp, Settings, BarChart3, ArrowRight, Activity, ShieldCheck } from 'lucide-react';
import RoleGuard from "../components/RoleGuard";
import Navbar from "../components/Navbar";

export default function AdminHomePage({ user, logout }) {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalUsers: 0,
    totalRevenue: 0,
    activeBookings: 0
  });
  const [recentActivity, setRecentActivity] = useState({
    users: [],
    tickets: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);

      const [eventsRes, usersRes, ticketsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/events`),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/user`),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/tickets`)
      ]);

      if (!eventsRes.ok || !usersRes.ok || !ticketsRes.ok) {
        throw new Error("Failed to fetch statistics");
      }

      const eventsData = await eventsRes.json();
      const usersData = await usersRes.json();
      const ticketsData = await ticketsRes.json();

      // Calculate stats
      setStats({
        totalEvents: (eventsData || []).length,
        totalUsers: (usersData || []).length,
        totalRevenue: (ticketsData || []).reduce((acc, t) => acc + (t.pricePaid || 0), 0),
        activeBookings: (ticketsData || []).filter(t => t.status === 'VALID').length
      });

      // Extract recent activity
      const latestUsers = [...(usersData || [])]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 2);

      const latestTickets = [...(ticketsData || [])]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 2);

      setRecentActivity({
        users: latestUsers,
        tickets: latestTickets
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClickUserManagement = () => {
    router.push('/admin/users');
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);

    if (diffInMins < 60) return `${diffInMins} mins ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
          {/* Welcome Header */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
                <ShieldCheck className="w-4 h-4" />
                Admin Dashboard
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Control Panel
              </h1>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <Activity className="w-4 h-4 text-green-500" />
              System Status: <span className="text-green-600 font-bold">Online</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatsCard
              title="Total Events"
              value={stats.totalEvents}
              icon={Calendar}
              color="indigo"
              trend="+12%"
            />
            <StatsCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              color="blue"
              trend="+5%"
            />
            <StatsCard
              title="Active Bookings"
              value={stats.activeBookings}
              icon={Ticket}
              color="slate"
              trend="+18%"
            />
            <StatsCard
              title="Revenue"
              value={`₹${stats.totalRevenue.toLocaleString()}`}
              icon={DollarSign}
              color="emerald"
              trend="+24%"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Quick Management
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ActionButton
                    title="User Controls"
                    description="Edit roles and permissions"
                    icon={Users}
                    onClick={handleClickUserManagement}
                    color="indigo"
                  />
                  <ActionButton
                    title="Event Management"
                    description="Create or modify events"
                    icon={Calendar}
                    onClick={() => router.push('/admin/events')}
                    color="blue"
                  />
                  <ActionButton
                    title="Financial Reports"
                    description="View detailed revenue"
                    icon={BarChart3}
                    onClick={() => router.push('/admin/reports')}
                    color="emerald"
                  />
                  <ActionButton
                    title="System Settings"
                    description="Global configuration"
                    icon={Settings}
                    onClick={() => router.push('/admin/settings')}
                    color="slate"
                  />
                </div>
              </div>
            </div>

            {/* Side Panel: System Activity */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900 rounded-3xl shadow-xl p-8 text-white h-full relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-xl font-bold mb-6">Recent Alerts</h2>
                  <div className="space-y-4">
                    {/* Recent Users */}
                    {recentActivity.users.map((u, idx) => (
                      <div key={u._id || idx} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                          <Users className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">New User: {u.name}</p>
                          <p className="text-xs text-slate-400">{formatRelativeTime(u.createdAt)}</p>
                        </div>
                      </div>
                    ))}

                    {/* Recent Ticket Sales */}
                    {recentActivity.tickets.map((t, idx) => (
                      <div key={t._id || idx} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Ticket Sold: ₹{t.pricePaid}</p>
                          <p className="text-xs text-slate-400">{formatRelativeTime(t.createdAt)}</p>
                        </div>
                      </div>
                    ))}

                    {recentActivity.users.length === 0 && recentActivity.tickets.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">No recent activity detected.</p>
                    )}

                    <div className="pt-4">
                      <button
                        onClick={() => router.push('/admin/audit-logs')}
                        className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition flex items-center justify-center gap-2"
                      >
                        View Audit Log
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Decorative blob */}
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl opacity-50"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

function StatsCard({ title, value, icon: Icon, color, trend }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
          {trend}
        </span>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ title, description, icon: Icon, onClick, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    slate: 'bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white',
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-slate-200 hover:shadow-lg transition-all text-left group"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase text-xs tracking-widest">{title}</p>
        <p className="text-sm text-slate-500 line-clamp-1">{description}</p>
      </div>
    </button>
  );
}
