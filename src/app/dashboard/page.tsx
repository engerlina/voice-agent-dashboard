"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, User, VoiceStatus, MyPhoneNumber, AvailablePhoneNumber, Call, CallDetail, Invitation, TeamMember } from "@/lib/api";

type SortField = "started_at" | "caller_number" | "direction" | "status" | "duration_seconds";
type SortDirection = "asc" | "desc";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "calls" | "team">("overview");
  const [isAdmin, setIsAdmin] = useState(false);

  // Phone number state
  const [myPhoneNumber, setMyPhoneNumber] = useState<MyPhoneNumber | null>(null);
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [showNumberPicker, setShowNumberPicker] = useState(false);

  // Document state
  const [docName, setDocName] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docMessage, setDocMessage] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showCreateTextModal, setShowCreateTextModal] = useState(false);
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [importingUrl, setImportingUrl] = useState(false);
  const [urlError, setUrlError] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Calls state
  const [calls, setCalls] = useState<Call[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallDetail | null>(null);
  const [callDetailLoading, setCallDetailLoading] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("started_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

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

  // Load documents when switching to documents tab
  useEffect(() => {
    if (activeTab === "documents" && documents.length === 0) {
      loadDocuments();
    }
  }, [activeTab]);

  // Load team data when switching to team tab
  useEffect(() => {
    if (activeTab === "team" && teamMembers.length === 0) {
      loadTeamData();
    }
  }, [activeTab]);

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

  const loadDocuments = async () => {
    setDocsLoading(true);
    try {
      const docs = await api.listDocuments();
      setDocuments(docs || []);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await api.deleteDocument(docId);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      console.error("Failed to delete document", err);
    }
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
      setShowCreateTextModal(false);
      // Reload documents list
      loadDocuments();
    } catch (err) {
      setDocMessage(err instanceof Error ? err.message : "Failed to add document");
    } finally {
      setDocLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchPerformed(false);

    try {
      const results = await api.searchDocuments(searchQuery);
      setSearchResults(results.results || []);
      setSearchPerformed(true);
    } catch (err) {
      console.error(err);
      setSearchPerformed(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(extension)) {
      setUploadError(`Unsupported file type. Supported: ${validExtensions.join(', ')}`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 10MB.');
      return;
    }

    setUploadingFile(true);
    setUploadError("");

    try {
      await api.uploadDocument(file);
      setShowFileUploadModal(false);
      loadDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleUrlImport = async () => {
    if (!docUrl.trim()) return;

    setImportingUrl(true);
    setUrlError("");

    try {
      await api.importUrl(docUrl);
      setShowAddUrlModal(false);
      setDocUrl("");
      loadDocuments();
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to import URL');
    } finally {
      setImportingUrl(false);
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

  const loadTeamData = async () => {
    setTeamLoading(true);
    try {
      const [members, invites] = await Promise.all([
        api.getTeamMembers(),
        api.listInvitations(),
      ]);
      setTeamMembers(members);
      setInvitations(invites);
    } catch (err) {
      console.error("Failed to load team data", err);
    } finally {
      setTeamLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError("");

    try {
      await api.createInvitation({ email: inviteEmail, role: inviteRole });
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("user");
      loadTeamData();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;
    try {
      await api.revokeInvitation(invitationId);
      setInvitations(invitations.filter(i => i.id !== invitationId));
    } catch (err) {
      console.error("Failed to revoke invitation", err);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await api.resendInvitation(invitationId);
      alert("Invitation resent successfully");
    } catch (err) {
      console.error("Failed to resend invitation", err);
      alert("Failed to resend invitation");
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"></div>
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
              <Image
                src="/android-chrome-192x192.png"
                alt="VoxxCalls Logo"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <h1 className="text-lg font-semibold text-slate-900">VoxxCalls</h1>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-slate-500">{user?.email}</span>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
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
          {["overview", "documents", "calls", "team"].map((tab) => (
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
              <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-brand-200 text-sm font-medium uppercase tracking-wide">Your VoxxCalls</p>
                    <p className="text-4xl font-bold mt-2 tracking-tight">{myPhoneNumber.number}</p>
                    <p className="text-brand-200 text-sm mt-3">
                      {myPhoneNumber.webhook_configured
                        ? "Ready to receive calls"
                        : "Configuring webhooks..."}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <button
                      onClick={handleReleaseNumber}
                      disabled={phoneLoading}
                      className="text-sm text-brand-200 hover:text-white transition"
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
                        className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition disabled:opacity-50"
                      >
                        <div className="text-left">
                          <p className="text-lg font-semibold text-slate-900">{number.number}</p>
                          <p className="text-sm text-slate-500">
                            {number.country} {number.voice_enabled && "• Voice"} {number.sms_enabled && "• SMS"}
                          </p>
                        </div>
                        <span className="text-brand-600 font-medium">Select</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">Your VoxxCalls</p>
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
                    className="group flex flex-col items-center gap-3 p-5 border border-slate-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/50 transition"
                  >
                    <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center group-hover:bg-brand-200 transition">
                      <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
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
                            <span className="inline-flex items-center gap-2">
                              {call.recording_url && (
                                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                              )}
                              {formatDuration(call.duration_seconds)}
                            </span>
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

        {/* Documents Tab - Knowledge Base */}
        {activeTab === "documents" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold text-slate-900">Knowledge Base</h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span className="text-slate-600">RAG Storage: <span className="font-medium text-slate-900">{documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0)} chunks</span></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={() => setShowAddUrlModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Add URL</span>
                </button>
                <button
                  onClick={() => setShowFileUploadModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Add Files</span>
                </button>
                <button
                  onClick={() => setShowCreateTextModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Create Text</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    placeholder="Search Knowledge Base..."
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                >
                  {searchLoading ? "..." : "Search"}
                </button>
              </div>

              {/* Search Results */}
              {searchPerformed && searchResults.length === 0 && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-slate-900">Search Results</h3>
                    <button onClick={() => setSearchPerformed(false)} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
                  </div>
                  <p className="text-sm text-slate-500">No matching content found for "{searchQuery}". Try a different search term.</p>
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-900">Search Results ({searchResults.length})</h3>
                    <button onClick={() => { setSearchResults([]); setSearchPerformed(false); }} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((result, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg border border-slate-100">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-slate-600 line-clamp-2">{result.content}</p>
                          <span className="text-xs font-medium text-emerald-600 whitespace-nowrap">{result.similarity}%</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{result.document_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Documents Table */}
            <div className="p-6">
              {docsLoading && documents.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-600"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium text-slate-700 mb-1">No documents yet</p>
                  <p className="text-sm">Add your first document using the buttons above.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Last updated</th>
                      <th className="pb-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50 group">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{doc.name}</p>
                              <p className="text-xs text-slate-500">{doc.chunk_count} chunks</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                            doc.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                            doc.status === 'processing' ? 'bg-amber-50 text-amber-700' :
                            doc.status === 'failed' ? 'bg-red-50 text-red-700' :
                            'bg-slate-50 text-slate-700'
                          }`}>
                            {doc.status === 'completed' && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>}
                            {doc.status === 'processing' && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>}
                            {doc.status === 'failed' && <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-slate-500">
                          {new Date(doc.updated_at || doc.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-4">
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Create Text Modal */}
            {showCreateTextModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-900">Create Text Document</h2>
                      <button onClick={() => setShowCreateTextModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <form onSubmit={(e) => { handleAddDocument(e); setShowCreateTextModal(false); }} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Name</label>
                      <input
                        type="text"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        placeholder="e.g., Services FAQ"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
                      <textarea
                        value={docContent}
                        onChange={(e) => setDocContent(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none h-48 resize-none"
                        placeholder="Enter the document content that the AI will use to answer questions..."
                        required
                      />
                    </div>
                    {docMessage && (
                      <p className={`text-sm ${docMessage.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
                        {docMessage}
                      </p>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateTextModal(false)}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={docLoading}
                        className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                      >
                        {docLoading ? "Creating..." : "Create Document"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add URL Modal */}
            {showAddUrlModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-900">Add URL</h2>
                      <button
                        onClick={() => {
                          setShowAddUrlModal(false);
                          setUrlError("");
                          setDocUrl("");
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                      >
                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">URL</label>
                      <input
                        type="url"
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        placeholder="https://example.com/page"
                        disabled={importingUrl}
                      />
                    </div>
                    <p className="text-sm text-slate-500">
                      Enter a URL and we&apos;ll fetch and process the content automatically.
                    </p>
                    {urlError && (
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {urlError}
                      </p>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddUrlModal(false);
                          setUrlError("");
                          setDocUrl("");
                        }}
                        disabled={importingUrl}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!docUrl.trim() || importingUrl}
                        onClick={handleUrlImport}
                        className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                      >
                        {importingUrl ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            Importing...
                          </span>
                        ) : (
                          "Add URL"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File Upload Modal */}
            {showFileUploadModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-900">Upload Files</h2>
                      <button
                        onClick={() => {
                          setShowFileUploadModal(false);
                          setUploadError("");
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                      >
                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    {/* Drag & Drop Zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition ${
                        dragActive
                          ? "border-brand-500 bg-brand-50"
                          : "border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <input
                        type="file"
                        id="file-upload"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        disabled={uploadingFile}
                      />
                      <div className="flex flex-col items-center">
                        {uploadingFile ? (
                          <>
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600 mb-4"></div>
                            <p className="text-sm font-medium text-slate-900">Uploading...</p>
                          </>
                        ) : (
                          <>
                            <svg className="w-12 h-12 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm font-medium text-slate-900 mb-1">
                              Drag and drop your file here
                            </p>
                            <p className="text-sm text-slate-500 mb-3">or click to browse</p>
                            <p className="text-xs text-slate-400">
                              Supported: PDF, DOCX, TXT, MD (max 10MB)
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {uploadError && (
                      <p className="mt-4 text-sm text-red-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {uploadError}
                      </p>
                    )}

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFileUploadModal(false);
                          setUploadError("");
                        }}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                  className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${callsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {callsLoading ? "Loading..." : "Refresh"}
                </button>
              </div>

              {callsLoading && calls.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-600"></div>
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
                            selectedCall?.id === call.id ? "bg-brand-50" : ""
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
                            <span className="inline-flex items-center gap-2">
                              {call.recording_url && (
                                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                              )}
                              {formatDuration(call.duration_seconds)}
                            </span>
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
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-600"></div>
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

                  {/* Recording Player */}
                  {selectedCall.recording_url && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        Call Recording
                      </h3>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <audio
                          controls
                          className="w-full"
                          src={selectedCall.recording_url}
                        >
                          Your browser does not support the audio element.
                        </audio>
                        <a
                          href={selectedCall.recording_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download Recording
                        </a>
                      </div>
                    </div>
                  )}

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
                                : "bg-brand-600 text-white rounded-tr-sm"
                            }`}
                          >
                            <p className={`text-xs font-medium mb-1 ${
                              transcript.speaker === "caller" ? "text-slate-500" : "text-brand-100"
                            }`}>
                              {transcript.speaker === "caller" ? "Caller" : "Agent"}
                            </p>
                            <p className="text-sm">{transcript.text}</p>
                            {transcript.confidence !== null && (
                              <p className={`text-xs mt-1.5 ${
                                transcript.speaker === "caller" ? "text-slate-400" : "text-brand-200"
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

        {/* Team Tab */}
        {activeTab === "team" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Team Members</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Manage your organization&apos;s team members and invitations
                </p>
              </div>
              {user?.current_tenant?.role === "admin" && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Invite Member
                </button>
              )}
            </div>

            {/* Team Members Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-5">Members</h2>

              {teamLoading && teamMembers.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-600"></div>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p>No team members yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                        <th className="pb-3 font-medium">Member</th>
                        <th className="pb-3 font-medium">Role</th>
                        <th className="pb-3 font-medium">Joined</th>
                        <th className="pb-3 font-medium">Invited By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                                <span className="text-brand-700 font-medium">
                                  {(member.full_name || member.email)[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{member.full_name || "No name"}</p>
                                <p className="text-sm text-slate-500">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              member.role === "admin"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {member.role === "admin" ? "Admin" : "Member"}
                            </span>
                          </td>
                          <td className="py-4 text-sm text-slate-600">
                            {new Date(member.joined_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-4 text-sm text-slate-500">
                            {member.invited_by ? member.invited_by.email : "Organization creator"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pending Invitations */}
            {user?.current_tenant?.role === "admin" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-slate-900">Pending Invitations</h2>
                  <button
                    onClick={loadTeamData}
                    disabled={teamLoading}
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                {invitations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-sm">No pending invitations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{invitation.email}</p>
                            <p className="text-xs text-slate-500">
                              Invited as {invitation.role === "admin" ? "Admin" : "Member"} • Expires{" "}
                              {new Date(invitation.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-900">Invite Team Member</h2>
                      <button
                        onClick={() => {
                          setShowInviteModal(false);
                          setInviteError("");
                          setInviteEmail("");
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                      >
                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleInvite} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        placeholder="colleague@example.com"
                        required
                        disabled={inviteLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setInviteRole("user")}
                          className={`p-3 rounded-lg border-2 text-left transition ${
                            inviteRole === "user"
                              ? "border-brand-500 bg-brand-50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <p className="font-medium text-slate-900">Member</p>
                          <p className="text-xs text-slate-500 mt-0.5">Can view and use features</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInviteRole("admin")}
                          className={`p-3 rounded-lg border-2 text-left transition ${
                            inviteRole === "admin"
                              ? "border-brand-500 bg-brand-50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <p className="font-medium text-slate-900">Admin</p>
                          <p className="text-xs text-slate-500 mt-0.5">Full access & settings</p>
                        </button>
                      </div>
                    </div>
                    {inviteError && (
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {inviteError}
                      </p>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowInviteModal(false);
                          setInviteError("");
                          setInviteEmail("");
                        }}
                        disabled={inviteLoading}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={inviteLoading || !inviteEmail.trim()}
                        className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                      >
                        {inviteLoading ? "Sending..." : "Send Invitation"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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
