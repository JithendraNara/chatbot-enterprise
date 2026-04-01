import { useCallback, useRef } from 'react';
import { useChatStore, Message } from '../stores/chatStore';
import { api } from '../lib/api';
import { wsClient, WebSocketMessage } from '../lib/websocket';

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
  const useWebSocketRef = useRef(true);

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
        if (useWebSocketRef.current) {
          wsClient.onMessage(handleWebSocketMessage);
          wsClient.send({
            type: 'chat',
            conversationId,
            content,
            attachments,
          });
        } else {
          await api.sendMessage(
            conversationId,
            content,
            attachments,
            (chunk) => {
              appendStreamingText(chunk);
            }
          );
          commitStreamingMessage(conversationId);
        }
      } catch (error) {
        console.error('Send message error:', error);
        clearStreaming();
      } finally {
        setIsTyping(false);
      }
    },
    [addMessage, setStreamingText, appendStreamingText, setIsTyping, setStreamingMessageId, commitStreamingMessage, clearStreaming]
  );

  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case 'token':
          if (message.content) {
            appendStreamingText(message.content);
          }
          break;
        case 'done':
          if (activeConversationId) {
            commitStreamingMessage(activeConversationId);
          }
          setIsTyping(false);
          break;
        case 'tool_call':
          console.log('Tool call received:', message);
          break;
        case 'error':
          console.error('WebSocket error:', message.error);
          setIsTyping(false);
          clearStreaming();
          break;
      }
    },
    [activeConversationId, appendStreamingText, commitStreamingMessage, setIsTyping, clearStreaming]
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
