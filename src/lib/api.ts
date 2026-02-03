const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-66de.up.railway.app';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

export interface VoiceStatus {
  enabled: boolean;
  livekit_configured: boolean;
  stt_configured: boolean;
  tts_configured: boolean;
  llm_configured: boolean;
  telephony_configured: boolean;
  phone_number: string | null;
  phone_number_masked: string | null;
}

export interface Settings {
  llm_provider: string;
  llm_model: string;
  elevenlabs_voice_id: string;
  system_prompt: string | null;
  welcome_message: string;
  max_conversation_turns: number;
  rag_enabled: boolean;
  call_recording_enabled: boolean;
}

export interface SettingsUpdate {
  llm_provider?: string;
  llm_model?: string;
  elevenlabs_voice_id?: string;
  system_prompt?: string;
  welcome_message?: string;
  max_conversation_turns?: number;
  rag_enabled?: boolean;
  call_recording_enabled?: boolean;
}

export interface AvailableModels {
  openai: string[];
  anthropic: string[];
}

export interface AvailablePhoneNumber {
  id: string;
  number: string;
  friendly_name: string | null;
  country: string;
  voice_enabled: boolean;
  sms_enabled: boolean;
  is_available: boolean;
  is_mine: boolean;
}

export interface MyPhoneNumber {
  id: string;
  number: string;
  friendly_name: string | null;
  country: string;
  assigned_at: string;
  webhook_configured: boolean;
}

// Admin types
export interface AdminStats {
  total_users: number;
  active_users: number;
  total_phone_numbers: number;
  assigned_phone_numbers: number;
  available_phone_numbers: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  tenant_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  phone_number: string | null;
}

export interface AdminPhoneNumber {
  id: string;
  number: string;
  twilio_sid: string | null;
  friendly_name: string | null;
  country: string;
  voice_enabled: boolean;
  sms_enabled: boolean;
  is_active: boolean;
  user_id: string | null;
  user_email: string | null;
  assigned_at: string | null;
  webhook_configured: boolean;
  created_at: string;
}

export interface TwilioAvailableNumber {
  phone_number: string;
  friendly_name: string;
  locality: string | null;
  region: string | null;
  country: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

// Call types
export interface CallTranscript {
  speaker: string;
  text: string;
  confidence: number | null;
  start_time_ms: number;
  end_time_ms: number;
}

export interface Call {
  id: string;
  direction: string;
  status: string;
  caller_number: string | null;
  callee_number: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  agent_response_count: number;
}

export interface CallDetail extends Call {
  room_name: string;
  call_sid: string | null;
  ended_by: string | null;
  transcripts: CallTranscript[];
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async signup(email: string, password: string, fullName: string, tenantName: string): Promise<AuthResponse> {
    return this.fetch('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        tenant_name: tenantName,
      }),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.fetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe(): Promise<User> {
    return this.fetch('/api/v1/auth/me');
  }

  // Voice
  async getVoiceStatus(): Promise<VoiceStatus> {
    return this.fetch('/api/v1/voice/status');
  }

  async getLiveKitToken(roomName: string, participantName: string): Promise<{ token: string; room_name: string; url: string }> {
    return this.fetch('/api/v1/voice/livekit/token', {
      method: 'POST',
      body: JSON.stringify({
        room_name: roomName,
        participant_name: participantName,
      }),
    });
  }

  // Documents
  async createDocument(name: string, content: string, description?: string): Promise<any> {
    return this.fetch('/api/v1/voice/documents', {
      method: 'POST',
      body: JSON.stringify({ name, content, description }),
    });
  }

  async searchDocuments(query: string, topK: number = 5): Promise<any> {
    return this.fetch('/api/v1/voice/documents/search', {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK }),
    });
  }

  // Settings
  async getSettings(): Promise<Settings> {
    return this.fetch('/api/v1/settings');
  }

  async updateSettings(settings: SettingsUpdate): Promise<Settings> {
    return this.fetch('/api/v1/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getAvailableModels(): Promise<AvailableModels> {
    return this.fetch('/api/v1/settings/models');
  }

  // Phone Numbers
  async getAvailablePhoneNumbers(): Promise<AvailablePhoneNumber[]> {
    return this.fetch('/api/v1/phone-numbers/available');
  }

  async getMyPhoneNumber(): Promise<MyPhoneNumber | null> {
    return this.fetch('/api/v1/phone-numbers/mine');
  }

  async claimPhoneNumber(phoneNumberId: string): Promise<MyPhoneNumber> {
    return this.fetch('/api/v1/phone-numbers/claim', {
      method: 'POST',
      body: JSON.stringify({ phone_number_id: phoneNumberId }),
    });
  }

  async releasePhoneNumber(): Promise<void> {
    return this.fetch('/api/v1/phone-numbers/release', {
      method: 'POST',
    });
  }

  // Admin
  async checkAdmin(): Promise<{ is_admin: boolean; email: string }> {
    return this.fetch('/api/v1/admin/check');
  }

  async getAdminStats(): Promise<AdminStats> {
    return this.fetch('/api/v1/admin/stats');
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    return this.fetch('/api/v1/admin/users');
  }

  async updateUser(userId: string, updates: { is_active?: boolean; is_admin?: boolean }): Promise<void> {
    return this.fetch(`/api/v1/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getAdminPhoneNumbers(): Promise<AdminPhoneNumber[]> {
    return this.fetch('/api/v1/admin/phone-numbers');
  }

  async addPhoneNumber(data: {
    number: string;
    twilio_sid?: string;
    friendly_name?: string;
    country?: string;
  }): Promise<AdminPhoneNumber> {
    return this.fetch('/api/v1/admin/phone-numbers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePhoneNumber(numberId: string): Promise<void> {
    return this.fetch(`/api/v1/admin/phone-numbers/${numberId}`, {
      method: 'DELETE',
    });
  }

  async unassignPhoneNumber(numberId: string): Promise<void> {
    return this.fetch(`/api/v1/admin/phone-numbers/${numberId}/unassign`, {
      method: 'POST',
    });
  }

  async fixPhoneNumberWebhook(numberId: string): Promise<{ message: string; webhook_url: string }> {
    return this.fetch(`/api/v1/admin/phone-numbers/${numberId}/fix-webhook`, {
      method: 'POST',
    });
  }

  // Twilio number search & purchase
  async searchTwilioNumbers(country: string = 'US', areaCode?: string, numberType: string = 'local'): Promise<TwilioAvailableNumber[]> {
    const params = new URLSearchParams({ country, number_type: numberType });
    if (areaCode) params.append('area_code', areaCode);
    return this.fetch(`/api/v1/admin/twilio/available?${params.toString()}`);
  }

  async buyTwilioNumber(phoneNumber: string): Promise<{ message: string; number: string; sid: string }> {
    return this.fetch('/api/v1/admin/twilio/buy', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  }

  // Calls
  async getCalls(limit: number = 50, offset: number = 0): Promise<Call[]> {
    return this.fetch(`/api/v1/calls?limit=${limit}&offset=${offset}`);
  }

  async getCall(callId: string): Promise<CallDetail> {
    return this.fetch(`/api/v1/calls/${callId}`);
  }
}

export const api = new ApiClient();
