import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { formatNaira } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart2, Calendar, Package, TrendingUp } from 'lucide-react';
import { Transaction } from '@/types';

type Period = 'week' | 'month';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];
const EXPENSE_CATEGORIES = ['Rent', 'Stock', 'Transport', 'Power', 'Other'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { activeBusinessId } = useApp();
  const [period, setPeriod] = useState<Period>('week');

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['analytics-txns', user?.id, activeBusinessId, period],
    queryFn: async () => {
      const days = period === 'week' ? 7 : 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      let q = supabase.from('transactions').select('*')
        .eq('user_id', user!.id)
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (activeBusinessId) q = q.eq('business_id', activeBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // --- Bar chart: income vs expense by day ---
  const barData = (() => {
    const days = period === 'week' ? 7 : 30;
    const map: Record<string, { label: string; income: number; expense: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const label = period === 'week'
        ? d.toLocaleDateString('en-NG', { weekday: 'short' })
        : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
      map[key] = { label, income: 0, expense: 0 };
    }
    transactions.forEach(tx => {
      const key = tx.created_at.slice(0, 10);
      if (map[key]) {
        if (tx.type === 'income') map[key].income += Number(tx.amount);
        else map[key].expense += Number(tx.amount);
      }
    });
    return Object.values(map);
  })();

  // --- Pie chart: expense by category ---
  const pieData = (() => {
    const catMap: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(tx => {
      const cat = tx.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + Number(tx.amount);
    });
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  })();

  // --- Best-selling items ranked ---
  const topItems = (() => {
    const itemMap: Record<string, { count: number; total: number }> = {};
    transactions.filter(t => t.type === 'income' && t.item_name).forEach(tx => {
      const name = tx.item_name!;
      if (!itemMap[name]) itemMap[name] = { count: 0, total: 0 };
      itemMap[name].count += 1;
      itemMap[name].total += Number(tx.amount);
    });
    return Object.entries(itemMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  })();

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <h2 className="text-gray-900 font-heading font-bold text-lg">Analytics</h2>
          </div>
          {/* Period toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['week', 'month'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  period === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}>
                {p === 'week' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-gray-500 text-xs">Income</span>
            </div>
            <p className="text-emerald-600 font-heading font-bold text-lg">{formatNaira(totalIncome)}</p>
            <p className="text-gray-400 text-xs mt-0.5">{period === 'week' ? 'Past 7 days' : 'Past 30 days'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
              </div>
              <span className="text-gray-500 text-xs">Expenses</span>
            </div>
            <p className="text-red-500 font-heading font-bold text-lg">{formatNaira(totalExpense)}</p>
            <p className="text-gray-400 text-xs mt-0.5">{period === 'week' ? 'Past 7 days' : 'Past 30 days'}</p>
          </div>
        </div>

        {/* Income vs Expense Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Income vs Expenses</h3>
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : transactions.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `₦${(v/1000).toFixed(0)}k` : `₦${v}`} />
                <Tooltip
                  formatter={(value: number) => [formatNaira(value)]}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense Category Pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Expense Breakdown</h3>
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : pieData.length === 0 ? (
            <EmptyChart label="No expense data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={75} innerRadius={35}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatNaira(value)]}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={8}
                  formatter={(value) => <span style={{ fontSize: 11, color: '#475569' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Best-Selling Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-gray-50">
            <Package className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-gray-800 text-sm">Best-Selling Items</h3>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : topItems.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No item sales recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topItems.map((item, i) => {
                const maxTotal = topItems[0].total;
                const pct = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                return (
                  <div key={item.name} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-amber-100 text-amber-600' :
                          i === 1 ? 'bg-gray-100 text-gray-500' :
                          i === 2 ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {i + 1}
                        </span>
                        <p className="text-gray-800 text-sm font-medium truncate">{item.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-emerald-600 text-sm font-bold">{formatNaira(item.total)}</p>
                        <p className="text-gray-400 text-xs">{item.count} sale{item.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

function EmptyChart({ label = 'No data for this period' }: { label?: string }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-gray-300">
      <BarChart2 className="w-10 h-10 mb-2" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
