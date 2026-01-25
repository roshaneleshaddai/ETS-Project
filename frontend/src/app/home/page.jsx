"use client";

import { useAuth } from "@/context/AuthContext";
import AdminHomePage from "../admin/page";
import CustomerHomePage from "../customer/page";
import TicketingHomePage from "../ticketing/page";

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  // While auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, let app/page.jsx handle auth UI
  if (!user) {
    return null;
  }

  // Role-based rendering
  switch (user.role) {
    case "ADMIN":
      return <AdminHomePage user={user} logout={logout} />;

    case "MANAGEMENT":
      return (
        <h1 className="text-2xl font-bold text-center mt-20">
          Management Dashboard – Coming Soon!
        </h1>
      );

    case "CUSTOMER":
      return <CustomerHomePage user={user} logout={logout} />;

    case "TICKETING":
      return <TicketingHomePage user={user} logout={logout} />;

    case "GATE":
      return (
        <h1 className="text-2xl font-bold text-center mt-20">
          Gate Dashboard – Coming Soon!
        </h1>
      );

    default:
      return null;
  }
}
