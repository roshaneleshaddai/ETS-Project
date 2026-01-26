"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Home, Search, Ticket, Heart, Settings, Users, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) {
    return null;
  }

  const isActive = (path) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(path);
  };

  const handleNavigation = (path) => {
    router.push(path);
  };

  // Admin navigation items
  const adminNavItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Users, label: "Users", path: "/admin/users" },
    { icon: Ticket, label: "Analytics", path: "/admin/analytics" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  // Customer navigation items
  const customerNavItems = [
    { icon: Home, label: "Home", path: "/" },
    // { icon: Search, label: "Explore", path: "/explore" },
    { icon: Ticket, label: "My Tickets", path: "/my-tickets" },
    { icon: Heart, label: "Favorites", path: "/favorites" },
  ];

  // Ticketing navigation items
  const ticketingNavItems = [
    { icon: Home, label: "Home", path: "/" },
  ];

  // Gate navigation items
  const gateNavItems = [
    { icon: Home, label: "Home", path: "/" },
  ];

  // Management navigation items
  const managementNavItems = [
    { icon: Home, label: "Home", path: "/" },
  ];

  // Get navigation items based on role
  const getNavItems = () => {
    switch (user.role) {
      case "ADMIN":
        return adminNavItems;
      case "CUSTOMER":
        return customerNavItems;
      case "TICKETING":
        return ticketingNavItems;
      case "GATE":
        return gateNavItems;
      case "MANAGEMENT":
        return managementNavItems;
      default:
        return [{ icon: Home, label: "Home", path: "/" }];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">EventPass</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center space-x-2 py-2 transition-colors text-md ${
                      active
                        ? "text-slate-800 font-medium border-b-2 border-slate-800"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? "text-slate-800" : ""}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">{user?.name || "User"}</span>
              {user?.role === "ADMIN" && <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded">
                {user?.role}
              </span>}
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation Bar - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="grid grid-cols-4 gap-1">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center py-3 transition-colors ${
                  active
                    ? "text-slate-800 font-medium"
                    : "text-gray-500"
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${active ? "text-slate-800" : ""}`} />
                <span className="text-xs">{item.label}</span>
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800"></div>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

