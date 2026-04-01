import { Conversation, Message } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

class ConversationStore {
  private conversations: Map<string, Conversation> = new Map();
  private userConversations: Map<string, Set<string>> = new Map();

  create(userId: string, title?: string): Conversation {
    const id = uuidv4();
    const now = Date.now();
    const conversation: Conversation = {
      id,
      userId,
      title: title || `Conversation ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);

    if (!this.userConversations.has(userId)) {
      this.userConversations.set(userId, new Set());
    }
    this.userConversations.get(userId)!.add(id);

    return conversation;
  }

  get(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  getByUser(userId: string): Conversation[] {
    const conversationIds = this.userConversations.get(userId);
    if (!conversationIds) return [];

    return Array.from(conversationIds)
      .map(id => this.conversations.get(id))
      .filter((c): c is Conversation => c !== undefined)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  addMessage(conversationId: string, message: Omit<Message, 'id' | 'timestamp'>): Message | undefined {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return undefined;

    const newMessage: Message = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    conversation.messages.push(newMessage);
    conversation.updatedAt = Date.now();

    return newMessage;
  }

  delete(id: string, userId: string): boolean {
    const conversation = this.conversations.get(id);
    if (!conversation || conversation.userId !== userId) return false;

    this.conversations.delete(id);
    this.userConversations.get(userId)?.delete(id);
    return true;
  }

  clear(): void {
    this.conversations.clear();
    this.userConversations.clear();
  }
}

export const conversationStore = new ConversationStore();
