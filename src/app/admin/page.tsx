"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, AdminStats, AdminUser, AdminPhoneNumber, TwilioAvailableNumber, AdminModelsResponse, ProviderModels } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "numbers" | "models">("overview");

  // Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<AdminPhoneNumber[]>([]);
  const [modelsData, setModelsData] = useState<AdminModelsResponse | null>(null);
  const [togglingModel, setTogglingModel] = useState<string | null>(null);

  // Add number form
  const [newNumber, setNewNumber] = useState("");
  const [addingNumber, setAddingNumber] = useState(false);

  // Search/filter
  const [searchQuery, setSearchQuery] = useState("");

  // Twilio number search
  const [twilioCountry, setTwilioCountry] = useState("AU");
  const [twilioAreaCode, setTwilioAreaCode] = useState("");
  const [twilioLocalNumbers, setTwilioLocalNumbers] = useState<TwilioAvailableNumber[]>([]);
  const [twilioMobileNumbers, setTwilioMobileNumbers] = useState<TwilioAvailableNumber[]>([]);
  const [twilioTollFreeNumbers, setTwilioTollFreeNumbers] = useState<TwilioAvailableNumber[]>([]);
  const [twilioSearching, setTwilioSearching] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);
  const [fixingWebhook, setFixingWebhook] = useState<string | null>(null);

  // Approximate Twilio prices by country/type
  const getPriceEstimate = (country: string, type: string) => {
    const prices: Record<string, Record<string, string>> = {
      US: { local: "$1.15/mo", mobile: "$1.15/mo", toll_free: "$2.15/mo" },
      CA: { local: "$1.15/mo", mobile: "$1.15/mo", toll_free: "$2.15/mo" },
      GB: { local: "$1.15/mo", mobile: "$5.00/mo", toll_free: "$3.00/mo" },
      AU: { local: "$3.50/mo", mobile: "$6.00/mo", toll_free: "$10.00/mo" },
    };
    return prices[country]?.[type] || "$1.00/mo";
  };

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
      // Load core admin data first
      const [statsData, usersData, numbersData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminPhoneNumbers(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setPhoneNumbers(numbersData);

      // Load models separately (may not be deployed yet)
      try {
        const models = await api.getAdminModels();
        setModelsData(models);
      } catch (modelsErr) {
        console.warn("Models endpoint not available yet", modelsErr);
        setModelsData(null);
      }
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

  const handleFixWebhook = async (numberId: string) => {
    setFixingWebhook(numberId);
    try {
      const result = await api.fixPhoneNumberWebhook(numberId);
      alert(`Webhook fixed! URL: ${result.webhook_url}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to fix webhook");
    } finally {
      setFixingWebhook(null);
    }
  };

  const handleSearchTwilio = async () => {
    setTwilioSearching(true);
    setTwilioLocalNumbers([]);
    setTwilioMobileNumbers([]);
    setTwilioTollFreeNumbers([]);

    try {
      // Fetch all three number types in parallel
      const [localNumbers, mobileNumbers, tollFreeNumbers] = await Promise.allSettled([
        api.searchTwilioNumbers(twilioCountry, twilioAreaCode || undefined, "local"),
        api.searchTwilioNumbers(twilioCountry, twilioAreaCode || undefined, "mobile"),
        api.searchTwilioNumbers(twilioCountry, twilioAreaCode || undefined, "toll_free"),
      ]);

      if (localNumbers.status === "fulfilled") setTwilioLocalNumbers(localNumbers.value);
      if (mobileNumbers.status === "fulfilled") setTwilioMobileNumbers(mobileNumbers.value);
      if (tollFreeNumbers.status === "fulfilled") setTwilioTollFreeNumbers(tollFreeNumbers.value);

      // Check if all failed
      const allFailed = localNumbers.status === "rejected" &&
                        mobileNumbers.status === "rejected" &&
                        tollFreeNumbers.status === "rejected";
      if (allFailed) {
        throw new Error("No numbers available for this country");
      }
    } catch (err: any) {
      alert(err.message || "Failed to search numbers. Check Twilio credentials.");
    } finally {
      setTwilioSearching(false);
    }
  };

  const handleBuyNumber = async (phoneNumber: string) => {
    if (!confirm(`Buy ${phoneNumber}? This will charge your Twilio account.`)) return;
    setBuyingNumber(phoneNumber);
    try {
      await api.buyTwilioNumber(phoneNumber);
      // Remove from all lists
      setTwilioLocalNumbers(nums => nums.filter(n => n.phone_number !== phoneNumber));
      setTwilioMobileNumbers(nums => nums.filter(n => n.phone_number !== phoneNumber));
      setTwilioTollFreeNumbers(nums => nums.filter(n => n.phone_number !== phoneNumber));
      await loadData();
      alert(`Successfully purchased ${phoneNumber}!`);
    } catch (err: any) {
      alert(err.message || "Failed to purchase number");
    } finally {
      setBuyingNumber(null);
    }
  };

  const handleToggleModel = async (provider: string, modelId: string, currentEnabled: boolean) => {
    setTogglingModel(`${provider}-${modelId}`);
    try {
      await api.toggleModel(provider, modelId, !currentEnabled);
      // Update local state optimistically
      setModelsData(prev => {
        if (!prev) return prev;
        return {
          providers: prev.providers.map(p => {
            if (p.provider !== provider) return p;
            return {
              ...p,
              models: p.models.map(m => {
                if (m.id !== modelId) return m;
                return { ...m, enabled: !currentEnabled };
              })
            };
          })
        };
      });
    } catch (err: any) {
      alert(err.message || "Failed to toggle model");
    } finally {
      setTogglingModel(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
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
            <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center">
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
          {(["overview", "users", "numbers", "models"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium capitalize transition border-b-2 -mb-px ${
                activeTab === tab
                  ? "text-brand-500 border-brand-500"
                  : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              {tab === "numbers" ? "Phone Numbers" : tab === "models" ? "AI Models" : tab}
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
                          <span className="px-2 py-0.5 bg-brand-500/20 text-brand-400 text-xs rounded">Admin</span>
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
              <div className="flex gap-3 mb-4 flex-wrap">
                <select
                  value={twilioCountry}
                  onChange={(e) => setTwilioCountry(e.target.value)}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-brand-500 focus:outline-none"
                >
                  <option value="AU">Australia</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                </select>
                <input
                  type="text"
                  value={twilioAreaCode}
                  onChange={(e) => setTwilioAreaCode(e.target.value)}
                  placeholder="Area code (optional)"
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none min-w-[120px]"
                />
                <button
                  onClick={handleSearchTwilio}
                  disabled={twilioSearching}
                  className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition disabled:opacity-50"
                >
                  {twilioSearching ? "Searching..." : "Search All Types"}
                </button>
              </div>

              {/* Twilio Results - All Types */}
              {(twilioLocalNumbers.length > 0 || twilioMobileNumbers.length > 0 || twilioTollFreeNumbers.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Local Numbers */}
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">Local</h4>
                      <span className="text-xs text-green-400">{getPriceEstimate(twilioCountry, "local")}</span>
                    </div>
                    {twilioLocalNumbers.length === 0 ? (
                      <p className="text-sm text-gray-500">Not available</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {twilioLocalNumbers.slice(0, 5).map((num) => (
                          <div key={num.phone_number} className="bg-gray-700 rounded p-2 flex items-center justify-between">
                            <div>
                              <p className="text-white font-mono text-sm">{num.phone_number}</p>
                              <p className="text-xs text-gray-400">{num.locality || num.region}</p>
                            </div>
                            <button
                              onClick={() => handleBuyNumber(num.phone_number)}
                              disabled={buyingNumber === num.phone_number}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition disabled:opacity-50"
                            >
                              {buyingNumber === num.phone_number ? "..." : "Buy"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mobile Numbers */}
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">Mobile</h4>
                      <span className="text-xs text-green-400">{getPriceEstimate(twilioCountry, "mobile")}</span>
                    </div>
                    {twilioMobileNumbers.length === 0 ? (
                      <p className="text-sm text-gray-500">Not available</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {twilioMobileNumbers.slice(0, 5).map((num) => (
                          <div key={num.phone_number} className="bg-gray-700 rounded p-2 flex items-center justify-between">
                            <div>
                              <p className="text-white font-mono text-sm">{num.phone_number}</p>
                              <p className="text-xs text-gray-400">{num.locality || num.region}</p>
                            </div>
                            <button
                              onClick={() => handleBuyNumber(num.phone_number)}
                              disabled={buyingNumber === num.phone_number}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition disabled:opacity-50"
                            >
                              {buyingNumber === num.phone_number ? "..." : "Buy"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Toll-Free Numbers */}
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">Toll-Free</h4>
                      <span className="text-xs text-green-400">{getPriceEstimate(twilioCountry, "toll_free")}</span>
                    </div>
                    {twilioTollFreeNumbers.length === 0 ? (
                      <p className="text-sm text-gray-500">Not available</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {twilioTollFreeNumbers.slice(0, 5).map((num) => (
                          <div key={num.phone_number} className="bg-gray-700 rounded p-2 flex items-center justify-between">
                            <div>
                              <p className="text-white font-mono text-sm">{num.phone_number}</p>
                              <p className="text-xs text-gray-400">{num.locality || num.region}</p>
                            </div>
                            <button
                              onClick={() => handleBuyNumber(num.phone_number)}
                              disabled={buyingNumber === num.phone_number}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition disabled:opacity-50"
                            >
                              {buyingNumber === num.phone_number ? "..." : "Buy"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
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
                className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFixWebhook(number.id)}
                          disabled={fixingWebhook === number.id}
                          className="text-sm text-blue-400 hover:text-blue-300 px-3 py-1 disabled:opacity-50"
                        >
                          {fixingWebhook === number.id ? "Fixing..." : "Fix Webhook"}
                        </button>
                        <button
                          onClick={() => handleUnassignNumber(number.id)}
                          className="text-sm text-yellow-400 hover:text-yellow-300 px-3 py-1"
                        >
                          Unassign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Models Tab */}
        {activeTab === "models" && !modelsData && (
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">AI Models Management</h3>
            <p className="text-gray-400">
              This feature requires the latest backend deployment. Please deploy the backend to enable model management.
            </p>
          </div>
        )}
        {activeTab === "models" && modelsData && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <p className="text-gray-400 mb-4">
                Control which AI models are available to all users. Disabled models will not appear in user settings.
              </p>
            </div>

            {modelsData.providers.map((provider) => (
              <div key={provider.provider} className="bg-gray-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
                  <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                    {provider.provider === "openai" ? (
                      <span className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
                        </svg>
                      </span>
                    ) : (
                      <span className="w-8 h-8 bg-brand-500/20 rounded-lg flex items-center justify-center text-brand-400">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                      </span>
                    )}
                    {provider.provider === "openai" ? "OpenAI" : "Anthropic"}
                  </h3>
                </div>
                <div className="divide-y divide-gray-700">
                  {provider.models.map((model) => (
                    <div key={model.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-750">
                      <div>
                        <p className="text-white font-medium">{model.name}</p>
                        <p className="text-sm text-gray-500 font-mono">{model.id}</p>
                      </div>
                      <button
                        onClick={() => handleToggleModel(provider.provider, model.id, model.enabled)}
                        disabled={togglingModel === `${provider.provider}-${model.id}`}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${
                          model.enabled ? "bg-brand-500" : "bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            model.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
