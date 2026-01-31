"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, User, VoiceStatus, MyPhoneNumber, AvailablePhoneNumber, SelectedRole } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "calls">("overview");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, statusData, phoneData] = await Promise.all([
          api.getMe(),
          api.getVoiceStatus(),
          api.getMyPhoneNumber(),
        ]);
        setUser(userData);
        setVoiceStatus(statusData);
        setMyPhoneNumber(phoneData);

        // Get the selected role from storage
        const storedRole = api.getSelectedRole();
        setSelectedRole(storedRole);

        // Check if user is admin
        try {
          const adminCheck = await api.checkAdmin();
          setIsAdmin(adminCheck.is_admin);

          // If no role is selected but user is admin, default to admin
          if (!storedRole && adminCheck.is_admin) {
            api.setSelectedRole('admin');
            setSelectedRole('admin');
          }
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

  const handleSwitchRole = (role: SelectedRole) => {
    api.setSelectedRole(role);
    setSelectedRole(role);
    setShowRoleSwitcher(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Voice Agent Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user?.email}</span>
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      selectedRole === 'admin'
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {selectedRole === 'admin' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Admin
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        User
                      </>
                    )}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showRoleSwitcher && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                      <button
                        onClick={() => handleSwitchRole('admin')}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                          selectedRole === 'admin' ? 'text-orange-600 bg-orange-50' : 'text-gray-700'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Admin Mode
                        {selectedRole === 'admin' && (
                          <svg className="w-4 h-4 ml-auto text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleSwitchRole('user')}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                          selectedRole === 'user' ? 'text-primary-600 bg-primary-50' : 'text-gray-700'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        User Mode
                        {selectedRole === 'user' && (
                          <svg className="w-4 h-4 ml-auto text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {isAdmin && selectedRole === 'admin' && (
                <Link
                  href="/admin"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          {["overview", "documents", "calls"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-medium capitalize transition border-b-2 -mb-px ${
                activeTab === tab
                  ? "text-primary-600 border-primary-600"
                  : "text-gray-600 border-transparent hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Phone Number Section */}
            {myPhoneNumber ? (
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-100 text-sm font-medium">Your Voice Agent Phone Number</p>
                    <p className="text-3xl font-bold mt-1">{myPhoneNumber.number}</p>
                    <p className="text-primary-100 text-sm mt-2">
                      {myPhoneNumber.webhook_configured
                        ? "Callers can reach your AI agent at this number"
                        : "Setting up webhooks..."}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleReleaseNumber}
                      disabled={phoneLoading}
                      className="text-sm text-primary-200 hover:text-white underline"
                    >
                      Change Number
                    </button>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : showNumberPicker ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Select a Phone Number</h2>
                  <button
                    onClick={() => setShowNumberPicker(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {availableNumbers.length === 0 ? (
                  <p className="text-gray-500">No phone numbers available. Contact support to add more.</p>
                ) : (
                  <div className="grid gap-3">
                    {availableNumbers.map((number) => (
                      <button
                        key={number.id}
                        onClick={() => handleClaimNumber(number.id)}
                        disabled={phoneLoading}
                        className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition disabled:opacity-50"
                      >
                        <div className="text-left">
                          <p className="text-lg font-semibold text-gray-900">{number.number}</p>
                          <p className="text-sm text-gray-500">
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
              <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm font-medium">Your Voice Agent Phone Number</p>
                    <p className="text-xl font-medium mt-1 text-gray-400">No number selected</p>
                    <p className="text-gray-400 text-sm mt-2">
                      Select a phone number to start receiving calls
                    </p>
                  </div>
                  <button
                    onClick={loadAvailableNumbers}
                    disabled={phoneLoading}
                    className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition disabled:opacity-50"
                  >
                    {phoneLoading ? "Loading..." : "Choose Number"}
                  </button>
                </div>
              </div>
            )}

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatusCard
                title="Voice Agent"
                status={voiceStatus?.enabled ? "Active" : "Inactive"}
                active={voiceStatus?.enabled}
                icon="microphone"
              />
              <StatusCard
                title="Speech-to-Text"
                status={voiceStatus?.stt_configured ? "Configured" : "Not configured"}
                active={voiceStatus?.stt_configured}
                icon="waveform"
              />
              <StatusCard
                title="Text-to-Speech"
                status={voiceStatus?.tts_configured ? "Configured" : "Not configured"}
                active={voiceStatus?.tts_configured}
                icon="speaker"
              />
              <StatusCard
                title="AI Model"
                status={voiceStatus?.llm_configured ? "Connected" : "Not connected"}
                active={voiceStatus?.llm_configured}
                icon="brain"
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href="/settings"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition"
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Configure Agent</p>
                    <p className="text-sm text-gray-500">Set prompts & model</p>
                  </div>
                </Link>
                <button
                  onClick={() => setActiveTab("documents")}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition text-left"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Add Knowledge</p>
                    <p className="text-sm text-gray-500">Upload documents</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("calls")}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition text-left"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">View Calls</p>
                    <p className="text-sm text-gray-500">Call history</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd className="text-gray-900 font-medium">{user?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Name</dt>
                  <dd className="text-gray-900 font-medium">{user?.full_name || "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Status</dt>
                  <dd>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user?.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {user?.is_active ? "Active" : "Inactive"}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Document */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Knowledge Document</h2>
              <form onSubmit={handleAddDocument} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g., Services FAQ"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none h-40"
                    placeholder="Enter the document content that the AI will use to answer questions..."
                    required
                  />
                </div>
                {docMessage && (
                  <p className={`text-sm ${docMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                    {docMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={docLoading}
                  className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {docLoading ? "Adding..." : "Add Document"}
                </button>
              </form>
            </div>

            {/* Search Documents */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Knowledge Base</h2>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Query</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g., What services do you offer?"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {searchLoading ? "Searching..." : "Search"}
                </button>
              </form>
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="font-medium text-gray-900">Results:</h3>
                  {searchResults.map((result, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">{result.content}</p>
                      <p className="text-xs text-gray-400 mt-1">Similarity: {(result.similarity * 100).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calls Tab */}
        {activeTab === "calls" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Call History</h2>
            <p className="text-gray-500">No calls yet. Make your first call to see the history here.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusCard({ title, status, active, icon }: { title: string; status: string; active?: boolean; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${active ? "bg-green-100" : "bg-gray-100"}`}>
          {icon === "microphone" && (
            <svg className={`w-6 h-6 ${active ? "text-green-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
          {icon === "waveform" && (
            <svg className={`w-6 h-6 ${active ? "text-green-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          )}
          {icon === "speaker" && (
            <svg className={`w-6 h-6 ${active ? "text-green-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
          {icon === "brain" && (
            <svg className={`w-6 h-6 ${active ? "text-green-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {status}
        </span>
      </div>
      <h3 className="font-medium text-gray-900">{title}</h3>
    </div>
  );
}
