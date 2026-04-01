export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: { type: 'image'; url: string }[];
  toolCall?: { name: string; input: Record<string, unknown> };
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

export interface ChatMessageInput {
  conversationId?: string;
  content: string;
  attachments?: { type: 'image'; url: string }[];
}

export interface MiniMaxMessage {
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface MiniMaxTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MiniMaxStreamingEvent {
  type: string;
  index?: number;
  content_block?: {
    type: string;
    name?: string;
  };
  delta?: {
    text?: string;
    partial_json?: string;
    type?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  message?: {
    role: string;
    content: string;
  };
}
