import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { formatNaira } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function StatsBanner() {
  const { user } = useAuth();
  const { activeBusinessId } = useApp();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', user?.id, activeBusinessId],
    queryFn: async () => {
      let q = supabase.from('transactions').select('type, amount').eq('user_id', user!.id);
      if (activeBusinessId) q = q.eq('business_id', activeBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      const inflow = (data || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const outflow = (data || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return { inflow, outflow, profit: inflow - outflow };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl h-32 animate-pulse bg-gray-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-2xl animate-pulse bg-gray-100" />
          <div className="h-24 rounded-2xl animate-pulse bg-gray-100" />
        </div>
      </div>
    );
  }

  const profit = stats?.profit ?? 0;
  const isPositive = profit >= 0;

  return (
    <div className="space-y-3">
      {/* Main P&L Banner */}
      <div className={`rounded-2xl p-5 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Total Profit / Loss</p>
          <Activity className="w-4 h-4 text-white/70" />
        </div>
        <p className="text-white font-heading font-bold text-3xl mb-1">
          {isPositive ? '+' : ''}{formatNaira(profit)}
        </p>
        <p className="text-white/80 text-xs">
          {isPositive ? '📈 Looking good! Keep it up.' : '📉 More expenses than income'}
        </p>
      </div>

      {/* Sub Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-gray-500 text-xs font-medium">Total Inflow</span>
          </div>
          <p className="text-emerald-600 font-heading font-bold text-xl">{formatNaira(stats?.inflow ?? 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-gray-500 text-xs font-medium">Total Outflow</span>
          </div>
          <p className="text-red-500 font-heading font-bold text-xl">{formatNaira(stats?.outflow ?? 0)}</p>
        </div>
      </div>
    </div>
  );
}
