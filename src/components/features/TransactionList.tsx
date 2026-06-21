import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { formatNaira, formatDate } from '@/lib/utils';
import { TrendingUp, TrendingDown, Clock, ChevronRight, Receipt, Pencil } from 'lucide-react';
import { Transaction } from '@/types';
import ReceiptModal from './ReceiptModal';
import EditTransactionModal from './EditTransactionModal';

export default function TransactionList() {
  const { user } = useAuth();
  const { activeBusinessId, setActiveTab } = useApp();
  const qc = useQueryClient();
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions-recent', user?.id, activeBusinessId],
    queryFn: async () => {
      let q = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (activeBusinessId) q = q.eq('business_id', activeBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-800 text-sm">Recent Transactions</h3>
          </div>
          <button
            onClick={() => setActiveTab('transactions')}
            className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs font-semibold transition-colors"
          >
            View All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No transactions yet</p>
            <p className="text-gray-400 text-xs mt-1">Tap the + button to record your first entry</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onViewReceipt={() => setReceiptTx(tx)}
                onEdit={() => setEditTx(tx)}
              />
            ))}
            <button
              onClick={() => setActiveTab('transactions')}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-blue-500 hover:bg-blue-50 text-xs font-semibold transition-colors"
            >
              See all transactions <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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

function TransactionRow({ tx, onViewReceipt, onEdit }: { tx: Transaction; onViewReceipt: () => void; onEdit: () => void }) {
  const isIncome = tx.type === 'income';
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isIncome ? 'bg-emerald-50' : 'bg-red-50'
      }`}>
        {isIncome
          ? <TrendingUp className="w-4 h-4 text-emerald-500" />
          : <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 text-sm font-medium truncate">
          {tx.item_name || tx.category || (isIncome ? 'Income' : 'Expense')}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {tx.customer_name && <span className="text-gray-400 text-xs truncate">{tx.customer_name}</span>}
          {tx.payment_status === 'credit' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-600">CREDIT</span>
          )}
          {tx.category && !tx.customer_name && <span className="text-gray-400 text-xs">{tx.category}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="text-right mr-1">
          <p className={`font-semibold text-sm ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
            {isIncome ? '+' : '−'}{formatNaira(tx.amount)}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">{formatDate(tx.created_at)}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onViewReceipt}
            className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-blue-50 hover:text-blue-500 text-gray-400 transition-colors">
            <Receipt className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-amber-50 hover:text-amber-500 text-gray-400 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
