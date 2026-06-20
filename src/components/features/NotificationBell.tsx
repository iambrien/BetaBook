import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { formatNaira, formatDate } from '@/lib/utils';
import { Transaction } from '@/types';

export default function NotificationBell() {
  const { user } = useAuth();
  const { activeBusinessId } = useApp();
  const { permission, requestPermission, scheduleDebtReminder } = usePushNotifications();
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  const { data: debts = [] } = useQuery<Transaction[]>({
    queryKey: ['debts-bell', user?.id, activeBusinessId],
    queryFn: async () => {
      let q = supabase.from('transactions').select('*')
        .eq('user_id', user!.id).eq('type', 'income').eq('payment_status', 'credit')
        .order('created_at', { ascending: false });
      if (activeBusinessId) q = q.eq('business_id', activeBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (debts.length > 0) setHasNew(true);
  }, [debts.length]);

  const handleBellClick = () => {
    setOpen(!open);
    if (!open) setHasNew(false);
  };

  const handleRemindAll = async () => {
    const granted = permission === 'granted' || await requestPermission();
    if (!granted) return;
    debts.forEach((d, i) => {
      scheduleDebtReminder(d.customer_name || 'Customer', d.amount, i * 800);
    });
  };

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  const totalOwed = debts.reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="relative w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95"
        aria-label="Notifications"
      >
        {permission === 'granted'
          ? <BellRing className="w-4.5 h-4.5 text-gray-600" />
          : permission === 'denied'
          ? <BellOff className="w-4.5 h-4.5 text-gray-400" />
          : <Bell className="w-4.5 h-4.5 text-gray-600" />}
        {hasNew && debts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
            {debts.length > 9 ? '9+' : debts.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-[slide-in_0.15s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Debt Reminders</h3>
                {debts.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                    {debts.length}
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>

            {/* Notification permission banner */}
            {permission !== 'granted' && permission !== 'denied' && (
              <div className="mx-3 mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-blue-700 text-xs font-medium mb-2">
                  Enable notifications to get debt payment reminders on your phone
                </p>
                <button
                  onClick={handleEnableNotifications}
                  className="w-full py-2 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-all active:scale-95"
                >
                  Enable Notifications
                </button>
              </div>
            )}

            {permission === 'denied' && (
              <div className="mx-3 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-amber-700 text-xs">
                  Notifications are blocked. Go to your browser settings to enable them for this site.
                </p>
              </div>
            )}

            {/* Debt list */}
            <div className="max-h-64 overflow-y-auto">
              {debts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                    <BellRing className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">All clear!</p>
                  <p className="text-gray-400 text-xs mt-0.5">No outstanding debts to remind</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 px-1 py-1">
                  {debts.map(debt => (
                    <div key={debt.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 text-xs font-semibold truncate">
                          {debt.customer_name || 'Unknown'}
                        </p>
                        <p className="text-gray-400 text-[11px] truncate">
                          {debt.item_name || 'Goods'} · {formatDate(debt.created_at)}
                        </p>
                      </div>
                      <p className="text-amber-600 font-bold text-xs flex-shrink-0">
                        {formatNaira(debt.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {debts.length > 0 && (
              <div className="border-t border-gray-50 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Total owed</span>
                  <span className="text-gray-800 font-bold">{formatNaira(totalOwed)}</span>
                </div>
                {permission === 'granted' && (
                  <button
                    onClick={handleRemindAll}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-all active:scale-[0.98]"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    Notify Me About All Debts
                    <ChevronRight className="w-3 h-3 opacity-60" />
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
