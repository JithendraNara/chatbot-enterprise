import { useNavigate } from 'react-router-dom';
import { MessageCircle, ArrowRight, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import ChatList from '../components/ChatList';
import { useChatStore } from '../stores/chatStore';

export default function ChatListPage() {
  const navigate = useNavigate();
  const { conversations, setActiveConversation } = useChatStore();

  const recentConversations = Object.values(conversations)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const handleNewChat = () => {
    setActiveConversation(null);
    navigate('/');
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    navigate(`/chat/${id}`);
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <ChatList />

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-lg w-full text-center">
          {/* Welcome message */}
          <div className="mb-8">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={32} className="text-accent" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Welcome to MiniChat</h1>
            <p className="text-text-secondary">
              Your enterprise AI assistant. Start a conversation to get help with your tasks.
            </p>
          </div>

          {/* New chat button */}
          <button
            onClick={handleNewChat}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all',
              'bg-accent text-white hover:bg-accent/90'
            )}
          >
            <Plus size={18} />
            Start a new conversation
          </button>

          {/* Recent conversations */}
          {recentConversations.length > 0 && (
            <div className="mt-8 text-left">
              <h2 className="text-sm font-medium text-text-secondary mb-3">
                Recent conversations
              </h2>
              <div className="space-y-2">
                {recentConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={clsx(
                      'w-full flex items-center justify-between p-3 rounded-lg transition-colors',
                      'bg-card hover:bg-card/80 border border-border-color'
                    )}
                  >
                    <span className="truncate font-medium">{conversation.title}</span>
                    <ArrowRight size={16} className="text-text-secondary shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
