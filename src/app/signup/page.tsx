"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, InviteValidation } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    organizationName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingInvite, setValidatingInvite] = useState(!!inviteToken);
  const [inviteData, setInviteData] = useState<InviteValidation | null>(null);
  const [inviteError, setInviteError] = useState("");

  // Validate invite token on mount
  useEffect(() => {
    if (!inviteToken) return;

    const validateToken = async () => {
      try {
        const data = await api.validateInviteToken(inviteToken);
        if (data.valid) {
          setInviteData(data);
          setFormData((prev) => ({ ...prev, email: data.email }));
        } else {
          setInviteError("This invitation link is no longer valid.");
        }
      } catch (err) {
        setInviteError(
          err instanceof Error ? err.message : "Invalid invitation link"
        );
      } finally {
        setValidatingInvite(false);
      }
    };

    validateToken();
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.signup(
        formData.email,
        formData.password,
        formData.fullName,
        inviteToken ? undefined : formData.organizationName,
        inviteToken || undefined
      );
      api.setToken(response.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while validating invite
  if (validatingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Show error if invite validation failed
  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{inviteError}</p>
          <Link
            href="/signup"
            className="inline-block bg-brand-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-brand-700 transition"
          >
            Create New Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Image
              src="/android-chrome-192x192.png"
              alt="VoxxCalls Logo"
              width={80}
              height={80}
              className="mx-auto mb-4"
            />
            {inviteData ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Join {inviteData.tenant_name}</h1>
                <p className="text-gray-600 mt-2">
                  You&apos;ve been invited by {inviteData.invited_by} to join as {inviteData.role === "admin" ? "an Admin" : "a Team Member"}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
                <p className="text-gray-600 mt-2">Get started with VoxxCalls</p>
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => !inviteData && setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition ${
                  inviteData ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""
                }`}
                placeholder="you@example.com"
                required
                readOnly={!!inviteData}
              />
              {inviteData && (
                <p className="text-xs text-gray-500 mt-1">Email is pre-filled from your invitation</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            {!inviteData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                  placeholder="My Clinic"
                  required
                  minLength={2}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-700 focus:ring-4 focus:ring-brand-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : inviteData ? "Join Team" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
