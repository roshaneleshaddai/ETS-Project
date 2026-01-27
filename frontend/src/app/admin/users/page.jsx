"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Filter, Users as UsersIcon, Shield } from "lucide-react";
import UserTable from "../../components/UserTable";
import RoleGuard from "../../components/RoleGuard";
import Navbar from "../../components/Navbar";

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [currentUser, setCurrentUser] = useState(null);

  //key value pair role:label
  const roles = [
    {role:"ALL", label:"All"},
    {role: "CUSTOMER", label: "Customer"},
    {role: "ADMIN", label:"Admin"},
    {role: "TICKETING", label: "Ticketing Agent"},
    {role: "GATE", label: "Gate Staff"},
    {role: "MANAGEMENT", label: "Management"}
  ];

  useEffect(() => {
    // Get current logged-in user
    const userData = localStorage.getItem("user");
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/user`);
      console.log('Fetch users response:', response);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      
      // Filter out the currently logged-in user
      const userData = localStorage.getItem("user");
      console.log('Current user data from localStorage:', userData);
      const currentUserId = userData ? JSON.parse(userData)._id : null;
      console.log('Current user ID:', currentUserId);
      
      const filteredData = data.filter(user => user._id !== currentUserId);
      console.log('Filtered users data:', filteredData);
      setUsers(filteredData);
      
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply role filter
    if (roleFilter !== "ALL") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user._id?.toLowerCase().includes(query)
      );
    }
    console.log('Filtered users after applying search and role filters:', filtered);
    setFilteredUsers(filtered);
  };

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      // First, fetch the current user to get their existing role
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/user/${userId}`);
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user');
      }
      const currentUser = await userResponse.json();
      const oldRole = currentUser.role;

      // Update the user role
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      // Handle customer record creation/deletion based on role change
      const isChangingToCustomer = oldRole !== 'CUSTOMER' && newRole === 'CUSTOMER';
      const isChangingFromCustomer = oldRole === 'CUSTOMER' && newRole !== 'CUSTOMER';

      if (isChangingToCustomer) {
        // Create customer record
        const customerData = {
          encryptedPII: {
            name: currentUser.name,
            email: currentUser.email,
            phone: '', // You may need to add phone to User schema or leave empty
          },
          loyalty: {
            verified: false,
          },
        };

        const customerResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(customerData),
        });

        if (!customerResponse.ok) {
          console.error('Failed to create customer record');
        }
      } else if (isChangingFromCustomer) {
        // Find and delete customer record by email
        const customerResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/email/${currentUser.email}`
        );

        if (customerResponse.ok) {
          const customer = await customerResponse.json();
          if (customer && customer._id) {
            const deleteResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/${customer._id}`,
              {
                method: 'DELETE',
              }
            );

            if (!deleteResponse.ok) {
              console.error('Failed to delete customer record');
            }
          }
        }
      }

      // Refresh users list
      await fetchUsers();
      
      return { success: true };
    } catch (error) {
      console.error('Error updating role:', error);
      return { success: false, error: error.message };
    }
  };

  const handlePermissionsUpdate = async (userId, newPermissions) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/users/${userId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: newPermissions }),
      });

      if (!response.ok) {
        throw new Error('Failed to update permissions');
      }

      // Refresh users list
      await fetchUsers();
      
      return { success: true };
    } catch (error) {
      console.error('Error updating permissions:', error);
      return { success: false, error: error.message };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen bg-white">
        <Navbar />
        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Active Users</p>
            <p className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.isActive).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-slate-800">
            <p className="text-sm text-gray-600">Admins</p>
            <p className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'ADMIN').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Customers</p>
            <p className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'CUSTOMER').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Ticketing Agents</p>
            <p className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'TICKETING').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Gate Staff</p>
            <p className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'GATE').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-500">
            <p className="text-sm text-gray-600">Management</p>
            <p className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'MANAGEMENT').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="w-full md:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent appearance-none"
                >
                  {roles.map(role => (
                    <option key={role.role} value={role.role}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} users
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("ALL");
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Users Table */}
        <UserTable
          users={filteredUsers}
          onRoleUpdate={handleRoleUpdate}
          onPermissionsUpdate={handlePermissionsUpdate}
          onRefresh={fetchUsers}
        />
        </div>
      </div>
    </RoleGuard>
  );
}