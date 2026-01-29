"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar, Ticket, DollarSign,TrendingUp,Settings,BarChart3} from 'lucide-react';
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

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/admin/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleClickUserManagement = () => {
    router.push('/admin/users');
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen bg-white">
        <Navbar />
        {/* Admin Content */}
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
          {/* Stats Grid */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Events"
            value={stats.totalEvents}
            icon={Calendar}
            color="blue"
          />
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            color="green"
          />
          <StatsCard
            title="Active Bookings"
            value={stats.activeBookings}
            icon={Ticket}
            color="purple"
          />
          <StatsCard
            title="Revenue"
            value={`$${stats.totalRevenue}`}
            icon={DollarSign}
            color="yellow"
          />
        </div> */}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionButton
              title="Create User"
              description="Add a new user"
              icon={Users}
              onClick={() => router.push('/admin/users/create')}
            />
            <ActionButton
              title="Manage Users"
              description="View and manage users"
              icon={Users}
              onClick={handleClickUserManagement}
            />
            <ActionButton
              title="View Analytics"
              description="Access analytics"
              icon={BarChart3}
              onClick={() => router.push('/admin/reports')}
            />
          </div>
        </div>

        {/* Recent Activity */}
        {/* <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">No recent activity</p>
          </div>
        </div> */}
        </div>
      </div>
    </RoleGuard>
  );
}

function StatsCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-slate-100 text-slate-800',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ title, description, icon: Icon, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-slate-800 hover:bg-slate-50 transition-all"
    >
      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-800" />
      </div>
      <div className="text-left">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </button>
  );
}