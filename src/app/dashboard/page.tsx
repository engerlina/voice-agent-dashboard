"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, User, VoiceStatus, MyPhoneNumber, AvailablePhoneNumber, Call, CallDetail } from "@/lib/api";

type SortField = "started_at" | "caller_number" | "direction" | "status" | "duration_seconds";
type SortDirection = "asc" | "desc";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "calls">("overview");
  const [isAdmin, setIsAdmin] = useState(false);

  // Phone number state
  const [myPhoneNumber, setMyPhoneNumber] = useState<MyPhoneNumber | null>(null);
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [showNumberPicker, setShowNumberPicker] = useState(false);

  // Document state
  const [docName, setDocName] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docMessage, setDocMessage] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Calls state
  const [calls, setCalls] = useState<Call[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallDetail | null>(null);
  const [callDetailLoading, setCallDetailLoading] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("started_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, statusData, phoneData, callsData] = await Promise.all([
          api.getMe(),
          api.getVoiceStatus(),
          api.getMyPhoneNumber(),
          api.getCalls(),
        ]);
        setUser(userData);
        setVoiceStatus(statusData);
        setMyPhoneNumber(phoneData);
        setCalls(callsData);

        // Check if user is admin
        try {
          const adminCheck = await api.checkAdmin();
          setIsAdmin(adminCheck.is_admin);
        } catch {
          // Not admin or endpoint not available
        }
      } catch (err) {
        api.clearToken();
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const loadAvailableNumbers = async () => {
    setPhoneLoading(true);
    try {
      const numbers = await api.getAvailablePhoneNumbers();
      setAvailableNumbers(numbers);
      setShowNumberPicker(true);
    } catch (err) {
      console.error("Failed to load numbers", err);
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleClaimNumber = async (numberId: string) => {
    setPhoneLoading(true);
    try {
      const claimed = await api.claimPhoneNumber(numberId);
      setMyPhoneNumber(claimed);
      setShowNumberPicker(false);
    } catch (err) {
      console.error("Failed to claim number", err);
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleReleaseNumber = async () => {
    if (!confirm("Are you sure you want to release this phone number? Callers will no longer be able to reach your agent.")) {
      return;
    }
    setPhoneLoading(true);
    try {
      await api.releasePhoneNumber();
      setMyPhoneNumber(null);
    } catch (err) {
      console.error("Failed to release number", err);
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearToken();
    router.push("/login");
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocLoading(true);
    setDocMessage("");

    try {
      await api.createDocument(docName, docContent);
      setDocMessage("Document added successfully!");
      setDocName("");
      setDocContent("");
    } catch (err) {
      setDocMessage(err instanceof Error ? err.message : "Failed to add document");
    } finally {
      setDocLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);

    try {
      const results = await api.searchDocuments(searchQuery);
      setSearchResults(results.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadCalls = async () => {
    setCallsLoading(true);
    try {
      const callsData = await api.getCalls();
      setCalls(callsData);
    } catch (err) {
      console.error("Failed to load calls", err);
    } finally {
      setCallsLoading(false);
    }
  };

  const loadCallDetail = async (callId: string) => {
    setCallDetailLoading(true);
    try {
      const callDetail = await api.getCall(callId);
      setSelectedCall(callDetail);
    } catch (err) {
      console.error("Failed to load call detail", err);
    } finally {
      setCallDetailLoading(false);
    }
  };

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedCalls = [...calls].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === "started_at") {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else if (sortField === "duration_seconds") {
      aVal = aVal || 0;
      bVal = bVal || 0;
    } else {
      aVal = aVal || "";
      bVal = bVal || "";
    }

    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const recentCalls = sortedCalls.slice(0, 5);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string | null, short = false) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (short) {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-slate-900">Voice Agent</h1>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-slate-500">{user?.email}</span>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/settings"
                className="text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-slate-100 p-1 rounded-lg w-fit">
          {["overview", "documents", "calls"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2 text-sm font-medium capitalize rounded-md transition ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Phone Number Section */}
            {myPhoneNumber ? (
              <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-primary-200 text-sm font-medium uppercase tracking-wide">Your Voice Agent</p>
                    <p className="text-4xl font-bold mt-2 tracking-tight">{myPhoneNumber.number}</p>
                    <p className="text-primary-200 text-sm mt-3">
                      {myPhoneNumber.webhook_configured
                        ? "Ready to receive calls"
                        : "Configuring webhooks..."}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <button
                      onClick={handleReleaseNumber}
                      disabled={phoneLoading}
                      className="text-sm text-primary-200 hover:text-white transition"
                    >
                      Change Number
                    </button>
                    <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : showNumberPicker ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Select a Phone Number</h2>
                  <button
                    onClick={() => setShowNumberPicker(false)}
                    className="text-slate-400 hover:text-slate-600 transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {availableNumbers.length === 0 ? (
                  <p className="text-slate-500">No phone numbers available. Contact support to add more.</p>
                ) : (
                  <div className="grid gap-3">
                    {availableNumbers.map((number) => (
                      <button
                        key={number.id}
                        onClick={() => handleClaimNumber(number.id)}
                        disabled={phoneLoading}
                        className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition disabled:opacity-50"
                      >
                        <div className="text-left">
                          <p className="text-lg font-semibold text-slate-900">{number.number}</p>
                          <p className="text-sm text-slate-500">
                            {number.country} {number.voice_enabled && "• Voice"} {number.sms_enabled && "• SMS"}
                          </p>
                        </div>
                        <span className="text-primary-600 font-medium">Select</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">Your Voice Agent</p>
                    <p className="text-2xl font-medium mt-2 text-slate-300">No number selected</p>
                    <p className="text-slate-400 text-sm mt-3">
                      Select a phone number to start receiving calls
                    </p>
                  </div>
                  <button
                    onClick={loadAvailableNumbers}
                    disabled={phoneLoading}
                    className="px-6 py-3 bg-white text-slate-900 rounded-xl font-medium hover:bg-slate-100 transition disabled:opacity-50 shadow-sm"
                  >
                    {phoneLoading ? "Loading..." : "Choose Number"}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions & Account Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-5">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link
                    href="/settings"
                    className="group flex flex-col items-center gap-3 p-5 border border-slate-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/50 transition"
                  >
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition">
                      <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-slate-900">Configure Agent</p>
                      <p className="text-xs text-slate-500 mt-0.5">Prompts & model</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => setActiveTab("documents")}
                    className="group flex flex-col items-center gap-3 p-5 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-slate-900">Add Knowledge</p>
                      <p className="text-xs text-slate-500 mt-0.5">Upload documents</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("calls")}
                    className="group flex flex-col items-center gap-3 p-5 border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition"
                  >
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-slate-900">View Calls</p>
                      <p className="text-xs text-slate-500 mt-0.5">Call history</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-5">Account</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                    <p className="text-slate-900 font-medium mt-1">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
                    <p className="text-slate-900 font-medium mt-1">{user?.full_name || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${user?.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {user?.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Calls Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-slate-900">Recent Calls</h2>
                <button
                  onClick={() => setActiveTab("calls")}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View all
                </button>
              </div>

              {calls.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <p>No calls yet. Your recent calls will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                        <th className="pb-3 font-medium">Direction</th>
                        <th className="pb-3 font-medium">Caller</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentCalls.map((call) => (
                        <tr
                          key={call.id}
                          onClick={() => {
                            loadCallDetail(call.id);
                            setActiveTab("calls");
                          }}
                          className="hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              call.direction === "inbound"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {call.direction === "inbound" ? (
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                              )}
                              {call.direction}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="font-medium text-slate-900">{call.caller_number || "Unknown"}</span>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              call.status === "completed"
                                ? "bg-slate-100 text-slate-700"
                                : call.status === "in_progress"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {call.status}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-slate-600">
                            {formatDate(call.started_at, true)}
                          </td>
                          <td className="py-3 text-sm text-slate-600 text-right font-mono">
                            {formatDuration(call.duration_seconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Document */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-5">Add Knowledge Document</h2>
              <form onSubmit={handleAddDocument} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    placeholder="e.g., Services FAQ"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
                  <textarea
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none h-40 resize-none transition"
                    placeholder="Enter the document content that the AI will use to answer questions..."
                    required
                  />
                </div>
                {docMessage && (
                  <p className={`text-sm ${docMessage.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
                    {docMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={docLoading}
                  className="w-full bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition"
                >
                  {docLoading ? "Adding..." : "Add Document"}
                </button>
              </form>
            </div>

            {/* Search Documents */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-5">Search Knowledge Base</h2>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Search Query</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    placeholder="e.g., What services do you offer?"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {searchLoading ? "Searching..." : "Search"}
                </button>
              </form>
              {searchResults.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-medium text-slate-900">Results:</h3>
                  {searchResults.map((result, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-600">{result.content}</p>
                      <p className="text-xs text-slate-400 mt-2">Similarity: {(result.similarity * 100).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calls Tab */}
        {activeTab === "calls" && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Call Table */}
            <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-slate-900">Call History</h2>
                <button
                  onClick={loadCalls}
                  disabled={callsLoading}
                  className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${callsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {callsLoading ? "Loading..." : "Refresh"}
                </button>
              </div>

              {callsLoading && calls.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : calls.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <p className="text-lg font-medium text-slate-700 mb-1">No calls yet</p>
                  <p>Make your first call to see the history here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                        <SortableHeader
                          label="Direction"
                          field="direction"
                          currentField={sortField}
                          direction={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Caller"
                          field="caller_number"
                          currentField={sortField}
                          direction={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Status"
                          field="status"
                          currentField={sortField}
                          direction={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Date & Time"
                          field="started_at"
                          currentField={sortField}
                          direction={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Duration"
                          field="duration_seconds"
                          currentField={sortField}
                          direction={sortDirection}
                          onSort={handleSort}
                          align="right"
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedCalls.map((call) => (
                        <tr
                          key={call.id}
                          onClick={() => loadCallDetail(call.id)}
                          className={`hover:bg-slate-50 cursor-pointer transition ${
                            selectedCall?.id === call.id ? "bg-primary-50" : ""
                          }`}
                        >
                          <td className="py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                              call.direction === "inbound"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {call.direction === "inbound" ? (
                                <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                              )}
                              {call.direction}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className="font-medium text-slate-900">{call.caller_number || "Unknown"}</span>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                              call.status === "completed"
                                ? "bg-slate-100 text-slate-700"
                                : call.status === "in_progress"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {call.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-sm text-slate-600">
                            {formatDate(call.started_at, true)}
                          </td>
                          <td className="py-3.5 text-sm text-slate-600 text-right font-mono">
                            {formatDuration(call.duration_seconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Call Detail */}
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              {callDetailLoading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : selectedCall ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-semibold text-slate-900">Call Details</h2>
                    <button
                      onClick={() => setSelectedCall(null)}
                      className="text-slate-400 hover:text-slate-600 transition"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Call Metadata */}
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Direction</p>
                      <p className="font-medium text-slate-900 capitalize mt-1">{selectedCall.direction}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                      <p className="font-medium text-slate-900 capitalize mt-1">{selectedCall.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Duration</p>
                      <p className="font-medium text-slate-900 mt-1">{formatDuration(selectedCall.duration_seconds)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Ended By</p>
                      <p className="font-medium text-slate-900 capitalize mt-1">{selectedCall.ended_by || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Caller</p>
                      <p className="font-medium text-slate-900 mt-1">{selectedCall.caller_number || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Called</p>
                      <p className="font-medium text-slate-900 mt-1">{selectedCall.callee_number || "Unknown"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Started</p>
                      <p className="font-medium text-slate-900 mt-1">{formatDate(selectedCall.started_at)}</p>
                    </div>
                  </div>

                  {/* Transcript */}
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Transcript</h3>
                  {selectedCall.transcripts.length === 0 ? (
                    <p className="text-slate-500 text-center py-8 text-sm">No transcript available for this call.</p>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {selectedCall.transcripts.map((transcript, index) => (
                        <div
                          key={index}
                          className={`flex ${transcript.speaker === "caller" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[85%] p-3 rounded-2xl ${
                              transcript.speaker === "caller"
                                ? "bg-slate-100 text-slate-900 rounded-tl-sm"
                                : "bg-primary-600 text-white rounded-tr-sm"
                            }`}
                          >
                            <p className={`text-xs font-medium mb-1 ${
                              transcript.speaker === "caller" ? "text-slate-500" : "text-primary-100"
                            }`}>
                              {transcript.speaker === "caller" ? "Caller" : "Agent"}
                            </p>
                            <p className="text-sm">{transcript.text}</p>
                            {transcript.confidence !== null && (
                              <p className={`text-xs mt-1.5 ${
                                transcript.speaker === "caller" ? "text-slate-400" : "text-primary-200"
                              }`}>
                                Confidence: {(transcript.confidence * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <p className="text-sm">Select a call to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  align = "left"
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  align?: "left" | "right";
}) {
  const isActive = currentField === field;

  return (
    <th
      className={`pb-3 font-medium cursor-pointer hover:text-slate-700 transition select-none ${
        align === "right" ? "text-right" : ""
      }`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`transition ${isActive ? "opacity-100" : "opacity-0"}`}>
          {direction === "asc" ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </span>
      </span>
    </th>
  );
}
