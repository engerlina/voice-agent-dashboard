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
}

export const api = new ApiClient();
