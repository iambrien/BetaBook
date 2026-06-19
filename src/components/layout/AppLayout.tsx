import { useApp } from '@/contexts/AppContext';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import FABMenu from './FABMenu';
import HomePage from '@/pages/HomePage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import TransactionsPage from '@/pages/TransactionsPage';
import ChatPage from '@/pages/ChatPage';
import SettingsPage from '@/pages/SettingsPage';
import AttendantView from '@/pages/AttendantView';
import AttendantPinModal from '@/components/features/AttendantPinModal';
import { useState } from 'react';

export default function AppLayout() {
  const { activeTab, isAttendantMode } = useApp();
  const [showPinModal, setShowPinModal] = useState(false);
  const [cashInOpen, setCashInOpen] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);

  // ── Attendant Mode: completely locked UI ──────────────────────────────────
  if (isAttendantMode) {
    return (
      <div className="h-full bg-slate-50 overflow-y-auto">
        <AttendantView />
      </div>
    );
  }

  // ── Owner Mode: full layout ───────────────────────────────────────────────
  const renderPage = () => {
    switch (activeTab) {
      case 'home':         return <HomePage />;
      case 'analytics':   return <AnalyticsPage />;
      case 'transactions': return <TransactionsPage />;
      case 'chat':        return <ChatPage />;
      case 'settings':    return <SettingsPage onOpenPinModal={() => setShowPinModal(true)} />;
      default:            return <HomePage />;
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar onOpenPinModal={() => setShowPinModal(true)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto scrollbar-hide pb-32 md:pb-6">
          {renderPage()}
        </main>
      </div>

      {/* Mobile: Liquid Glass Bottom Nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>

      {/* Mobile FAB — floats above glass nav, centered */}
      <div className="md:hidden fixed bottom-[18px] left-1/2 -translate-x-1/2 z-[60]">
        <FABMenu
          cashInOpen={cashInOpen}
          cashOutOpen={cashOutOpen}
          onCashIn={() => setCashInOpen(true)}
          onCashOut={() => setCashOutOpen(true)}
          onCashInClose={() => setCashInOpen(false)}
          onCashOutClose={() => setCashOutOpen(false)}
        />
      </div>

      {/* Desktop FAB */}
      <div className="hidden md:block fixed bottom-8 right-8 z-40">
        <FABMenu
          cashInOpen={cashInOpen}
          cashOutOpen={cashOutOpen}
          onCashIn={() => setCashInOpen(true)}
          onCashOut={() => setCashOutOpen(true)}
          onCashInClose={() => setCashInOpen(false)}
          onCashOutClose={() => setCashOutOpen(false)}
          desktop
        />
      </div>

      {/* Attendant PIN Modal — for both switching in and switching out */}
      {showPinModal && (
        <AttendantPinModal onClose={() => setShowPinModal(false)} />
      )}
    </div>
  );
}
