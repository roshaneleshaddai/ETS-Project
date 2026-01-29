"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Home, Search, Ticket, Heart, Settings, Users, LogOut } from "lucide-react";
import Image from "next/image";

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
    { icon: Ticket, label: "My Tickets", path: "/customer/tickets" },
    { icon: Heart, label: "Favorites", path: "/customer/favorites" },
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
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="relative w-full h-16 px-6 flex items-center">

          {/* LEFT — Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-20 h-12">
              <Image
                src="/EP_Logo_nobg.png"
                alt="Emperors Palace Logo"
                fill
                className="object-contain"
              />
            </div>
            <h1 className="hidden lg:block text-lg tracking-wide font-semibold text-gray-900">
              EMPERORS PALACE
            </h1>
          </div>

          {/* CENTER — Nav Items */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-10">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`group relative flex items-center gap-2 text-sm tracking-wide transition-all
                    ${active
                      ? "text-gray-900 font-medium"
                      : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>

                  {/* Underline */}
                  <span
                    className={`absolute -bottom-2 left-0 h-[2px] bg-gray-900 transition-all duration-300
                      ${active ? "w-full" : "w-0 group-hover:w-full"}
                    `}
                  />
                </button>
              );
            })}
          </div>

          {/* RIGHT — Profile */}
          <div className="ml-auto flex items-center gap-4">
            <button
              onClick={() => router.push("/profile")}
              className="w-9 h-9 flex items-center justify-center rounded-full
                        bg-slate-800 text-white text-sm font-semibold
                        hover:bg-slate-700 transition border border-slate-900 hover:cursor-pointer"
            >
              {(user?.name?.[0] || "U").toUpperCase()}
            </button>
            {user?.role === "ADMIN" && (
              <span className="text-xs px-2 py-1 border border-gray-400 rounded tracking-wide">
                ADMIN
              </span>
            )}
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
                className={`flex flex-col items-center py-3 transition-colors ${active
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
