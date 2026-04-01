import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MessageCircle, Trash2, PanelLeftOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { useChatStore, Conversation } from '../stores/chatStore';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function ChatList() {
  const navigate = useNavigate();
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    addConversation,
    deleteConversation,
  } = useChatStore();
  const { user, globalRole } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const conversationList = useMemo(() => {
    return Object.values(conversations).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversationList;
    const query = searchQuery.toLowerCase();
    return conversationList.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.messages.some((msg) => msg.content.toLowerCase().includes(query))
    );
  }, [conversationList, searchQuery]);

  const handleNewChat = async () => {
    if (isCreating) return;
    setIsCreating(true);

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
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    navigate(`/chat/${id}`);
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversation(null);
      navigate('/');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (title: string) => {
    return title
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getLastMessage = (conversation: Conversation) => {
    if (conversation.messages.length === 0) return 'No messages yet';
    const lastMsg = conversation.messages[conversation.messages.length - 1];
    if (lastMsg.role === 'user') return `You: ${lastMsg.content.slice(0, 30)}...`;
    return lastMsg.content.slice(0, 40) + (lastMsg.content.length > 40 ? '...' : '');
  };

  return (
    <>
      <button
        className="md:hidden fixed top-5 left-5 z-50 h-11 w-11 rounded-2xl glass-panel flex items-center justify-center"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <PanelLeftOpen size={18} />
      </button>

      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={clsx(
          'fixed md:static inset-y-0 left-0 z-40 w-[22rem] rail-panel flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="px-5 pt-6 pb-5 border-b border-white/6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="section-label mb-2">Operator Workspace</p>
              <h1 className="text-2xl font-semibold tracking-tight">MiniChat</h1>
              <p className="text-sm text-text-secondary mt-2 max-w-xs">
                Search, debug, and steer AI conversations from one command deck.
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
              <MessageCircle size={18} />
            </div>
          </div>

          <button
            onClick={handleNewChat}
            disabled={isCreating}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-medium transition-all',
              'bg-accent text-white hover:bg-accent/90 shadow-[0_10px_30px_rgba(233,69,96,0.25)] disabled:opacity-50'
            )}
          >
            <Plus size={18} />
            {isCreating ? 'Opening thread...' : 'New Thread'}
          </button>

          <div className="relative mt-4">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              placeholder="Search title or content"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/8 rounded-2xl text-sm placeholder:text-text-secondary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="px-5 pt-4 pb-3 border-b border-white/6">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="section-label">Conversations</span>
            <span>{filteredConversations.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto conversation-scroller px-3 py-3">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-text-secondary">
              {searchQuery ? 'No matching threads' : 'No threads yet'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={clsx(
                    'relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group border',
                    activeConversationId === conversation.id
                      ? 'bg-white/[0.06] border-accent/40 shadow-[0_12px_28px_rgba(0,0,0,0.18)]'
                      : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/6'
                  )}
                >
                  {activeConversationId === conversation.id && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-accent" />
                  )}

                  <div
                    className={clsx(
                      'w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-medium shrink-0 border',
                      activeConversationId === conversation.id
                        ? 'bg-accent/15 text-accent border-accent/20'
                        : 'bg-white/[0.03] text-text-secondary border-white/6'
                    )}
                  >
                    {getInitials(conversation.title)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium truncate text-[0.95rem]">
                        {conversation.title}
                      </span>
                      <span className="text-[11px] text-text-secondary shrink-0">
                        {formatTime(conversation.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary truncate mt-1">
                      {getLastMessage(conversation)}
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, conversation.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/[0.06] rounded-xl transition-all shrink-0"
                  >
                    <Trash2 size={14} className="text-accent" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/6">
          <div className="glass-panel rounded-2xl px-4 py-3">
            <p className="text-sm font-medium truncate">{user?.name || user?.email || 'Operator'}</p>
            <div className="flex items-center justify-between mt-2 text-xs text-text-secondary">
              <span>{globalRole === 'admin' || globalRole === 'support' ? 'Admin access' : 'Member access'}</span>
              <span className="text-accent">Secure session</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
