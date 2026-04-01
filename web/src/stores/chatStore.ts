import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  attachments?: { uri: string; type: string; name: string }[];
  toolCallId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  streamingText: string;
  isTyping: boolean;
  streamingMessageId: string | null;

  setActiveConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  setStreamingText: (text: string) => void;
  appendStreamingText: (text: string) => void;
  setIsTyping: (isTyping: boolean) => void;
  setStreamingMessageId: (id: string | null) => void;
  commitStreamingMessage: (conversationId: string) => void;
  clearStreaming: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: {},
      activeConversationId: null,
      streamingText: '',
      isTyping: false,
      streamingMessageId: null,

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversation.id]: conversation,
          },
        })),

      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [id]: {
              ...state.conversations[id],
              ...updates,
            },
          },
        })),

      deleteConversation: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.conversations;
          return {
            conversations: rest,
            activeConversationId:
              state.activeConversationId === id ? null : state.activeConversationId,
          };
        }),

      addMessage: (conversationId, message) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...state.conversations[conversationId],
              messages: [...state.conversations[conversationId].messages, message],
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      updateMessage: (conversationId, messageId, updates) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...state.conversations[conversationId],
              messages: state.conversations[conversationId].messages.map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
            },
          },
        })),

      setStreamingText: (text) => set({ streamingText: text }),

      appendStreamingText: (text) =>
        set((state) => ({ streamingText: state.streamingText + text })),

      setIsTyping: (isTyping) => set({ isTyping }),

      setStreamingMessageId: (id) => set({ streamingMessageId: id }),

      commitStreamingMessage: (conversationId) => {
        const { streamingText, streamingMessageId } = get();
        if (streamingMessageId && streamingText) {
          get().addMessage(conversationId, {
            id: streamingMessageId,
            role: 'assistant',
            content: streamingText,
            createdAt: new Date().toISOString(),
          });
        }
        set({ streamingText: '', streamingMessageId: null });
      },

      clearStreaming: () =>
        set({ streamingText: '', streamingMessageId: null, isTyping: false }),
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
