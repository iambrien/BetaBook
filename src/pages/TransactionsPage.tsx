import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { formatNaira, formatDate } from '@/lib/utils';
import { Transaction } from '@/types';
import ReceiptModal from '@/components/features/ReceiptModal';
import EditTransactionModal from '@/components/features/EditTransactionModal';
import {
  Search, TrendingUp, TrendingDown, Receipt, Trash2, Pencil,
  ChevronDown, X, Calendar, Filter, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type DateRange = 'all' | 'today' | 'week' | 'month' | 'custom';

const DATE_LABELS: Record<DateRange, string> = {
  all: 'All Time',
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  custom: 'Custom Range',
};

function getDateBounds(range: DateRange, customFrom: string, customTo: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (range === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (range === 'week') {
    const from = new Date(now);
    from.setDate(now.getDate() - now.getDay());
    from.setHours(0, 0, 0, 0);
    return { from, to: null };
  }
  if (range === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: null };
  }
  if (range === 'custom' && customFrom) {
    return {
      from: customFrom ? new Date(customFrom) : null,
      to: customTo ? new Date(new Date(customTo).setHours(23, 59, 59, 999)) : null,
    };
  }
  return { from: null, to: null };
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const { activeBusinessId } = useApp();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [reportLoading, setReportLoading] = useState(false);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions-all', user?.id, activeBusinessId],
    queryFn: async () => {
      let q = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (activeBusinessId) q = q.eq('business_id', activeBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-recent'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success('Transaction deleted');
      setDeletingId(null);
    },
    onError: () => {
      toast.error('Could not delete transaction');
      setDeletingId(null);
    },
  });

  const { from: filterFrom, to: filterTo } = getDateBounds(dateRange, customFrom, customTo);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transactions.filter(tx => {
      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      // Date filter
      if (filterFrom) {
        const txDate = new Date(tx.created_at);
        if (txDate < filterFrom) return false;
        if (filterTo && txDate > filterTo) return false;
      }
      // Search filter
      if (!q) return true;
      const amount = tx.amount.toString();
      return (
        tx.item_name?.toLowerCase().includes(q) ||
        tx.customer_name?.toLowerCase().includes(q) ||
        tx.category?.toLowerCase().includes(q) ||
        tx.notes?.toLowerCase().includes(q) ||
        amount.includes(q)
      );
    });
  }, [transactions, search, typeFilter, filterFrom, filterTo]);

  const totalInflow = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOutflow = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const hasActiveFilter = dateRange !== 'all' || typeFilter !== 'all';

  // ── End of Day Report ────────────────────────────────────────────────────
  const generateDayReport = () => {
    setReportLoading(true);
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayTxns = transactions.filter(tx => new Date(tx.created_at) >= todayStart);
    const dayInflow = todayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const dayOutflow = todayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = dayInflow - dayOutflow;
    const dateStr = now.toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

    const rows = todayTxns.map((tx, i) => {
      const timeLabel = new Date(tx.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
      const label = tx.item_name || tx.category || (tx.type === 'income' ? 'Income' : 'Expense');
      const customer = tx.customer_name ? `<span style="color:#9ca3af">${tx.customer_name}</span>` : '';
      const status = tx.payment_status === 'credit' ? '<span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700">CREDIT</span>' : '';
      const bgColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
      const amtColor = tx.type === 'income' ? '#059669' : '#ef4444';
      const sign = tx.type === 'income' ? '+' : '−';
      return `<tr style="background:${bgColor}">
        <td style="padding:10px 14px;font-size:12px;color:#6b7280">${timeLabel}</td>
        <td style="padding:10px 14px;font-size:13px;color:#1f2937;font-weight:500">${label} ${customer} ${status}</td>
        <td style="padding:10px 14px;font-size:12px;color:#6b7280">${tx.type === 'income' ? '📈 Income' : '📉 Expense'}</td>
        <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${amtColor};text-align:right">${sign}₦${tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
      </tr>`;
    }).join('');

    const noTxnMsg = todayTxns.length === 0
      ? '<tr><td colspan="4" style="text-align:center;padding:40px;color:#9ca3af;font-size:13px">No transactions recorded today</td></tr>'
      : '';

    const netColor = net >= 0 ? '#059669' : '#ef4444';
    const netSign = net >= 0 ? '+' : '−';
    const fmtN = (n: number) => `₦${Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BetaBook — End of Day Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1f2937; }
    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      .page { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; max-width: 100% !important; }
    }
    .page { max-width: 800px; margin: 24px auto; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; }
    .header-left h1 { color: white; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header-left p { color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px; }
    .header-right { text-align: right; color: rgba(255,255,255,0.85); font-size: 12px; line-height: 1.6; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 1px solid #e5e7eb; }
    .stat { padding: 20px 24px; border-right: 1px solid #e5e7eb; }
    .stat:last-child { border-right: none; }
    .stat .label { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .stat .value { font-size: 20px; font-weight: 800; }
    .stat.income .value { color: #059669; }
    .stat.expense .value { color: #ef4444; }
    .stat.net .value { color: ${netColor}; }
    .section-header { padding: 16px 24px 12px; border-bottom: 1px solid #f1f5f9; }
    .section-header h2 { font-size: 14px; font-weight: 700; color: #374151; }
    .section-header span { font-size: 12px; color: #9ca3af; margin-left: 8px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 10px 14px; background: #f1f5f9; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; text-align: left; }
    thead th:last-child { text-align: right; }
    .footer { padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
    .footer p { font-size: 11px; color: #9ca3af; }
    .print-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; margin: 16px auto; display: block; width: fit-content; }
    .print-btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:16px">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1>📒 BetaBook</h1>
        <p>End of Day Report</p>
      </div>
      <div class="header-right">
        <div style="font-weight:700;font-size:14px;color:white">${dateStr}</div>
        <div>Generated at ${timeStr}</div>
        <div>${todayTxns.length} transaction${todayTxns.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
    <div class="summary">
      <div class="stat income"><div class="label">Total Inflow</div><div class="value">${fmtN(dayInflow)}</div></div>
      <div class="stat expense"><div class="label">Total Outflow</div><div class="value">${fmtN(dayOutflow)}</div></div>
      <div class="stat net"><div class="label">Net Balance</div><div class="value">${netSign}${fmtN(net)}</div></div>
    </div>
    <div class="section-header">
      <h2>Transaction Log <span>${todayTxns.length} entries</span></h2>
    </div>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Description</th>
          <th>Type</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows || noTxnMsg}
      </tbody>
    </table>
    <div class="footer">
      <p>BetaBook — Finance Manager for Market Traders</p>
      <p>Confidential — For internal use only</p>
    </div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      // Auto-trigger print after render
      win.addEventListener('load', () => win.print());
    }
    setReportLoading(false);
  };

  return (
    <>
      <div className="min-h-full bg-slate-50">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4">
          <div className="flex items-center h-[60px] gap-3">
            <div className="flex-1">
              <h2 className="text-gray-900 font-heading font-bold text-lg leading-none">Transactions</h2>
              <p className="text-gray-400 text-xs mt-0.5">{filtered.length} of {transactions.length} entries</p>
            </div>
            <button
              onClick={generateDayReport}
              disabled={reportLoading || transactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-40 flex-shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              {reportLoading ? 'Generating...' : 'Day Report'}
            </button>
          </div>

          {/* Search + Filter Row */}
          <div className="flex items-center gap-2 pb-3">
            {/* Search bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by item, customer, amount..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter button */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex-shrink-0',
                hasActiveFilter
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              {hasActiveFilter ? 'Filtered' : 'Filter'}
              <ChevronDown className={cn('w-3 h-3 transition-transform', filterOpen && 'rotate-180')} />
            </button>
          </div>

          {/* Expandable Filter Panel */}
          {filterOpen && (
            <div className="pb-3 space-y-3 border-t border-gray-50 pt-3 animate-[slide-in_0.15s_ease_forwards]">
              {/* Type filter pills */}
              <div className="flex gap-2">
                {(['all', 'income', 'expense'] as const).map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border',
                      typeFilter === t
                        ? t === 'income' ? 'bg-emerald-500 text-white border-emerald-500'
                          : t === 'expense' ? 'bg-red-500 text-white border-red-500'
                          : 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    )}>
                    {t === 'all' ? 'All Types' : t === 'income' ? '+ Income' : '− Expense'}
                  </button>
                ))}
              </div>

              {/* Date range pills */}
              <div className="flex flex-wrap gap-2">
                {(Object.keys(DATE_LABELS) as DateRange[]).filter(d => d !== 'custom').map(d => (
                  <button key={d} onClick={() => setDateRange(d)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                      dateRange === d
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    )}>
                    <Calendar className="w-3 h-3" />{DATE_LABELS[d]}
                  </button>
                ))}
                <button onClick={() => setDateRange('custom')}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                    dateRange === 'custom'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  )}>
                  <Calendar className="w-3 h-3" /> Custom
                </button>
              </div>

              {/* Custom date inputs */}
              {dateRange === 'custom' && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-medium mb-1 block">From</label>
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-700 bg-white focus:outline-none focus:border-blue-400 transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-medium mb-1 block">To</label>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-700 bg-white focus:outline-none focus:border-blue-400 transition-all" />
                  </div>
                </div>
              )}

              {/* Clear filters */}
              {hasActiveFilter && (
                <button onClick={() => { setDateRange('all'); setTypeFilter('all'); setCustomFrom(''); setCustomTo(''); }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                  <X className="w-3 h-3" /> Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <p className="text-emerald-600 text-xs font-medium">Total Inflow</p>
            <p className="text-emerald-700 font-bold text-base mt-0.5">{formatNaira(totalInflow)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-red-500 text-xs font-medium">Total Outflow</p>
            <p className="text-red-600 font-bold text-base mt-0.5">{formatNaira(totalOutflow)}</p>
          </div>
        </div>

        {/* Transaction List */}
        <div className="px-4 pb-32">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-white border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm font-semibold">
                {search || hasActiveFilter ? 'No matching transactions' : 'No transactions yet'}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {search || hasActiveFilter ? 'Try a different search or filter' : 'Tap + to record your first entry'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {filtered.map(tx => (
                  <FullTransactionRow
                    key={tx.id}
                    tx={tx}
                    onViewReceipt={() => setReceiptTx(tx)}
                    onEdit={() => setEditTx(tx)}
                    onDelete={() => setDeletingId(tx.id)}
                    deleting={deletingId === tx.id}
                    onConfirmDelete={() => deleteMutation.mutate(tx.id)}
                    onCancelDelete={() => setDeletingId(null)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {receiptTx && (
        <ReceiptModal transaction={receiptTx} onClose={() => setReceiptTx(null)} />
      )}
      {editTx && (
        <EditTransactionModal transaction={editTx} onClose={() => setEditTx(null)} />
      )}
    </>
  );
}

// ── Full Transaction Row ──────────────────────────────────────────────────────
interface RowProps {
  tx: Transaction;
  onViewReceipt: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function FullTransactionRow({ tx, onViewReceipt, onEdit, onDelete, deleting, onConfirmDelete, onCancelDelete }: RowProps) {
  const isIncome = tx.type === 'income';

  if (deleting) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50">
        <p className="flex-1 text-red-600 text-sm font-medium">Delete this entry?</p>
        <button onClick={onConfirmDelete}
          className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors">
          Delete
        </button>
        <button onClick={onCancelDelete}
          className="px-3 py-1.5 bg-white text-gray-600 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
        isIncome ? 'bg-emerald-50' : 'bg-red-50'
      )}>
        {isIncome
          ? <TrendingUp className="w-4 h-4 text-emerald-500" />
          : <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-gray-800 text-sm font-medium truncate">
          {tx.item_name || tx.category || (isIncome ? 'Income' : 'Expense')}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          {tx.customer_name && (
            <span className="text-gray-400 text-xs truncate max-w-[100px]">{tx.customer_name}</span>
          )}
          {tx.payment_status === 'credit' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-600">CREDIT</span>
          )}
          {tx.category && !tx.customer_name && (
            <span className="text-gray-400 text-xs">{tx.category}</span>
          )}
          <span className="text-gray-300 text-xs">{formatDate(tx.created_at)}</span>
        </div>
        {tx.notes && (
          <p className="text-gray-400 text-xs mt-0.5 truncate italic">"{tx.notes}"</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <p className={cn('font-bold text-sm', isIncome ? 'text-emerald-600' : 'text-red-500')}>
          {isIncome ? '+' : '−'}{formatNaira(tx.amount)}
        </p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          <button onClick={onViewReceipt}
            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-500 text-gray-400 flex items-center justify-center transition-colors">
            <Receipt className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-amber-50 hover:text-amber-500 text-gray-400 flex items-center justify-center transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
