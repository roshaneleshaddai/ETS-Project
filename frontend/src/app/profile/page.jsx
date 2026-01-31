"use client";

import Navbar from "../components/Navbar";
import RoleGuard from "../components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, LogOut, Settings, User, Mail, Phone, Shield, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  // Helper patterns for masking
  const maskEmail = (email) => {
    if (!email) return "—";
    const [local, domain] = email.split("@");
    if (!domain) return email;

    const maskedLocal = local[0] + "****";
    const domainParts = domain.split(".");
    const maskedDomain = domainParts[0][0] + "****";
    const extension = domainParts.length > 1 ? "." + domainParts.slice(1).join(".") : "";

    return `${maskedLocal}@${maskedDomain}${extension}`;
  };

  const maskPhone = (phone) => {
    if (!phone) return "Not Provided";
    const cleaned = String(phone).replace(/\s/g, "");
    if (cleaned.length < 4) return "****";
    return "*******" + cleaned.slice(-4);
  };

  if (!user) return null;

  return (
    <RoleGuard allowedRoles={["ADMIN", "TICKETING", "GATE", "MANAGEMENT", "CUSTOMER"]}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => router.back()}
                className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back</span>
              </button>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar/Profile Identity */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
                <div className="relative inline-block mb-6">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-slate-800 flex items-center justify-center text-3xl font-bold text-white ring-4 ring-white shadow-lg mx-auto">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <button className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-md border border-slate-100 hover:bg-slate-50 transition-colors text-slate-600">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <h1 className="text-xl font-bold text-slate-900 mb-1">{user.name}</h1>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-100">
                  <Shield className="w-3 h-3" />
                  {user.role}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      Profile Details
                    </h2>
                    <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition">
                      Edit Profile
                    </button>
                  </div>

                  <div className="space-y-1">
                    <ProfileRow
                      label="Full Name"
                      value={user.name}
                      icon={<User className="w-5 h-5" />}
                    />
                    <ProfileRow
                      label="Email Address"
                      value={maskEmail(user.email)}
                      icon={<Mail className="w-5 h-5" />}
                    />
                    <ProfileRow
                      label="Phone Number"
                      value={maskPhone(user.phone)}
                      icon={<Phone className="w-5 h-5" />}
                    />
                  </div>
                </div>
              </div>

              {/* Preferences/Settings Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden p-6 sm:p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Account Settings
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition cursor-pointer group">
                    <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-700 transition">Security</h3>
                    <p className="text-sm text-slate-500">Manage your password and authentication</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition cursor-pointer group">
                    <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-700 transition">Notifications</h3>
                    <p className="text-sm text-slate-500">Control your email and app alerts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

function ProfileRow({ label, value, icon }) {
  return (
    <div className="flex items-center justify-between py-5 border-b border-slate-50 last:border-b-0 group">
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
          <span className="text-slate-800 font-semibold">{value || "—"}</span>
        </div>
      </div>
    </div>
  );
}
