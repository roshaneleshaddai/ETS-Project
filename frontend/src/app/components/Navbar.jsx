"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Home, Search, Ticket, Heart, Settings, Users, LogOut } from "lucide-react";
import Image from "next/image";

export default function Navbar({ showSearch = false, searchQuery, setSearchQuery, onSearch }) {
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
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 transition-all duration-300">
        <div className="relative w-full h-20 px-6 flex items-center justify-between max-w-[1920px] mx-auto">

          {/* LEFT — Logo */}
          <div className="flex items-center gap-3 w-[200px]">
            <div className="relative w-32 h-12 cursor-pointer" onClick={() => router.push('/')}>
              <Image
                src="/EP_Logo_nobg.png"
                alt="Emperors Palace Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* CENTER — Nav Items */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8 bg-slate-100/50 px-6 py-2 rounded-full border border-slate-200/50 backdrop-blur-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`group relative flex items-center gap-2 text-sm font-medium transition-all duration-200
                    ${active
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${active ? "text-slate-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                  <span>{item.label}</span>

                  {/* Dot Indicator for Active State */}
                  {active && (
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* RIGHT — Search & Profile */}
          <div className="flex items-center gap-4 w-[auto] justify-end">

            {/* Search Bar (Conditional) */}
            {showSearch && (
              <div className="hidden lg:flex items-center relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-500 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && onSearch && onSearch()}
                  placeholder="Search events..."
                  className="w-64 pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-200 rounded-full text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all duration-300"
                />
              </div>
            )}

            <div className="h-6 w-px bg-slate-200 mx-1 hidden lg:block"></div>

            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-3 pl-1 pr-1 py-1 rounded-full hover:bg-slate-100 transition-all group"
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-full
                        bg-slate-800 text-white text-sm font-semibold
                        group-hover:bg-slate-900 transition border border-slate-900 shadow-md shadow-slate-900/10">
                {(user?.name?.[0] || "U").toUpperCase()}
              </div>
              {/* <div className="hidden xl:block text-left text-xs mr-2">
                 <p className="font-semibold text-slate-900">{user?.name?.split(' ')[0]}</p>
                 <p className="text-slate-500 text-[10px]">{user?.role}</p>
               </div> */}
            </button>
          </div>

        </div>
      </nav>

      {/* Bottom Navigation Bar - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 safe-area-bottom">
        <div className="grid grid-cols-4 gap-1 p-1">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center py-2.5 rounded-lg transition-colors ${active
                  ? "text-slate-600 bg-slate-50/50"
                  : "text-slate-500 hover:text-slate-700 active:bg-slate-50"
                  }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${active ? "fill-current" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
