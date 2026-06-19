import React, { createContext, useContext, useState, useEffect } from 'react';
import { TabView } from '@/types';

interface AttendantSession {
  id: string;
  name: string;
  restricted: boolean;
}

interface AppContextType {
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  activeBusinessId: string | null;
  setActiveBusinessId: (id: string | null) => void;
  attendantSession: AttendantSession | null;
  setAttendantSession: (s: AttendantSession | null) => void;
  isAttendantMode: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(() =>
    localStorage.getItem('betabook_active_biz')
  );
  const [attendantSession, setAttendantSessionState] = useState<AttendantSession | null>(() => {
    const s = localStorage.getItem('betabook_attendant');
    return s ? JSON.parse(s) : null;
  });

  const setActiveBusinessId = (id: string | null) => {
    setActiveBusinessIdState(id);
    if (id) localStorage.setItem('betabook_active_biz', id);
    else localStorage.removeItem('betabook_active_biz');
  };

  const setAttendantSession = (s: AttendantSession | null) => {
    setAttendantSessionState(s);
    if (s) localStorage.setItem('betabook_attendant', JSON.stringify(s));
    else localStorage.removeItem('betabook_attendant');
  };

  const isAttendantMode = !!(attendantSession?.restricted);

  return (
    <AppContext.Provider value={{
      activeTab, setActiveTab,
      activeBusinessId, setActiveBusinessId,
      attendantSession, setAttendantSession,
      isAttendantMode,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
