import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { 
  Bot, 
  Search, 
  PanelRightClose, 
  PanelRightOpen, 
  LogOut, 
  FolderGit2,
  Sparkles
} from 'lucide-react';

export const AppHeader: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { isChatOpen, toggleChat } = useWorkspaceStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-surface border-b border-border px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Project Breadcrumb */}
      <div className="flex items-center space-x-4">
        <Link to="/dashboard" className="flex items-center space-x-2.5 text-white group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent-cyan flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            DevLens<span className="text-primary-light font-mono text-sm ml-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">AI</span>
          </span>
        </Link>

        <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

        <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-400">
          <FolderGit2 className="w-3.5 h-3.5 text-primary-light" />
          <span>workspace / active-repo</span>
        </div>
      </div>

      {/* Center Search Bar Trigger */}
      <div className="hidden md:flex items-center">
        <button
          onClick={() => {
            // Trigger search modal in future phase
            console.log('Search triggered');
          }}
          className="flex items-center space-x-3 px-3.5 py-1.5 rounded-lg bg-background border border-border/80 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all w-80 text-xs shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="flex-1 text-left">Search codebase & symbols...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleChat}
          className={`p-2 rounded-lg border transition-all flex items-center space-x-1.5 text-xs font-medium ${
            isChatOpen
              ? 'bg-primary/15 border-primary/40 text-primary-light'
              : 'bg-surface border-border text-slate-400 hover:text-slate-200 hover:border-slate-600'
          }`}
          title="Toggle AI Assistant"
        >
          <Sparkles className="w-4 h-4 text-primary-light" />
          <span className="hidden lg:inline">Assistant</span>
          {isChatOpen ? (
            <PanelRightClose className="w-3.5 h-3.5" />
          ) : (
            <PanelRightOpen className="w-3.5 h-3.5" />
          )}
        </button>

        <div className="h-5 w-px bg-border/60" />

        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-full bg-surfaceHover border border-border flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              user?.fullName?.[0]?.toUpperCase() || 'D'
            )}
          </div>
          <span className="text-xs font-medium text-slate-300 hidden sm:inline max-w-[120px] truncate">
            {user?.fullName || user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
