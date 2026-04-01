import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Trash2, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import ChatList from '../components/ChatList';
import MessageBubble from '../components/MessageBubble';
import StreamingMessage from '../components/StreamingMessage';
import ChatInput from '../components/ChatInput';
import SettingsPanel from '../components/SettingsPanel';
import ChatListPage from './ChatListPage';
import { useChatStore } from '../stores/chatStore';
import { useStreamingChat } from '../hooks/useStreamingChat';
import { api } from '../lib/api';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    addConversation,
    deleteConversation,
    isTyping,
  } = useChatStore();

  const { sendMessage } = useStreamingChat();

  const activeConversation = id ? conversations[id] : null;
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    if (id && !conversations[id]) {
      // Load conversation from API
      api.getMessages(id).then((response) => {
        addConversation({
          id,
          title: `Chat ${id.slice(0, 8)}`,
          messages: response.messages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }).catch(console.error);
    }
    if (id) {
      setActiveConversation(id);
    }
  }, [id, conversations, addConversation, setActiveConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async (content: string, attachments?: { uri: string; type: string; name: string }[]) => {
    if (!activeConversationId) {
      // Create new conversation first
      try {
        const newConv = await api.createConversation();
        addConversation({
          id: newConv.id,
          title: newConv.title || 'New Conversation',
          messages: [],
          createdAt: newConv.createdAt,
          updatedAt: newConv.updatedAt,
        });
        setActiveConversation(newConv.id);
        navigate(`/chat/${newConv.id}`);
        await sendMessage(newConv.id, content, attachments);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    } else {
      await sendMessage(activeConversationId, content, attachments);
    }
  };

  const handleDeleteConversation = () => {
    if (activeConversationId) {
      deleteConversation(activeConversationId);
      navigate('/');
    }
  };

  if (!activeConversationId || !activeConversation) {
    return <ChatListPage />;
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <ChatList />

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-border-color bg-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="md:hidden p-2 hover:bg-background rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-semibold truncate">
              {activeConversation.title || 'New Chat'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteConversation}
              className="p-2 hover:bg-background rounded-lg text-text-secondary hover:text-accent transition-colors"
              title="Delete conversation"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                showSettings ? 'bg-accent text-white' : 'hover:bg-background text-text-secondary'
              )}
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <StreamingMessage />
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSendMessage} isLoading={isTyping} />
      </main>

      {/* Settings panel - desktop only */}
      {showSettings && (
        <aside className="hidden lg:block w-80 border-l border-border-color bg-card">
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </aside>
      )}
    </div>
  );
}
