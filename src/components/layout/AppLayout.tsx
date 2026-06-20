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
import CalculatorModal from '@/components/features/CalculatorModal';
import CashInModal from '@/components/features/CashInModal';
import CashOutModal from '@/components/features/CashOutModal';
import { useState } from 'react';
import { Calculator } from 'lucide-react';

export default function AppLayout() {
  const { activeTab, isAttendantMode } = useApp();
  const [showPinModal, setShowPinModal] = useState(false);
  const [cashInOpen, setCashInOpen] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcPrefillIn, setCalcPrefillIn] = useState<number | undefined>();
  const [calcPrefillOut, setCalcPrefillOut] = useState<number | undefined>();

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
      case 'home':          return <HomePage />;
      case 'analytics':    return <AnalyticsPage />;
      case 'transactions': return <TransactionsPage />;
      case 'chat':         return <ChatPage />;
      case 'settings':     return <SettingsPage onOpenPinModal={() => setShowPinModal(true)} />;
      default:             return <HomePage />;
    }
  };

  const handleCalcCashIn = (amount: number) => {
    setCalcPrefillIn(amount);
    setCalcPrefillOut(undefined);
    setCashInOpen(true);
  };

  const handleCalcCashOut = (amount: number) => {
    setCalcPrefillOut(amount);
    setCalcPrefillIn(undefined);
    setCashOutOpen(true);
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
          onCashIn={() => { setCalcPrefillIn(undefined); setCashInOpen(true); }}
          onCashOut={() => { setCalcPrefillOut(undefined); setCashOutOpen(true); }}
          onCashInClose={() => { setCashInOpen(false); setCalcPrefillIn(undefined); }}
          onCashOutClose={() => { setCashOutOpen(false); setCalcPrefillOut(undefined); }}
        />
      </div>

      {/* Desktop FAB */}
      <div className="hidden md:block fixed bottom-8 right-8 z-40">
        <FABMenu
          cashInOpen={cashInOpen}
          cashOutOpen={cashOutOpen}
          onCashIn={() => { setCalcPrefillIn(undefined); setCashInOpen(true); }}
          onCashOut={() => { setCalcPrefillOut(undefined); setCashOutOpen(true); }}
          onCashInClose={() => { setCashInOpen(false); setCalcPrefillIn(undefined); }}
          onCashOutClose={() => { setCashOutOpen(false); setCalcPrefillOut(undefined); }}
          desktop
        />
      </div>

      {/* ── Floating Calculator Button ─────────────────────────────────────── */}
      {/* Mobile: sits left of the FAB */}
      <button
        onClick={() => setCalcOpen(true)}
        className="md:hidden fixed bottom-[26px] right-6 z-[55] w-11 h-11 rounded-2xl bg-white border border-gray-200 shadow-lg flex items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95"
        title="Calculator"
        aria-label="Open calculator"
      >
        <Calculator className="w-5 h-5 text-blue-500" />
      </button>

      {/* Desktop: sits left of FAB cluster */}
      <button
        onClick={() => setCalcOpen(true)}
        className="hidden md:flex fixed bottom-[88px] right-8 z-40 w-11 h-11 rounded-2xl bg-white border border-gray-200 shadow-lg items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95"
        title="Calculator (keyboard supported)"
        aria-label="Open calculator"
      >
        <Calculator className="w-5 h-5 text-blue-500" />
      </button>

      {/* Override FAB-managed modals when prefilled from calc */}
      {cashInOpen && (
        <CashInModal
          onClose={() => { setCashInOpen(false); setCalcPrefillIn(undefined); }}
          initialAmount={calcPrefillIn}
        />
      )}
      {cashOutOpen && (
        <CashOutModal
          onClose={() => { setCashOutOpen(false); setCalcPrefillOut(undefined); }}
          initialAmount={calcPrefillOut}
        />
      )}

      {/* Calculator Modal */}
      {calcOpen && (
        <CalculatorModal
          onClose={() => setCalcOpen(false)}
          onUseCashIn={handleCalcCashIn}
          onUseCashOut={handleCalcCashOut}
        />
      )}

      {/* Attendant PIN Modal */}
      {showPinModal && (
        <AttendantPinModal onClose={() => setShowPinModal(false)} />
      )}
    </div>
  );
}
