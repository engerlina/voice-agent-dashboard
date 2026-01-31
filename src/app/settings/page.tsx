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

  // Form state for API keys (since we only show if they're set, not the actual value)
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [deepgramKey, setDeepgramKey] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [livekitApiKey, setLivekitApiKey] = useState("");
  const [livekitApiSecret, setLivekitApiSecret] = useState("");

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
        setLivekitUrl(settingsData.livekit_url || "");
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
      setSuccess("Settings saved successfully!");
      // Clear API key inputs after save
      setOpenaiKey("");
      setAnthropicKey("");
      setDeepgramKey("");
      setElevenlabsKey("");
      setLivekitApiKey("");
      setLivekitApiSecret("");
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
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

        {/* LLM Configuration */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Model Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LLM Provider
              </label>
              <select
                value={settings?.llm_provider || "openai"}
                onChange={(e) => handleSave({ llm_provider: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={saving}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                value={settings?.llm_model || "gpt-4-turbo-preview"}
                onChange={(e) => handleSave({ llm_model: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key {settings?.openai_api_key_set && <span className="text-green-600">(Set)</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder={settings?.openai_api_key_set ? "••••••••" : "sk-..."}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={() => openaiKey && handleSave({ openai_api_key: openaiKey })}
                  disabled={!openaiKey || saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anthropic API Key {settings?.anthropic_api_key_set && <span className="text-green-600">(Set)</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder={settings?.anthropic_api_key_set ? "••••••••" : "sk-ant-..."}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={() => anthropicKey && handleSave({ anthropic_api_key: anthropicKey })}
                  disabled={!anthropicKey || saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Voice Configuration */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Voice Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speech-to-Text Provider
              </label>
              <select
                value={settings?.stt_provider || "deepgram"}
                onChange={(e) => handleSave({ stt_provider: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={saving}
              >
                <option value="deepgram">Deepgram</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deepgram API Key {settings?.deepgram_api_key_set && <span className="text-green-600">(Set)</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={deepgramKey}
                  onChange={(e) => setDeepgramKey(e.target.value)}
                  placeholder={settings?.deepgram_api_key_set ? "••••••••" : "Enter API key"}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={() => deepgramKey && handleSave({ deepgram_api_key: deepgramKey })}
                  disabled={!deepgramKey || saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text-to-Speech Provider
              </label>
              <select
                value={settings?.tts_provider || "elevenlabs"}
                onChange={(e) => handleSave({ tts_provider: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={saving}
              >
                <option value="elevenlabs">ElevenLabs</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ElevenLabs API Key {settings?.elevenlabs_api_key_set && <span className="text-green-600">(Set)</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={elevenlabsKey}
                  onChange={(e) => setElevenlabsKey(e.target.value)}
                  placeholder={settings?.elevenlabs_api_key_set ? "••••••••" : "Enter API key"}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={() => elevenlabsKey && handleSave({ elevenlabs_api_key: elevenlabsKey })}
                  disabled={!elevenlabsKey || saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ElevenLabs Voice ID
              </label>
              <input
                type="text"
                value={settings?.elevenlabs_voice_id || ""}
                onChange={(e) => handleSave({ elevenlabs_voice_id: e.target.value })}
                placeholder="21m00Tcm4TlvDq8ikWAM"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* LiveKit Configuration */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            LiveKit Configuration
            {settings?.livekit_configured && (
              <span className="ml-2 text-sm font-normal text-green-600">(Configured)</span>
            )}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LiveKit URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={livekitUrl}
                  onChange={(e) => setLivekitUrl(e.target.value)}
                  placeholder="wss://your-project.livekit.cloud"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={() => livekitUrl && handleSave({ livekit_url: livekitUrl })}
                  disabled={!livekitUrl || saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LiveKit API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={livekitApiKey}
                  onChange={(e) => setLivekitApiKey(e.target.value)}
                  placeholder="API..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={() => livekitApiKey && handleSave({ livekit_api_key: livekitApiKey })}
                  disabled={!livekitApiKey || saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LiveKit API Secret
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={livekitApiSecret}
                  onChange={(e) => setLivekitApiSecret(e.target.value)}
                  placeholder="Enter secret"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={() => livekitApiSecret && handleSave({ livekit_api_secret: livekitApiSecret })}
                  disabled={!livekitApiSecret || saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Agent Behavior */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Behavior</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <textarea
                value={settings?.system_prompt || ""}
                onChange={(e) => handleSave({ system_prompt: e.target.value })}
                placeholder="You are a helpful voice assistant..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Message
              </label>
              <input
                type="text"
                value={settings?.welcome_message || ""}
                onChange={(e) => handleSave({ welcome_message: e.target.value })}
                placeholder="Hello! How can I help you today?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Conversation Turns
              </label>
              <input
                type="number"
                value={settings?.max_conversation_turns || 50}
                onChange={(e) => handleSave({ max_conversation_turns: parseInt(e.target.value) })}
                min={1}
                max={200}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">Enable RAG (Document Search)</span>
              <button
                onClick={() => handleSave({ rag_enabled: !settings?.rag_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.rag_enabled ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.rag_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700">Enable Call Recording</span>
              <button
                onClick={() => handleSave({ call_recording_enabled: !settings?.call_recording_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.call_recording_enabled ? "bg-primary-600" : "bg-gray-300"
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
