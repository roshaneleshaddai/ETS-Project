"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Filter, Users as UsersIcon, Shield, ChevronLeft, ChevronRight, Activity, UserPlus, X } from "lucide-react";
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  //key value pair role:label
  const roles = [
    { role: "ALL", label: "All Roles" },
    { role: "CUSTOMER", label: "Customer" },
    { role: "ADMIN", label: "Admin" },
    { role: "TICKETING", label: "Ticketing Agent" },
    { role: "GATE", label: "Gate Staff" },
    { role: "MANAGEMENT", label: "Management" }
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
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/user`);

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();

      // Filter out the currently logged-in user
      const userData = localStorage.getItem("user");
      const currentUserId = userData ? JSON.parse(userData)._id : null;

      const filteredData = data.filter(user => user._id !== currentUserId);

      // Sort by creation date (newest first)
      const sortedData = filteredData.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setUsers(sortedData);

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
    setFilteredUsers(filtered);
  };

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      // First, fetch the current user to get their existing role
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URI}/user/${userId}`);
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user');
      }
      const userToUpdate = await userResponse.json();
      const oldRole = userToUpdate.role;

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
            name: userToUpdate.name,
            email: userToUpdate.email,
            phone: userToUpdate.phone || '',
          },
          userId: userToUpdate._id,
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
          `${process.env.NEXT_PUBLIC_BACKEND_URI}/customers/email/${userToUpdate.email}`
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

  // Pagination calculations
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      if (startPage > 2) pageNumbers.push('...');
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      if (endPage < totalPages - 1) pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Analyzing User Base...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.back()}
                className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back</span>
              </button>
            </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                User Management
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  {users.length} Total
                </span>
              </h1>
            </div>

            <button
              onClick={() => router.push('/admin/users/create')}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="w-5 h-5" />
              Add New Staff
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-10">
            <MiniStat label="Customers" count={users.filter(u => u.role === 'CUSTOMER').length} color="blue" />
            <MiniStat label="Admins" count={users.filter(u => u.role === 'ADMIN').length} color="indigo" />
            <MiniStat label="Ticketing" count={users.filter(u => u.role === 'TICKETING').length} color="purple" />
            <MiniStat label="Gate Staff" count={users.filter(u => u.role === 'GATE').length} color="orange" />
            <MiniStat label="Management" count={users.filter(u => u.role === 'MANAGEMENT').length} color="emerald" />
            <MiniStat label="Active" count={users.filter(u => u.isActive).length} color="green" icon={<Activity className="w-3 h-3" />} />
          </div>

          {/* Filters & Search */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search */}
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all font-medium text-slate-900"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                )}
              </div>

              {/* Role Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
                {roles.map(role => (
                  <button
                    key={role.role}
                    onClick={() => setRoleFilter(role.role)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${roleFilter === role.role
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}

          {/* Users Table Container */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-8">
            <UserTable
              users={currentUsers}
              onRoleUpdate={handleRoleUpdate}
              onPermissionsUpdate={handlePermissionsUpdate}
              onRefresh={fetchUsers}
            />
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Showing {indexOfFirstUser + 1} - {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-xl transition-all ${currentPage === 1
                      ? 'text-slate-300'
                      : 'text-indigo-600 hover:bg-indigo-50 active:scale-90'
                    }`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers().map((pageNum, index) => (
                    pageNum === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 text-slate-300">...</span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${currentPage === pageNum
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'text-slate-500 hover:bg-slate-100'
                          }`}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-xl transition-all ${currentPage === totalPages
                      ? 'text-slate-300'
                      : 'text-indigo-600 hover:bg-indigo-50 active:scale-90'
                    }`}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <div className="sm:hidden text-xs font-bold text-slate-400">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}

function MiniStat({ label, count, color, icon }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    green: 'bg-green-100 text-green-700',
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-colors">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-slate-900">{count}</p>
      </div>
      <div className={`p-2 rounded-lg ${colors[color]} group-hover:scale-110 transition-transform`}>
        {icon || <UsersIcon className="w-4 h-4" />}
      </div>
    </div>
  );
}
