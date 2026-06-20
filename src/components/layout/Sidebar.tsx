import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { TabView } from '@/types';
import { Home, BarChart2, List, MessageCircle, Settings, BookOpen, LogOut, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import BusinessSwitcher from '@/components/features/BusinessSwitcher';

const navItems: { id: TabView; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Dashboard' },
  { id: 'analytics', icon: BarChart2, label: 'Analytics' },
  { id: 'transactions', icon: List, label: 'Transactions' },
  { id: 'chat', icon: MessageCircle, label: 'AI Assistant' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  onOpenPinModal: () => void;
}

export default function Sidebar({ onOpenPinModal }: SidebarProps) {
  const { activeTab, setActiveTab } = useApp();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  return (
    <aside className="w-60 h-full flex flex-col bg-white border-r border-gray-100 shadow-sm z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm">
            <BookOpen className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-gray-900 font-heading font-bold text-base leading-none">BetaBook</h1>
            <p className="text-gray-400 text-xs mt-0.5">Market Ledger</p>
          </div>
        </div>
      </div>

      {/* Business Switcher */}
      <div className="px-4 py-3 border-b border-gray-100">
        <BusinessSwitcher />
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              activeTab === id
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            )}>
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={activeTab === id ? 2.5 : 1.8} />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-blue-600 font-bold text-xs">
                {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-gray-800 text-xs font-semibold truncate">
              {user?.full_name || 'My Account'}
            </p>
            <p className="text-gray-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={onOpenPinModal}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 text-sm transition-all">
          <Lock className="w-4 h-4" />Attendant Mode
        </button>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 text-sm transition-all">
          <LogOut className="w-4 h-4" />Sign Out
        </button>
      </div>
    </aside>
  );
}
