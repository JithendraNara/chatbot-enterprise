import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MessageCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useChatStore, Conversation } from '../stores/chatStore';
import { api } from '../lib/api';

export default function ChatList() {
  const navigate = useNavigate();
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    addConversation,
    deleteConversation,
  } = useChatStore();

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
      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <MessageCircle size={20} />
      </button>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed md:static inset-y-0 left-0 z-40 w-72 bg-card border-r border-border-color flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border-color">
          <button
            onClick={handleNewChat}
            disabled={isCreating}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all',
              'bg-accent text-white hover:bg-accent/90 disabled:opacity-50'
            )}
          >
            <Plus size={18} />
            {isCreating ? 'Creating...' : 'New Chat'}
          </button>

          {/* Search */}
          <div className="relative mt-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border-color rounded-lg text-sm placeholder:text-text-secondary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-text-secondary">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group',
                    activeConversationId === conversation.id
                      ? 'bg-accent/20 border border-accent/50'
                      : 'hover:bg-background'
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={clsx(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
                      activeConversationId === conversation.id
                        ? 'bg-accent text-white'
                        : 'bg-background text-text-secondary'
                    )}
                  >
                    {getInitials(conversation.title)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{conversation.title}</span>
                      <span className="text-xs text-text-secondary shrink-0 ml-2">
                        {formatTime(conversation.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary truncate">
                      {getLastMessage(conversation)}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteConversation(e, conversation.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-background rounded transition-all shrink-0"
                  >
                    <Trash2 size={14} className="text-accent" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
