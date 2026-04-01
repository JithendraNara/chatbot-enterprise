import { useAuthStore } from '../stores/authStore';
import type { Message } from '../stores/chatStore';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

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
    messageCount?: number;
  }[];
}

interface MessagesResponse {
  messages: Message[];
}

interface AdminOverviewResponse {
  overview: {
    userCount: number;
    pendingUserCount: number;
    activeUserCount: number;
    suspendedUserCount: number;
    conversationCount: number;
    messageCount: number;
    aiRunCount: number;
    memoryCount: number;
  };
}

interface AdminUsersResponse {
  users: {
    id: string;
    email: string;
    displayName: string | null;
    globalRole: string;
    status: string;
    createdAt: string;
  }[];
}

interface AdminConversationsResponse {
  conversations: {
    id: string;
    title: string;
    ownerUserId: string;
    createdAt: number;
    updatedAt: number;
  }[];
}

interface BackendAttachment {
  type: 'image';
  url: string;
}

interface BackendMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: BackendAttachment[];
}

interface BackendConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount?: number;
  messages?: BackendMessage[];
}

interface BackendErrorResponse {
  error?: string;
  message?: string;
}

const toIsoString = (value: number | string) => new Date(value).toISOString();

function normalizeMessage(message: BackendMessage): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: toIsoString(message.timestamp),
    attachments: message.attachments?.map((attachment) => ({
      uri: attachment.url,
      type: 'image/*',
      name: 'Image attachment',
    })),
  };
}

function normalizeConversation(conversation: BackendConversation) {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: toIsoString(conversation.createdAt),
    updatedAt: toIsoString(conversation.updatedAt),
    messageCount: conversation.messageCount,
  };
}

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
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
    const error = await response
      .json()
      .catch(() => ({ message: 'Request failed' })) as BackendErrorResponse;
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
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

  getConversations: async () => {
    const response = await fetchWithAuth<{ conversations: BackendConversation[] }>('/conversations');
    return {
      conversations: response.conversations.map(normalizeConversation),
    } satisfies ConversationsResponse;
  },

  createConversation: async (title?: string) => {
    const response = await fetchWithAuth<{ conversation: BackendConversation }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return normalizeConversation(response.conversation);
  },

  getMessages: async (conversationId: string) => {
    const response = await fetchWithAuth<{ conversation: BackendConversation }>(
      `/conversations/${conversationId}`
    );
    return {
      messages: (response.conversation.messages || []).map(normalizeMessage),
    } satisfies MessagesResponse;
  },

  getAdminOverview: () =>
    fetchWithAuth<AdminOverviewResponse>('/admin/overview'),

  getAdminUsers: () =>
    fetchWithAuth<AdminUsersResponse>('/admin/users'),

  getAdminConversations: () =>
    fetchWithAuth<AdminConversationsResponse>('/admin/conversations'),

  updateAdminUserStatus: (userId: string, status: 'pending' | 'active' | 'suspended') =>
    fetchWithAuth<{ user: AdminUsersResponse['users'][number] }>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

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
      body: JSON.stringify({
        conversationId,
        content,
        attachments: attachments?.map((attachment) => ({
          type: 'image' as const,
          url: attachment.uri,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: 'Failed to send message' })) as BackendErrorResponse;
      throw new Error(error.error || error.message || 'Failed to send message');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { value, done: doneReading } = await reader.read();
      if (doneReading) break;

      if (!value) continue;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const dataLine = event
          .split('\n')
          .find((line) => line.startsWith('data: '));

        if (!dataLine) continue;

        const payload = JSON.parse(dataLine.slice(6));

        if (payload.type === 'content' && payload.delta) {
          fullText += payload.delta;
          onChunk?.(payload.delta);
        }

        if (payload.type === 'error') {
          throw new Error(payload.error || 'Streaming request failed');
        }
      }
    }

    return fullText;
  },
};

export type { LoginResponse, ConversationsResponse, MessagesResponse };
