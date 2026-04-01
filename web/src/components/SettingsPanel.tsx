import { X, LogOut, Moon, Sun, Volume2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface SettingsPanelProps {
  onClose?: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    void logout();
    navigate('/login');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-color">
        <h2 className="font-semibold">Settings</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-background rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* User info */}
        <div className="text-center">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-xl font-bold text-accent">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <p className="font-medium">{user?.name || user?.email}</p>
          <p className="text-sm text-text-secondary">{user?.email}</p>
        </div>

        {/* Voice selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Volume2 size={16} />
            Voice Selection
          </label>
          <select className="w-full p-2.5 bg-background border border-border-color rounded-lg focus:outline-none focus:border-accent">
            <option value="default">Default (System)</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        {/* Theme toggle */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Sun size={16} className="text-text-secondary" />
            Theme
          </label>
          <div className="flex items-center gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-background border border-accent rounded-lg text-accent">
              <Sun size={16} />
              <span className="text-sm">Light</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-card border border-border-color rounded-lg">
              <Moon size={16} className="text-text-secondary" />
              <span className="text-sm text-text-secondary">Dark</span>
            </button>
          </div>
        </div>

        {/* Usage stats */}
        <div>
          <label className="text-sm font-medium mb-2 block">Usage</label>
          <div className="bg-background rounded-lg p-4 border border-border-color">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">Requests today</span>
              <span className="font-medium">42 / 100</span>
            </div>
            <div className="w-full h-2 bg-card rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: '42%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-border-color">
        <button
          onClick={handleLogout}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all',
            'bg-accent/10 text-accent hover:bg-accent/20'
          )}
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </div>
  );
}
