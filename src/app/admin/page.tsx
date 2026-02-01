"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, AdminStats, AdminUser, AdminPhoneNumber, TwilioAvailableNumber } from "@/lib/api";

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
  const [newNumber, setNewNumber] = useState("");
  const [addingNumber, setAddingNumber] = useState(false);

  // Search/filter
  const [searchQuery, setSearchQuery] = useState("");

  // Twilio number search
  const [twilioCountry, setTwilioCountry] = useState("US");
  const [twilioAreaCode, setTwilioAreaCode] = useState("");
  const [twilioNumbers, setTwilioNumbers] = useState<TwilioAvailableNumber[]>([]);
  const [twilioSearching, setTwilioSearching] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { is_admin } = await api.checkAdmin();
        if (!is_admin) {
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
    if (!newNumber.trim()) return;
    setAddingNumber(true);
    try {
      await api.addPhoneNumber({
        number: newNumber.trim(),
      });
      setNewNumber("");
      await loadData();
    } catch (err) {
      console.error("Failed to add number", err);
      alert("Failed to add number. Make sure it's in E.164 format (+1234567890)");
    } finally {
      setAddingNumber(false);
    }
  };

  // Filter phone numbers based on search
  const filteredNumbers = phoneNumbers.filter(num =>
    num.number.includes(searchQuery) ||
    (num.friendly_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (num.user_email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const availableNumbers = filteredNumbers.filter(n => !n.user_id);
  const assignedNumbers = filteredNumbers.filter(n => n.user_id);

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

  const handleSearchTwilio = async () => {
    setTwilioSearching(true);
    setTwilioNumbers([]);
    try {
      const numbers = await api.searchTwilioNumbers(
        twilioCountry,
        twilioAreaCode || undefined
      );
      setTwilioNumbers(numbers);
    } catch (err: any) {
      alert(err.message || "Failed to search numbers");
    } finally {
      setTwilioSearching(false);
    }
  };

  const handleBuyNumber = async (phoneNumber: string) => {
    if (!confirm(`Buy ${phoneNumber}? This will charge your Twilio account.`)) return;
    setBuyingNumber(phoneNumber);
    try {
      await api.buyTwilioNumber(phoneNumber);
      setTwilioNumbers(nums => nums.filter(n => n.phone_number !== phoneNumber));
      await loadData();
      alert(`Successfully purchased ${phoneNumber}!`);
    } catch (err: any) {
      alert(err.message || "Failed to purchase number");
    } finally {
      setBuyingNumber(null);
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
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white text-sm"
          >
            Back to Dashboard
          </Link>
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
          <div className="space-y-6">
            {/* Buy from Twilio */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Buy from Twilio</h3>
              <div className="flex gap-3 mb-4">
                <select
                  value={twilioCountry}
                  onChange={(e) => setTwilioCountry(e.target.value)}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
                <input
                  type="text"
                  value={twilioAreaCode}
                  onChange={(e) => setTwilioAreaCode(e.target.value)}
                  placeholder="Area code (optional)"
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                />
                <button
                  onClick={handleSearchTwilio}
                  disabled={twilioSearching}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {twilioSearching ? "Searching..." : "Search"}
                </button>
              </div>

              {/* Twilio Results */}
              {twilioNumbers.length > 0 && (
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {twilioNumbers.map((num) => (
                    <div key={num.phone_number} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-mono">{num.phone_number}</p>
                        <p className="text-sm text-gray-400">
                          {num.locality && `${num.locality}, `}{num.region}
                        </p>
                      </div>
                      <button
                        onClick={() => handleBuyNumber(num.phone_number)}
                        disabled={buyingNumber === num.phone_number}
                        className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {buyingNumber === num.phone_number ? "Buying..." : "Buy"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Or add manually */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Or add existing number</h3>
              <form onSubmit={handleAddNumber} className="flex gap-3">
                <input
                  type="text"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="Add number (+14155551234)"
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={addingNumber || !newNumber.trim()}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition disabled:opacity-50"
                >
                  {addingNumber ? "Adding..." : "Add"}
                </button>
              </form>
            </div>

            {/* Search existing numbers */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your numbers..."
                className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
              />
              <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Available Numbers */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Available ({availableNumbers.length})
              </h3>
              {availableNumbers.length === 0 ? (
                <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-500">
                  No available numbers. Add one above.
                </div>
              ) : (
                <div className="grid gap-2">
                  {availableNumbers.map((number) => (
                    <div key={number.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-mono">{number.number}</p>
                          {number.friendly_name && (
                            <p className="text-sm text-gray-500">{number.friendly_name}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteNumber(number.id)}
                        className="text-sm text-red-400 hover:text-red-300 px-3 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Numbers */}
            {assignedNumbers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Assigned ({assignedNumbers.length})
                </h3>
                <div className="grid gap-2">
                  {assignedNumbers.map((number) => (
                    <div key={number.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-mono">{number.number}</p>
                          <p className="text-sm text-gray-400">{number.user_email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnassignNumber(number.id)}
                        className="text-sm text-yellow-400 hover:text-yellow-300 px-3 py-1"
                      >
                        Unassign
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
