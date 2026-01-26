"use client";
import Navbar from "../components/Navbar";
import RoleGuard from "../components/RoleGuard";

export default function TicketingHomePage({ user, logout }) {
  return (
    <RoleGuard allowedRoles={["TICKETING"]}>
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] pb-20 md:pb-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Ticketing Dashboard – Coming Soon!
            </h1>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}