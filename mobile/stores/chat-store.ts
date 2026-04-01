import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  streamingText: string;
  isTyping: boolean;

  addMessage: (conversationId: string, message: Message) => void;
  addConversation: (conversation: Conversation) => void;
  setStreamingText: (text: string) => void;
  commitStreaming: (conversationId: string) => void;
  setTyping: (typing: boolean) => void;
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  setActiveConversation: (id: string | null) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: {},
      activeConversationId: null,
      streamingText: '',
      isTyping: false,

      addMessage: (conversationId: string, message: Message) => {
        set((state) => {
          const conversation = state.conversations[conversationId];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conversation,
                messages: [...conversation.messages, message],
                updatedAt: message.timestamp,
              },
            },
          };
        });
      },

      addConversation: (conversation: Conversation) => {
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversation.id]: conversation,
          },
        }));
      },

      setStreamingText: (text: string) => {
        set({ streamingText: text });
      },

      commitStreaming: (conversationId: string) => {
        const { streamingText, addMessage } = get();
        if (!streamingText.trim()) return;

        const message: Message = {
          id: generateId(),
          role: 'assistant',
          content: streamingText,
          timestamp: Date.now(),
        };

        addMessage(conversationId, message);
        set({ streamingText: '' });
      },

      setTyping: (typing: boolean) => {
        set({ isTyping: typing });
      },

      createConversation: () => {
        const id = generateId();
        const now = Date.now();

        const conversation: Conversation = {
          id,
          title: '',
          messages: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          conversations: {
            ...state.conversations,
            [id]: conversation,
          },
          activeConversationId: id,
        }));

        return id;
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const { [id]: _, ...rest } = state.conversations;
          return {
            conversations: rest,
            activeConversationId:
              state.activeConversationId === id ? null : state.activeConversationId,
          };
        });
      },

      updateConversationTitle: (id: string, title: string) => {
        set((state) => {
          const conversation = state.conversations[id];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [id]: {
                ...conversation,
                title,
              },
            },
          };
        });
      },

      setActiveConversation: (id: string | null) => {
        set({ activeConversationId: id });
      },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
