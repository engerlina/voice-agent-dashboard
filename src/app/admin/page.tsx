"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, AdminStats, AdminUser, AdminPhoneNumber, SelectedRole } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "numbers">("overview");

  // Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<AdminPhoneNumber[]>([]);

  // Add number form
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newNumberSid, setNewNumberSid] = useState("");
  const [newNumberName, setNewNumberName] = useState("");
  const [addingNumber, setAddingNumber] = useState(false);

  // Role switcher
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { is_admin } = await api.checkAdmin();
        if (!is_admin) {
          router.push("/dashboard");
          return;
        }

        // Check if user has selected admin role
        const selectedRole = api.getSelectedRole();
        if (selectedRole !== 'admin') {
          // Admin user but not acting as admin, redirect to dashboard
          router.push("/dashboard");
          return;
        }

        setIsAdmin(true);
        await loadData();
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  const loadData = async () => {
    try {
      const [statsData, usersData, numbersData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminPhoneNumbers(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setPhoneNumbers(numbersData);
    } catch (err) {
      console.error("Failed to load admin data", err);
    }
  };

  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      await api.updateUser(userId, { is_active: !currentStatus });
      await loadData();
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingNumber(true);
    try {
      await api.addPhoneNumber({
        number: newNumber,
        twilio_sid: newNumberSid || undefined,
        friendly_name: newNumberName || undefined,
      });
      setNewNumber("");
      setNewNumberSid("");
      setNewNumberName("");
      setShowAddNumber(false);
      await loadData();
    } catch (err) {
      console.error("Failed to add number", err);
      alert("Failed to add number. Make sure it's in E.164 format (+1234567890)");
    } finally {
      setAddingNumber(false);
    }
  };

  const handleDeleteNumber = async (numberId: string) => {
    if (!confirm("Are you sure you want to delete this phone number?")) return;
    try {
      await api.deletePhoneNumber(numberId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete number");
    }
  };

  const handleUnassignNumber = async (numberId: string) => {
    if (!confirm("This will remove the number from the user. Are you sure?")) return;
    try {
      await api.unassignPhoneNumber(numberId);
      await loadData();
    } catch (err) {
      console.error("Failed to unassign number", err);
    }
  };

  const handleSwitchRole = (role: SelectedRole) => {
    api.setSelectedRole(role);
    setShowRoleSwitcher(false);
    if (role === 'user') {
      // If switching to user mode, redirect to dashboard
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Admin Mode
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showRoleSwitcher && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-1 z-50">
                  <button
                    onClick={() => handleSwitchRole('admin')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-orange-400 bg-orange-500/10 hover:bg-orange-500/20"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Admin Mode
                    <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleSwitchRole('user')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    User Mode
                  </button>
                </div>
              )}
            </div>
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white text-sm"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-4 border-b border-gray-700 mt-4">
          {(["overview", "users", "numbers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium capitalize transition border-b-2 -mb-px ${
                activeTab === tab
                  ? "text-orange-500 border-orange-500"
                  : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              {tab === "numbers" ? "Phone Numbers" : tab}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Users" value={stats.total_users} />
            <StatCard title="Active Users" value={stats.active_users} />
            <StatCard title="Phone Numbers" value={stats.total_phone_numbers} />
            <StatCard
              title="Available Numbers"
              value={stats.available_phone_numbers}
              subtitle={`${stats.assigned_phone_numbers} assigned`}
            />
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Organization</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{user.email}</span>
                        {user.is_admin && (
                          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">Admin</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{user.full_name || "-"}</td>
                    <td className="px-4 py-3 text-gray-300">{user.tenant_name || "-"}</td>
                    <td className="px-4 py-3 text-gray-300">{user.phone_number || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleUserActive(user.id, user.is_active)}
                        className="text-sm text-gray-400 hover:text-white"
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Phone Numbers Tab */}
        {activeTab === "numbers" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Phone Number Pool</h2>
              <button
                onClick={() => setShowAddNumber(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
              >
                Add Number
              </button>
            </div>

            {/* Add Number Modal */}
            {showAddNumber && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Add Phone Number</h3>
                  <form onSubmit={handleAddNumber} className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Phone Number (E.164)</label>
                      <input
                        type="text"
                        value={newNumber}
                        onChange={(e) => setNewNumber(e.target.value)}
                        placeholder="+14155551234"
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Twilio SID (optional)</label>
                      <input
                        type="text"
                        value={newNumberSid}
                        onChange={(e) => setNewNumberSid(e.target.value)}
                        placeholder="PNxxxxxxxxxxxxxxxx"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Friendly Name (optional)</label>
                      <input
                        type="text"
                        value={newNumberName}
                        onChange={(e) => setNewNumberName(e.target.value)}
                        placeholder="San Francisco"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddNumber(false)}
                        className="flex-1 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addingNumber}
                        className="flex-1 px-4 py-2 bg-orange-500 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                      >
                        {addingNumber ? "Adding..." : "Add Number"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Number</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Assigned To</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {phoneNumbers.map((number) => (
                    <tr key={number.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <p className="text-white font-mono">{number.number}</p>
                        {number.twilio_sid && (
                          <p className="text-xs text-gray-500">{number.twilio_sid}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{number.friendly_name || "-"}</td>
                      <td className="px-4 py-3">
                        {number.user_email ? (
                          <div>
                            <p className="text-white">{number.user_email}</p>
                            <p className="text-xs text-gray-500">
                              {number.webhook_configured ? "Webhook ready" : "Setting up..."}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500">Available</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          number.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {number.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {number.user_id && (
                            <button
                              onClick={() => handleUnassignNumber(number.id)}
                              className="text-sm text-yellow-400 hover:text-yellow-300"
                            >
                              Unassign
                            </button>
                          )}
                          {!number.user_id && (
                            <button
                              onClick={() => handleDeleteNumber(number.id)}
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {phoneNumbers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No phone numbers in pool. Click "Add Number" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: number; subtitle?: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
