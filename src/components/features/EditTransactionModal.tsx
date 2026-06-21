import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X, TrendingUp, TrendingDown, User, Phone } from 'lucide-react';
import { Transaction } from '@/types';

interface Props {
  transaction: Transaction;
  onClose: () => void;
}

const CATEGORIES = ['Rent', 'Stock', 'Transport', 'Power', 'Salary', 'Maintenance', 'Other'];

export default function EditTransactionModal({ transaction, onClose }: Props) {
  const qc = useQueryClient();
  const isIncome = transaction.type === 'income';

  const [amount, setAmount] = useState(String(transaction.amount));
  const [itemName, setItemName] = useState(transaction.item_name || '');
  const [category, setCategory] = useState(transaction.category || 'Stock');
  const [notes, setNotes] = useState(transaction.notes || '');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'credit'>(
    (transaction.payment_status as 'paid' | 'credit') || 'paid'
  );
  const [customerName, setCustomerName] = useState(transaction.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(transaction.customer_phone || '');

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const updates: Record<string, unknown> = {
        amount: parseFloat(amount),
      };

      if (isIncome) {
        updates.item_name = itemName || null;
        updates.payment_status = paymentStatus;
        updates.customer_name = paymentStatus === 'credit' ? customerName : null;
        updates.customer_phone = paymentStatus === 'credit' ? customerPhone : null;
      } else {
        updates.category = category;
        updates.notes = notes || null;
      }

      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transaction.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['transactions-all'] });
      qc.invalidateQueries({ queryKey: ['transactions-recent'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['analytics-txns'] });
      toast.success('Transaction updated!');
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (isIncome && paymentStatus === 'credit' && !customerName.trim()) {
      toast.error('Enter customer name for credit sale');
      return;
    }
    mutate();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl animate-[slide-up_0.25s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isIncome ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {isIncome
                ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                : <TrendingDown className="w-4 h-4 text-red-500" />}
            </div>
            <div>
              <h3 className="font-heading font-bold text-gray-900">Edit Transaction</h3>
              <p className="text-gray-400 text-xs mt-0.5">{isIncome ? 'Income entry' : 'Expense entry'}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (₦) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₦</span>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                type="number"
                min="1"
                step="any"
                required
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-lg font-bold bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Income-specific fields */}
          {isIncome && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Item / Product Name</label>
                <input
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  type="text"
                  placeholder="e.g. Ankara fabric, Rice bag..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Status</label>
                <div className="flex gap-3">
                  {(['paid', 'credit'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPaymentStatus(s)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                        paymentStatus === s
                          ? s === 'paid'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {s === 'paid' ? '✅ Paid' : '⏳ Credit'}
                    </button>
                  ))}
                </div>
              </div>

              {paymentStatus === 'credit' && (
                <div className="space-y-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700">Customer Details</p>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      type="text"
                      required
                      placeholder="Customer name"
                      className="w-full pl-10 pr-4 py-2.5 border border-amber-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      type="tel"
                      placeholder="Phone for WhatsApp reminder"
                      className="w-full pl-10 pr-4 py-2.5 border border-amber-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400 transition-all"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Expense-specific fields */}
          {!isIncome && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        category === c
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add any additional notes..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all resize-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isPending}
            className={`w-full py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-all active:scale-[0.98] ${
              isIncome ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
