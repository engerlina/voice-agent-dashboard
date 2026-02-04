"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, Settings, AvailableModels } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [models, setModels] = useState<AvailableModels | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    Promise.all([api.getSettings(), api.getAvailableModels()])
      .then(([settingsData, modelsData]) => {
        setSettings(settingsData);
        setModels(modelsData);
      })
      .catch((err) => {
        if (err.message.includes("credentials")) {
          api.clearToken();
          router.push("/login");
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async (updates: Record<string, any>) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updatedSettings = await api.updateSettings(updates);
      setSettings(updatedSettings);
      setSuccess("Settings saved!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    api.clearToken();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Agent Behavior - Top Priority */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Behavior</h2>
          <p className="text-sm text-gray-500 mb-4">Configure how your voice agent interacts with callers.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Define the agent's personality, knowledge, and instructions. This is the core prompt that shapes all responses.
              </p>
              <textarea
                value={settings?.system_prompt || ""}
                onChange={(e) => handleSave({ system_prompt: e.target.value })}
                placeholder="You are a helpful customer service agent for [Company Name]. You help customers with questions about products, orders, and general inquiries. Be friendly, professional, and concise."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Message
              </label>
              <p className="text-xs text-gray-500 mb-2">
                The first message the agent says when a call connects.
              </p>
              <input
                type="text"
                value={settings?.welcome_message || ""}
                onChange={(e) => handleSave({ welcome_message: e.target.value })}
                placeholder="Hello! Thanks for calling. How can I help you today?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Conversation Turns
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Maximum back-and-forth exchanges before the agent ends the call.
              </p>
              <input
                type="number"
                value={settings?.max_conversation_turns || 50}
                onChange={(e) => handleSave({ max_conversation_turns: parseInt(e.target.value) })}
                min={5}
                max={200}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* AI Model Selection */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Model</h2>
          <p className="text-sm text-gray-500 mb-4">Choose which AI model powers your voice agent.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LLM Provider
              </label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition ${
                  settings?.llm_provider === "openai" ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="radio"
                    name="llm_provider"
                    value="openai"
                    checked={settings?.llm_provider === "openai"}
                    onChange={(e) => handleSave({ llm_provider: e.target.value, llm_model: "gpt-4-turbo-preview" })}
                    className="sr-only"
                  />
                  <span className="font-medium">OpenAI</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition ${
                  settings?.llm_provider === "anthropic" ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="radio"
                    name="llm_provider"
                    value="anthropic"
                    checked={settings?.llm_provider === "anthropic"}
                    onChange={(e) => handleSave({ llm_provider: e.target.value, llm_model: "claude-3-sonnet-20240229" })}
                    className="sr-only"
                  />
                  <span className="font-medium">Anthropic</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                value={settings?.llm_model || "gpt-4-turbo-preview"}
                onChange={(e) => handleSave({ llm_model: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                disabled={saving}
              >
                {settings?.llm_provider === "anthropic" ? (
                  models?.anthropic.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))
                ) : (
                  models?.openai.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))
                )}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {settings?.llm_provider === "anthropic"
                  ? "Claude 3 Opus is most capable, Sonnet is balanced, Haiku is fastest."
                  : "GPT-4 Turbo is recommended for best quality. GPT-3.5 is faster but less capable."}
              </p>
            </div>
          </div>
        </section>

        {/* Voice Settings */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Voice Settings</h2>
          <p className="text-sm text-gray-500 mb-4">Configure the voice used for text-to-speech.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ElevenLabs Voice ID
            </label>
            <input
              type="text"
              value={settings?.elevenlabs_voice_id || ""}
              onChange={(e) => handleSave({ elevenlabs_voice_id: e.target.value })}
              placeholder="21m00Tcm4TlvDq8ikWAM"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2">
              Find voice IDs at <a href="https://elevenlabs.io/voice-library" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">ElevenLabs Voice Library</a>
            </p>
          </div>
        </section>

        {/* Language Settings */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Language Settings</h2>
          <p className="text-sm text-gray-500 mb-4">Configure language support for your voice agent.</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">Auto-Detect Language</span>
                <p className="text-sm text-gray-500">Automatically detect and respond in the caller's language.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    handleSave({ auto_detect_language: settings?.auto_detect_language === true ? false : true });
                  }
                }}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  saving ? "opacity-50 cursor-not-allowed" : ""
                } ${
                  settings?.auto_detect_language === true ? "bg-brand-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.auto_detect_language === true ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {settings?.auto_detect_language !== true && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Language
                </label>
                <select
                  value={settings?.language || "en"}
                  onChange={(e) => handleSave({ language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  disabled={saving}
                >
                  <option value="en">English (Australian)</option>
                  <option value="en-us">English (US)</option>
                  <option value="en-gb">English (UK)</option>
                  <option value="zh">Mandarin Chinese</option>
                  <option value="yue">Cantonese</option>
                  <option value="vi">Vietnamese</option>
                  <option value="ar">Arabic</option>
                  <option value="el">Greek</option>
                  <option value="it">Italian</option>
                  <option value="hi">Hindi</option>
                  <option value="tl">Tagalog</option>
                  <option value="es">Spanish</option>
                  <option value="ko">Korean</option>
                  <option value="ja">Japanese</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  The agent will speak and listen in this language.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Response Speed */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Speed</h2>
          <p className="text-sm text-gray-500 mb-4">Control how quickly the agent responds after the caller stops speaking.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Delay
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-16">Faster</span>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={settings?.min_silence_duration || 0.4}
                  onChange={(e) => handleSave({ min_silence_duration: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <span className="text-sm text-gray-500 w-16 text-right">Slower</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>0.2s</span>
                <span className="font-medium text-gray-600">{(settings?.min_silence_duration || 0.4).toFixed(2)}s</span>
                <span>1.0s</span>
              </div>
              <p className="text-xs text-gray-500">
                Lower values make the agent respond faster but may interrupt the caller. Higher values wait longer to ensure the caller has finished speaking.
                <span className="block mt-1 text-gray-400">Recommended: 0.30-0.50s for natural conversation</span>
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">RAG (Document Search)</span>
                <p className="text-sm text-gray-500">Let the agent search your knowledge base to answer questions.</p>
              </div>
              <button
                onClick={() => handleSave({ rag_enabled: !settings?.rag_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.rag_enabled ? "bg-brand-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.rag_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">Call Recording</span>
                <p className="text-sm text-gray-500">Record calls for quality assurance and training.</p>
              </div>
              <button
                onClick={() => handleSave({ call_recording_enabled: !settings?.call_recording_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.call_recording_enabled ? "bg-brand-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.call_recording_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          </div>
        </section>
      </main>
    </div>
  );
}
