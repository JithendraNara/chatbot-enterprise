import { useCallback, useRef } from 'react';
import { useChatStore, Message } from '../stores/chatStore';
import { api } from '../lib/api';

export function useStreamingChat() {
  const {
    addMessage,
    setStreamingText,
    appendStreamingText,
    setIsTyping,
    setStreamingMessageId,
    commitStreamingMessage,
    clearStreaming,
    conversations,
    activeConversationId,
  } = useChatStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      attachments?: { uri: string; type: string; name: string }[]
    ) => {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        attachments,
      };

      addMessage(conversationId, userMessage);

      const assistantMessageId = `assistant-${Date.now()}`;
      setStreamingMessageId(assistantMessageId);
      setStreamingText('');
      setIsTyping(true);

      abortControllerRef.current = new AbortController();

      try {
        await api.sendMessage(
          conversationId,
          content,
          attachments,
          (chunk) => {
            appendStreamingText(chunk);
          }
        );
        commitStreamingMessage(conversationId);
      } catch (error) {
        console.error('Send message error:', error);
        addMessage(conversationId, {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content:
            error instanceof Error
              ? `I couldn't complete that request: ${error.message}`
              : "I couldn't complete that request.",
          createdAt: new Date().toISOString(),
        });
        clearStreaming();
      } finally {
        setIsTyping(false);
      }
    },
    [addMessage, setStreamingText, appendStreamingText, setIsTyping, setStreamingMessageId, commitStreamingMessage, clearStreaming]
  );

  const cancelStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    clearStreaming();
  }, [clearStreaming]);

  return {
    sendMessage,
    cancelStreaming,
    conversations,
    activeConversationId,
  };
}
