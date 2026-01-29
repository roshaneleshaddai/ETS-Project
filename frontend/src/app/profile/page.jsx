'use client';

import Navbar from "../components/Navbar";
import RoleGuard from "../components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, LogOut, Settings, User, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  console.log(user);
  
  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <RoleGuard allowedRoles={["ADMIN", "TICKETING", "GATE", "MANAGEMENT", "CUSTOMER"]}>
      <div className="min-h-screen">
        <Navbar />
        <div className="w-full mx-auto mt-2 px-4 pb-12">
          {/* Profile Header */}
          <div className="flex items-center gap-6 my-5">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-semibold text-white ring-4 ring-slate-100">
              {user.name?.charAt(0).toUpperCase()}
            </div>


            {/* User Info */}
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                {user.name}
              </h1>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 tracking-wide">
                Profile Details
              </h2>
              <div className="space-y-1">
                <ProfileRow 
                  label="Full Name" 
                  value={user.name}
                  icon={<User className="w-5 h-5" />}
                />
                <ProfileRow 
                  label="Email Address" 
                  value={user.email}
                  icon={<Mail className="w-5 h-5" />}
                />
                <ProfileRow
                  label="Phone Number"
                  value={user.phone || "Not Provided"}
                  icon={<Phone className="w-5 h-5" />}
                />
                {/* <ProfileRow 
                  label="Role" 
                  value={user.role}
                  badge={true}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  }
                /> */}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-100">
              <div className="flex gap-3">
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-lg text-sm font-medium
                            text-red-700 border border-red-300
                            hover:bg-red-50 transition flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium
                            border border-gray-300 text-gray-700
                            hover:bg-gray-100 transition flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

function ProfileRow({ label, value, icon, badge, statusBadge }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-100 text-red-700">
          {icon}
        </div>
        <span className="text-sm text-gray-500 tracking-wide">{label}</span>
      </div>
      <div className="flex items-center">
        {badge ? (
          <span className="text-sm font-medium text-gray-900">{value || "—"}</span>
        ) : statusBadge !== undefined ? (
          <span className={`px-3 py-1 rounded-full font-semibold text-sm flex items-center gap-1.5 ${
            statusBadge 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              statusBadge ? 'bg-green-500' : 'bg-gray-400'
            }`}></span>
            {value || "—"}
          </span>
        ) : (
          <span className="font-semibold text-gray-800">{value || "—"}</span>
        )}
      </div>
    </div>
  );
}