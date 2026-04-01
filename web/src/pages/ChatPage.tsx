import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Trash2, Sparkles, ArrowLeft } from 'lucide-react';
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
    <div className="app-shell h-screen flex overflow-hidden">
      <ChatList />
      <div className="accent-orb hidden lg:block" />

      <main className="flex-1 min-w-0 p-3 md:p-4 xl:p-5">
        <div className="thread-panel h-full rounded-[2rem] border border-white/6 flex overflow-hidden">
          <section className="flex-1 min-w-0 flex flex-col">
            <header className="px-5 md:px-7 py-5 border-b border-white/6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="hidden md:flex h-12 w-12 rounded-2xl bg-accent/15 text-accent items-center justify-center border border-accent/20 shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="section-label">Live Thread</span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/8 px-3 py-1 text-xs text-text-secondary">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Session ready
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight truncate">
                      {activeConversation.title || 'New Chat'}
                    </h1>
                    <p className="text-sm md:text-base text-text-secondary mt-2 max-w-2xl">
                      Use the thread like a command desk: ask, attach context, iterate, and keep the
                      assistant focused on one decision path at a time.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate('/')}
                    className="md:hidden h-11 w-11 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <button
                    onClick={handleDeleteConversation}
                    className="h-11 w-11 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-accent flex items-center justify-center transition-colors"
                    title="Delete conversation"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={clsx(
                      'h-11 px-4 rounded-2xl transition-colors flex items-center gap-2',
                      showSettings
                        ? 'bg-accent text-white'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary'
                    )}
                    title="Settings"
                  >
                    <Settings size={18} />
                    <span className="hidden md:inline text-sm font-medium">Controls</span>
                  </button>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto thread-scroller px-4 md:px-6 xl:px-10 py-8 soft-grid">
              <div className="max-w-4xl mx-auto">
                {messages.length === 0 && !isTyping ? (
                  <div className="glass-panel rounded-[2rem] p-8 md:p-10 mb-8">
                    <p className="section-label mb-3">Thread ready</p>
                    <h2 className="text-2xl md:text-4xl font-semibold tracking-tight max-w-2xl">
                      Start with a sharp question, a pasted brief, or an image to analyze.
                    </h2>
                    <div className="grid gap-3 md:grid-cols-3 mt-8 text-sm">
                      <div className="rounded-2xl bg-white/[0.03] border border-white/6 p-4">
                        <p className="font-medium mb-2">Strategy</p>
                        <p className="text-text-secondary">Ask for plans, tradeoffs, or implementation steps.</p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.03] border border-white/6 p-4">
                        <p className="font-medium mb-2">Research</p>
                        <p className="text-text-secondary">Use the model to synthesize current information fast.</p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.03] border border-white/6 p-4">
                        <p className="font-medium mb-2">Review</p>
                        <p className="text-text-secondary">Drop in code, screenshots, or bugs and work the loop.</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <StreamingMessage />
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="px-4 md:px-6 xl:px-10 pb-4 md:pb-6">
              <div className="max-w-4xl mx-auto">
                <ChatInput onSend={handleSendMessage} isLoading={isTyping} />
              </div>
            </div>
          </section>

          {showSettings && (
            <aside className="hidden xl:block w-[22rem] border-l border-white/6 bg-[#0d1123]/88 backdrop-blur-xl">
              <SettingsPanel onClose={() => setShowSettings(false)} />
            </aside>
          )}
        </div>
      </main>

      {showSettings && (
        <div className="xl:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-[#0d1123]/95 border-l border-white/8">
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
