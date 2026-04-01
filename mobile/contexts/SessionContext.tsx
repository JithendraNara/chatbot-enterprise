import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useChatStore } from '../stores/chat-store';
import { API_URL } from '../lib/api';

interface SessionContextType {
  isConnected: boolean;
  reconnect: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { setStreamingText, commitStreaming, setTyping } = useChatStore();

  useEffect(() => {
    if (!isLoading && token) {
      connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, isLoading]);

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsBaseUrl = API_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'token':
            setStreamingText(data.text);
            break;
          case 'done':
            setTyping(false);
            break;
          case 'tool_call':
            setTyping(true);
            break;
          case 'error':
            setTyping(false);
            console.error('WebSocket error:', data.message);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  };

  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connectWebSocket();
  };

  return (
    <SessionContext.Provider value={{ isConnected, reconnect }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
