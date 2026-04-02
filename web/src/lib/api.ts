import { useAuthStore } from '../stores/authStore';

const API_BASE = 'https://chatbot-enterprise-api.vercel.app/api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface ConversationsResponse {
  conversations: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }[];
}

interface MessagesResponse {
  messages: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
    attachments?: { uri: string; type: string; name: string }[];
  }[];
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  login: (email: string, password: string) =>
    fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }) as Promise<LoginResponse>,

  register: (email: string, password: string) =>
    fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }) as Promise<LoginResponse>,

  getConversations: () =>
    fetchWithAuth('/conversations') as Promise<ConversationsResponse>,

  createConversation: (title?: string) =>
    fetchWithAuth('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }) as Promise<{ id: string; title: string; createdAt: string; updatedAt: string }>,

  getMessages: (conversationId: string) =>
    fetchWithAuth(`/conversations/${conversationId}/messages`) as Promise<MessagesResponse>,

  sendMessage: async (
    conversationId: string,
    content: string,
    attachments?: { uri: string; type: string; name: string }[],
    onChunk?: (text: string) => void
  ) => {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId, content, attachments }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let fullText = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = decoder.decode(value, { stream: !done });
        fullText += chunk;
        onChunk?.(chunk);
      }
    }

    return fullText;
  },
};

export type { LoginResponse, ConversationsResponse, MessagesResponse };
