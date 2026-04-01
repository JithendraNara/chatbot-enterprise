const API_URL = 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = new Error('Request failed') as any;
    error.response = response;
    throw error;
  }

  return response.json();
}

// Auth
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  password: string
): Promise<{ message: string }> {
  return request<{ message: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// Conversations
export interface Conversation {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
  updatedAt: number;
}

export async function getConversations(
  token: string
): Promise<Conversation[]> {
  return request<Conversation[]>('/api/conversations', {
    token,
  });
}

export async function getMessages(
  token: string,
  conversationId: string
): Promise<any[]> {
  return request<any[]>(`/api/conversations/${conversationId}/messages`, {
    token,
  });
}

export async function createConversation(
  token: string,
  title?: string
): Promise<Conversation> {
  return request<Conversation>('/api/conversations', {
    method: 'POST',
    token,
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversation(
  token: string,
  conversationId: string
): Promise<void> {
  return request<void>(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
    token,
  });
}

// Chat
export interface SendMessageResponse {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  };
  conversationId: string;
}

export async function sendMessage(
  token: string,
  conversationId: string,
  content: string
): Promise<SendMessageResponse> {
  return request<SendMessageResponse>(
    `/api/chat/message`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({ conversationId, content }),
    }
  );
}
