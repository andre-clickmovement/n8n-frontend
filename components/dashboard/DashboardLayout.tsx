import React from 'react';
import {
  LayoutTemplate,
  Mic2,
  Zap,
  History,
  Settings,
  LogOut,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { AppView } from '../../types';

interface DashboardLayoutProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  children: React.ReactNode;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 w-full text-left ${
      isActive
        ? 'bg-indigo-600/10 text-white translate-x-1'
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`}
  >
    <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>{icon}</span>
    <span className="text-sm font-medium flex-1">{label}</span>
    {badge && (
      <span className="px-2 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded-full">
        {badge}
      </span>
    )}
    {isActive && <ChevronRight size={16} className="text-indigo-400" />}
  </button>
);

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentView,
  onViewChange,
  children,
}) => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar */}
      <div className="w-full md:w-72 bg-slate-900 text-slate-300 md:h-screen sticky top-0 z-20 flex flex-col justify-between shrink-0 shadow-2xl shadow-slate-900/20">
        <div className="p-6 md:p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10 text-white">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <LayoutTemplate className="text-white" size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight">
              LevReg<span className="text-indigo-400">AI</span>
            </span>
          </div>

          {/* Quick Action */}
          <button
            onClick={() => onViewChange('generate')}
            className="w-full mb-8 py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all duration-200"
          >
            <Plus size={18} />
            New Generation
          </button>

          {/* Navigation */}
          <div className="space-y-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-3">
              Menu
            </h2>

            <NavItem
              icon={<Zap size={20} />}
              label="Generate"
              isActive={currentView === 'generate'}
              onClick={() => onViewChange('generate')}
            />

            <NavItem
              icon={<Mic2 size={20} />}
              label="Voice Profiles"
              isActive={currentView === 'create-profile' || currentView === 'dashboard'}
              onClick={() => onViewChange('dashboard')}
            />

            <NavItem
              icon={<History size={20} />}
              label="History"
              isActive={currentView === 'history'}
              onClick={() => onViewChange('history')}
            />

            <NavItem
              icon={<Settings size={20} />}
              label="Settings"
              isActive={currentView === 'settings'}
              onClick={() => onViewChange('settings')}
            />
          </div>
        </div>

        {/* User section */}
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-full px-3 py-2 rounded-lg hover:bg-slate-800"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-4 md:px-12 py-8 md:py-12">{children}</div>
      </div>
    </div>
  );
};
