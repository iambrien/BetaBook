import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatNaira, formatDate } from '@/lib/utils';
import CashInModal from '@/components/features/CashInModal';
import CashOutModal from '@/components/features/CashOutModal';
import { TrendingUp, TrendingDown, BookOpen, Building2, Clock, Plus, Minus } from 'lucide-react';
import { Transaction } from '@/types';

export default function AttendantView() {
  const { attendantSession, activeBusinessId } = useApp();
  const { user } = useAuth();
  const [cashInOpen, setCashInOpen] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);

  // Fetch the active business name
  const { data: business } = useQuery({
    queryKey: ['business-single', activeBusinessId],
    queryFn: async () => {
      if (!activeBusinessId) return null;
      const { data } = await supabase
        .from('businesses')
        .select('name, sector')
        .eq('id', activeBusinessId)
        .single();
      return data;
    },
    enabled: !!activeBusinessId,
  });

  // Fetch today's entries (poll every 15s)
  const { data: recentTxns = [] } = useQuery<Transaction[]>({
    queryKey: ['attendant-recent', user?.id, activeBusinessId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let q = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      if (activeBusinessId) q = q.eq('business_id', activeBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const todayInflow = recentTxns
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const todayOutflow = recentTxns
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header — no back button, no admin access */}
      <div className="bg-white border-b border-gray-100 shadow-sm px-4 pt-safe">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-gray-900 font-bold text-base leading-none">BetaBook</h1>
              {business ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-gray-400" />
                  <p className="text-gray-400 text-xs">{business.name}</p>
                </div>
              ) : (
                <p className="text-blue-500 text-xs font-medium mt-0.5">Staff Mode</p>
              )}
            </div>
          </div>

          {/* Attendant badge */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">
                {attendantSession?.name?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <span className="text-blue-700 font-semibold text-xs truncate max-w-[80px]">
              {attendantSession?.name || 'Attendant'}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable main content */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-44 space-y-4">

        {/* Today's summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-4">
            <p className="text-emerald-600 text-xs font-semibold mb-1">Today's Inflow</p>
            <p className="text-emerald-700 font-bold text-xl leading-none">{formatNaira(todayInflow)}</p>
            <p className="text-emerald-500 text-xs mt-1">
              {recentTxns.filter(t => t.type === 'income').length} entries
            </p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-4">
            <p className="text-red-500 text-xs font-semibold mb-1">Today's Outflow</p>
            <p className="text-red-600 font-bold text-xl leading-none">{formatNaira(todayOutflow)}</p>
            <p className="text-red-400 text-xs mt-1">
              {recentTxns.filter(t => t.type === 'expense').length} entries
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => setCashInOpen(true)}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-lg leading-none">+ Cash In</p>
              <p className="text-white/75 text-sm mt-1">Record a sale or income</p>
            </div>
            <Plus className="w-5 h-5 text-white/60 ml-auto flex-shrink-0" />
          </button>

          <button
            onClick={() => setCashOutOpen(true)}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-lg leading-none">− Cash Out</p>
              <p className="text-white/75 text-sm mt-1">Record an expense</p>
            </div>
            <Minus className="w-5 h-5 text-white/60 ml-auto flex-shrink-0" />
          </button>
        </div>

        {/* Today's entries */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-gray-50">
            <Clock className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-800 text-sm">Today's Entries</h3>
            <span className="ml-auto text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              {recentTxns.length} total
            </span>
          </div>

          {recentTxns.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-5 h-5 text-blue-200" />
              </div>
              <p className="text-gray-500 text-sm font-medium">No entries today yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Use the buttons above to record your first transaction
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTxns.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'
                  }`}>
                    {tx.type === 'income'
                      ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">
                      {tx.item_name || tx.category || (tx.type === 'income' ? 'Income' : 'Expense')}
                    </p>
                    {tx.customer_name && (
                      <p className="text-gray-400 text-xs truncate">{tx.customer_name}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold text-sm ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {tx.type === 'income' ? '+' : '−'}{formatNaira(tx.amount)}
                    </p>
                    <p className="text-gray-400 text-xs">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {cashInOpen && <CashInModal onClose={() => setCashInOpen(false)} />}
      {cashOutOpen && <CashOutModal onClose={() => setCashOutOpen(false)} />}
    </div>
  );
}
