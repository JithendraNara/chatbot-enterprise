import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChatStore, Message } from '../stores/chat-store';
import { useSession } from '../contexts/SessionContext';
import { sendMessage as apiSendMessage } from '../lib/api';

interface UseStreamingChatOptions {
  conversationId: string;
}

export function useStreamingChat(conversationId: string) {
  const { token } = useAuth();
  const { isConnected } = useSession();
  const { addMessage, setStreamingText, setTyping, streamingText } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, attachments: { type: 'image'; url: string }[]) => {
      if (!token) return;

      const userMessage: Message = {
        id: Math.random().toString(36).substring(2, 15),
        role: 'user',
        content,
        timestamp: Date.now(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      addMessage(conversationId, userMessage);
      setTyping(true);
      setIsLoading(true);

      // Add placeholder assistant message
      const assistantMessageId = Math.random().toString(36).substring(2, 15);

      try {
        if (isConnected) {
          // WebSocket streaming (when available)
          await streamViaWebSocket(content, conversationId, token);
        } else {
          // Fallback to HTTP streaming
          await streamViaHTTP(content, token, (text) => {
            setStreamingText(text);
          });
        }

        // Commit streaming text as final message
        const currentStreaming = useChatStore.getState().streamingText;
        if (currentStreaming) {
          const finalMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: currentStreaming,
            timestamp: Date.now(),
          };
          addMessage(conversationId, finalMessage);
          setStreamingText('');
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Streaming failed:', error);

          // Add error message
          const errorMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            timestamp: Date.now(),
          };
          addMessage(conversationId, errorMessage);
        }
      } finally {
        setTyping(false);
        setIsLoading(false);
        setStreamingText('');
      }
    },
    [token, isConnected, conversationId, addMessage, setStreamingText, setTyping]
  );

  const streamViaWebSocket = async (
    content: string,
    convId: string,
    authToken: string
  ) => {
    // This would use the WebSocket connection from SessionContext
    // For now, fall back to HTTP
    return streamViaHTTP(content, authToken, (text) => {
      setStreamingText(text);
    });
  };

  const streamViaHTTP = async (
    content: string,
    authToken: string,
    onToken: (text: string) => void
  ) => {
    abortControllerRef.current = new AbortController();

    let fullText = '';

    const response = await fetch('http://localhost:3000/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        conversationId,
        content,
      }),
      signal: abortControllerRef.current.signal,
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              fullText += parsed.token;
              onToken(fullText);
            }
            if (parsed.tool_call) {
              // Handle tool call
              const toolMessage: Message = {
                id: Math.random().toString(36).substring(2, 15),
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                toolCall: parsed.tool_call,
              };
              addMessage(conversationId, toolMessage);
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }
  };

  const cancelStream = () => {
    abortControllerRef.current?.abort();
    setTyping(false);
    setIsLoading(false);
    setStreamingText('');
  };

  return {
    sendMessage,
    cancelStream,
    isLoading,
    isConnected,
  };
}
