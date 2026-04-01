const API_URL =
  (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export { API_URL };

interface RequestOptions extends RequestInit {
  token?: string;
}

interface BackendConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages?: BackendMessage[];
}

interface BackendMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: { type: 'image'; url: string }[];
}

interface BackendConversationListResponse {
  conversations: BackendConversation[];
}

interface BackendConversationResponse {
  conversation: BackendConversation;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = new Error('Request failed') as Error & { response?: Response };
    error.response = response;
    throw error;
  }

  return response.json();
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: { type: 'image'; url: string }[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

function normalizeMessage(message: BackendMessage): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    attachments: message.attachments,
  };
}

function normalizeConversation(conversation: BackendConversation): Conversation {
  return {
    id: conversation.id,
    title: conversation.title,
    messages: (conversation.messages || []).map(normalizeMessage),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export async function getConversations(token: string): Promise<Conversation[]> {
  const response = await request<BackendConversationListResponse>('/api/conversations', {
    token,
  });

  return response.conversations.map(normalizeConversation);
}

export async function getMessages(token: string, conversationId: string): Promise<Message[]> {
  const response = await request<BackendConversationResponse>(
    `/api/conversations/${conversationId}`,
    {
      token,
    }
  );

  return (response.conversation.messages || []).map(normalizeMessage);
}

export async function createConversation(
  token: string,
  title?: string
): Promise<Conversation> {
  const response = await request<BackendConversationResponse>('/api/conversations', {
    method: 'POST',
    token,
    body: JSON.stringify({ title }),
  });

  return normalizeConversation(response.conversation);
}

export async function deleteConversation(token: string, conversationId: string): Promise<void> {
  await request<void>(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
    token,
  });
}
