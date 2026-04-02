import { Conversation, Message } from '../types.js';
import { db } from './supabase.js';

export const conversationStore = {
  async create(userId: string, title?: string): Promise<Conversation> {
    const data = await db.createConversation(userId, title);
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      messages: [],
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  },

  async get(id: string): Promise<Conversation | undefined> {
    try {
      const data = await db.getConversation(id);
      if (!data) return undefined;

      return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        messages: (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
          attachments: m.attachments,
        })),
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      };
    } catch {
      return undefined;
    }
  },

  async getByUser(userId: string): Promise<Conversation[]> {
    const data = await db.getConversationsByUser(userId);
    return data.map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      title: c.title,
      messages: [], // Lazy load
      createdAt: new Date(c.created_at).getTime(),
      updatedAt: new Date(c.updated_at).getTime(),
    }));
  },

  async addMessage(
    conversationId: string,
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<Message | undefined> {
    try {
      const data = await db.createMessage(
        conversationId,
        message.role,
        message.content,
        message.attachments
      );
      return {
        id: data.id,
        role: data.role,
        content: data.content,
        timestamp: new Date(data.created_at).getTime(),
        attachments: data.attachments as any,
      };
    } catch {
      return undefined;
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    try {
      await db.deleteConversation(id);
      return true;
    } catch {
      return false;
    }
  },
};
