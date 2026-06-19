import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileSettings from '@/components/features/ProfileSettings';
import BusinessSettings from '@/components/features/BusinessSettings';
import AttendantSettings from '@/components/features/AttendantSettings';
import { User, Building2, Users, LogOut, Lock, ChevronRight, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'business' | 'attendants';
interface Props { onOpenPinModal: () => void; }

export default function SettingsPage({ onOpenPinModal }: Props) {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsTab | null>(null);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  const sections = [
    { id: 'profile' as SettingsTab, icon: User, label: 'Change Profile', desc: 'Update your name & contact info', color: 'bg-blue-50 text-blue-500' },
    { id: 'business' as SettingsTab, icon: Building2, label: 'Add / Manage Business', desc: 'Manage up to 3 shop locations', color: 'bg-emerald-50 text-emerald-500' },
    { id: 'attendants' as SettingsTab, icon: Users, label: 'Sales Attendants', desc: 'Manage store assistants & PINs', color: 'bg-purple-50 text-purple-500' },
  ];

  if (activeSection) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="sticky top-0 z-20 px-4 py-4 flex items-center gap-3 bg-white border-b border-gray-100 shadow-sm">
          <button onClick={() => setActiveSection(null)}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600 rotate-180" />
          </button>
          <h2 className="text-gray-900 font-heading font-bold text-base">
            {sections.find(s => s.id === activeSection)?.label}
          </h2>
        </div>
        <div className="p-4">
          {activeSection === 'profile' && <ProfileSettings />}
          {activeSection === 'business' && <BusinessSettings />}
          {activeSection === 'attendants' && <AttendantSettings />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-500" />
          <h2 className="text-gray-900 font-heading font-bold text-lg">Settings</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* User card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            {user?.avatar_url
              ? <img src={user.avatar_url} className="w-full h-full rounded-2xl object-cover" alt="" />
              : <span className="text-blue-600 font-bold text-xl">
                  {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
                </span>
            }
          </div>
          <div className="min-w-0">
            <h3 className="text-gray-900 font-heading font-bold text-base truncate">
              {user?.full_name || 'My Account'}
            </h3>
            <p className="text-gray-400 text-sm truncate">{user?.email}</p>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {sections.map((s, i) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left',
                i < sections.length - 1 ? 'border-b border-gray-50' : ''
              )}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-semibold text-sm">{s.label}</p>
                <p className="text-gray-400 text-xs mt-0.5 truncate">{s.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Additional Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button onClick={onOpenPinModal}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors border-b border-gray-50">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm">Attendant Mode</p>
              <p className="text-gray-400 text-xs mt-0.5">Switch to restricted attendant view</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-red-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-red-600 font-semibold text-sm">Sign Out</p>
              <p className="text-gray-400 text-xs mt-0.5">Log out of your account</p>
            </div>
          </button>
        </div>

        <p className="text-center text-gray-400 text-xs pt-1">BetaBook v1.0 · Made for Nigerian Traders 🇳🇬</p>
      </div>
    </div>
  );
}
