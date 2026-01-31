"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, User, VoiceStatus } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "calls">("overview");

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
        const [userData, statusData] = await Promise.all([
          api.getMe(),
          api.getVoiceStatus(),
        ]);
        setUser(userData);
        setVoiceStatus(statusData);
      } catch (err) {
        api.clearToken();
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

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

            {/* User Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <dd className="text-gray-900 font-medium">
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
