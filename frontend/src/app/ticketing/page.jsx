"use client";
import { useState } from "react";

export default function TicketingHomePage({ user, logout }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold text-center mt-20">
        Ticketing Dashboard – Coming Soon!
      </h1>
      <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
    </div>
  );
}