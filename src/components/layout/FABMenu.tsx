import { useState, useEffect, useRef } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import CashInModal from '@/components/features/CashInModal';
import CashOutModal from '@/components/features/CashOutModal';

interface FABMenuProps {
  cashInOpen: boolean;
  cashOutOpen: boolean;
  onCashIn: () => void;
  onCashOut: () => void;
  onCashInClose: () => void;
  onCashOutClose: () => void;
  desktop?: boolean;
}

export default function FABMenu({
  cashInOpen, cashOutOpen, onCashIn, onCashOut,
  onCashInClose, onCashOutClose, desktop
}: FABMenuProps) {
  const [fabOpen, setFabOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    };
    if (fabOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fabOpen]);

  const handleCashIn = () => { setFabOpen(false); onCashIn(); };
  const handleCashOut = () => { setFabOpen(false); onCashOut(); };

  return (
    <>
      <div ref={menuRef} className={cn(!desktop && 'fixed bottom-0 left-0 right-0 z-40 flex justify-center', desktop && 'relative')}>
        <div className={cn('relative flex items-center justify-center', desktop ? 'flex-col gap-3' : 'h-16')}>

          {/* Pop-out: Cash In */}
          {fabOpen && (
            <button onClick={handleCashIn}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-full shadow-lg font-semibold text-white text-xs transition-all',
                desktop ? 'order-first mb-1' : 'absolute right-[calc(50%+38px)]',
                'bg-emerald-500 hover:bg-emerald-600 active:scale-95',
                'animate-[pop-in_0.2s_cubic-bezier(0.34,1.56,0.64,1)_forwards]'
              )}
              style={{ whiteSpace: 'nowrap' }}>
              <TrendingUp className="w-3.5 h-3.5" />
              + Cash In
            </button>
          )}

          {/* Main FAB */}
          <button onClick={() => setFabOpen(!fabOpen)}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 active:scale-95 relative z-10',
              fabOpen
                ? 'rotate-45 bg-red-500 shadow-red-200'
                : 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
            )}>
            <Plus className="w-7 h-7 text-white transition-transform duration-300" />
          </button>

          {/* Pop-out: Cash Out */}
          {fabOpen && (
            <button onClick={handleCashOut}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-full shadow-lg font-semibold text-white text-xs transition-all',
                desktop ? 'order-last mt-1' : 'absolute left-[calc(50%+38px)]',
                'bg-red-500 hover:bg-red-600 active:scale-95',
                'animate-[pop-in_0.2s_cubic-bezier(0.34,1.56,0.64,1)_forwards]'
              )}
              style={{ whiteSpace: 'nowrap' }}>
              <TrendingDown className="w-3.5 h-3.5" />
              - Cash Out
            </button>
          )}
        </div>
      </div>

      {cashInOpen && <CashInModal onClose={onCashInClose} />}
      {cashOutOpen && <CashOutModal onClose={onCashOutClose} />}
    </>
  );
}
