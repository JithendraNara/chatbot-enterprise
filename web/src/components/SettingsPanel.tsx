import { X, LogOut, Moon, Sun, Volume2, Shield, ArrowUpRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../stores/authStore';
import { Link, useNavigate } from 'react-router-dom';

interface SettingsPanelProps {
  onClose?: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { user, logout, globalRole, status } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = globalRole === 'admin' || globalRole === 'support';

  const handleLogout = () => {
    void logout();
    navigate('/login');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/6">
        <div>
          <p className="section-label mb-2">Contextual Controls</p>
          <h2 className="font-semibold text-lg">Workspace Settings</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/[0.06] rounded-2xl transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-[1.5rem] inset-panel p-5 text-center">
          <div className="w-16 h-16 bg-accent/20 rounded-2xl border border-accent/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl font-bold text-accent">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <p className="font-medium">{user?.name || user?.email}</p>
          <p className="text-sm text-text-secondary">{user?.email}</p>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs">
            <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/8 text-text-secondary">
              {status || 'unknown'}
            </span>
            <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent">
              {globalRole || 'user'}
            </span>
          </div>
        </div>

        {isAdmin && (
          <Link
            to="/admin"
            className="rounded-[1.5rem] inset-panel p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
          >
            <div>
              <p className="section-label mb-2">Administration</p>
              <p className="font-medium">Open Admin Console</p>
              <p className="text-sm text-text-secondary mt-1">
                Review approvals, inspect activity, and manage access.
              </p>
            </div>
            <ArrowUpRight size={18} className="text-accent shrink-0" />
          </Link>
        )}

        <div className="rounded-[1.5rem] inset-panel p-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-3">
            <Volume2 size={16} />
            Voice Selection
          </label>
          <select className="w-full p-3 bg-black/20 border border-white/8 rounded-2xl focus:outline-none focus:border-accent">
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="minimax-coral">Coral Alpha</option>
          </select>
        </div>

        <div className="rounded-[1.5rem] inset-panel p-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-3">
            <Sun size={16} className="text-text-secondary" />
            Theme
          </label>
          <div className="flex items-center gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 p-3 bg-white/[0.04] border border-accent rounded-2xl text-accent">
              <Sun size={16} />
              <span className="text-sm">Light</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 p-3 bg-transparent border border-white/8 rounded-2xl">
              <Moon size={16} className="text-text-secondary" />
              <span className="text-sm text-text-secondary">Dark</span>
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] inset-panel p-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-3">
            <Shield size={16} />
            Usage Snapshot
          </label>
          <div className="rounded-2xl bg-white/[0.03] border border-white/6 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">Requests today</span>
              <span className="font-medium">42 / 100</span>
            </div>
            <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: '42%' }} />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] inset-panel p-4">
          <p className="section-label mb-3">Mood Reference</p>
          <div className="h-28 rounded-[1.25rem] bg-[linear-gradient(145deg,#1d1d21,#0f1013)] border border-white/6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,rgba(255,127,80,0.35),transparent_32%)]" />
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.12)_50%,transparent_100%)]" />
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-white/6">
        <button
          onClick={handleLogout}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-medium transition-all',
            'bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20'
          )}
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </div>
  );
}
