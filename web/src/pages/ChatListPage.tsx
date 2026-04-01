import { useNavigate } from 'react-router-dom';
import { MessageCircle, ArrowRight, Plus, Sparkles } from 'lucide-react';
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
    <div className="app-shell h-screen flex overflow-hidden">
      <ChatList />
      <div className="accent-orb hidden lg:block" />

      <main className="flex-1 min-w-0 p-3 md:p-4 xl:p-5">
        <div className="thread-panel h-full rounded-[2rem] border border-white/6 flex items-center justify-center p-8 md:p-12">
          <div className="max-w-4xl w-full">
            <div className="glass-panel rounded-[2rem] p-8 md:p-10">
              <div className="flex items-center justify-between gap-6 mb-10">
                <div>
                  <p className="section-label mb-3">Conversation Studio</p>
                  <h1 className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl">
                    Build the next thread before the problem gets noisy.
                  </h1>
                  <p className="text-text-secondary text-base md:text-lg max-w-2xl mt-5">
                    Search, debug, summarize, and review from a workspace that keeps the assistant
                    focused on the job instead of drowning you in chrome.
                  </p>
                </div>
                <div className="hidden lg:flex h-20 w-20 rounded-[2rem] bg-accent/15 border border-accent/20 text-accent items-center justify-center shrink-0">
                  <Sparkles size={30} />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                <button
                  onClick={handleNewChat}
                  className={clsx(
                    'text-left rounded-[1.75rem] p-6 bg-gradient-to-br from-[#f05b79] to-[#d33d5a] text-white shadow-[0_22px_60px_rgba(233,69,96,0.24)]'
                  )}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center">
                      <Plus size={20} />
                    </div>
                    <span className="section-label !text-white/70">Start</span>
                  </div>
                  <p className="text-2xl font-semibold">Open a new thread</p>
                  <p className="text-white/80 mt-2 max-w-md">
                    Draft a plan, hand over code, or drop an image and turn the assistant loose.
                  </p>
                </button>

                <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-11 w-11 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center">
                      <MessageCircle size={20} className="text-accent" />
                    </div>
                    <div>
                      <p className="section-label">Rhythm</p>
                      <p className="font-medium mt-1">Recent threads stay one click away</p>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary">
                    Use the left rail to jump back into active work without losing the pace of the room.
                  </p>
                </div>
              </div>

              {recentConversations.length > 0 && (
                <div className="mt-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent threads</h2>
                    <span className="text-sm text-text-secondary">{recentConversations.length} active</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {recentConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={clsx(
                          'w-full flex items-center justify-between p-4 rounded-2xl transition-all border bg-white/[0.03] border-white/8 hover:bg-white/[0.05] hover:border-accent/20'
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
          </div>
        </div>
      </main>
    </div>
  );
}
