import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { X, TrendingDown } from 'lucide-react';

interface Props { onClose: () => void; initialAmount?: number; }

const CATEGORIES = ['Rent', 'Stock', 'Transport', 'Power', 'Salary', 'Maintenance', 'Other'];

export default function CashOutModal({ onClose, initialAmount }: Props) {
  const { user } = useAuth();
  const { activeBusinessId } = useApp();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [category, setCategory] = useState('Stock');
  const [notes, setNotes] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('transactions').insert({
        user_id: user!.id,
        business_id: activeBusinessId || null,
        type: 'expense',
        amount: parseFloat(amount),
        category,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['transactions-recent'] });
      qc.invalidateQueries({ queryKey: ['analytics-txns'] });
      toast.success('Expense recorded!');
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl animate-[fade-up_0.25s_ease-out_forwards]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <h3 className="font-heading font-bold text-gray-900">Add Cash Out</h3>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (₦) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₦</span>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" step="any" required
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-lg font-bold bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    category === c
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Add any additional notes..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all resize-none" />
          </div>

          <button type="submit" disabled={isPending}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 bg-red-500 hover:bg-red-600 transition-all active:scale-[0.98]">
            {isPending ? 'Saving...' : 'Record Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
