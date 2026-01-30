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
}

export const api = new ApiClient();
