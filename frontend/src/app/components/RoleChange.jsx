"use client";

import { useState } from "react";
import { X, AlertCircle, Shield } from "lucide-react";

export default function RoleChangeDialog({ user, onClose, onConfirm }) {
  const [selectedRole, setSelectedRole] = useState(user?.role || "CUSTOMER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const roles = ["CUSTOMER", "ADMIN", "TICKETING", "GATE", "MANAGEMENT"];

  const handleConfirm = async () => {
    if (selectedRole === user.role) {
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onConfirm(selectedRole);

      if (result && result.success) {
        // Success - close dialog
        onClose();
      } else {
        setError(result?.error || "Failed to update role");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Failed to update role");
      setLoading(false);
    }
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      CUSTOMER: "Standard user with access to book events and view tickets",
      ADMIN: "Full administrative access to manage users, events, and system settings",
      TICKETING: "Access to manage ticket sales and bookings",
      GATE: "Access to scan and validate tickets at event gates",
      MANAGEMENT: "Management-level access to view reports and analytics",
    };
    return descriptions[role];
  };

  // Prevent rendering if user is not available
  if (!user) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay with animation */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900" id="modal-title">
                  Change User Role
                </h3>
                <p className="text-sm text-gray-500">
                  {user.name} ({user.email})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Warning */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Changing a user's role will immediately affect their permissions and access levels.
            </p>
          </div>

          {/* Current Role */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Role
            </label>
            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-900">
              {user.role}
            </div>
          </div>

          {/* New Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select New Role
            </label>
            <div className="space-y-2">
              {roles.map((role) => (
                <label
                  key={role}
                  className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRole === role
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    disabled={loading}
                    className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {role}
                      </span>
                      {role === user.role && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getRoleDescription(role)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || selectedRole === user.role}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Confirm Change'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}