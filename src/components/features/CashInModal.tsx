import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { X, TrendingUp, User, Phone } from 'lucide-react';

interface Props { onClose: () => void; initialAmount?: number; }

export default function CashInModal({ onClose, initialAmount }: Props) {
  const { user } = useAuth();
  const { activeBusinessId } = useApp();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [itemName, setItemName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'credit'>('paid');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('transactions').insert({
        user_id: user!.id,
        business_id: activeBusinessId || null,
        type: 'income',
        amount: parseFloat(amount),
        item_name: itemName || null,
        payment_status: paymentStatus,
        customer_name: paymentStatus === 'credit' ? customerName : null,
        customer_phone: paymentStatus === 'credit' ? customerPhone : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['transactions-recent'] });
      qc.invalidateQueries({ queryKey: ['analytics-txns'] });
      toast.success('Cash In recorded!');
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (paymentStatus === 'credit' && !customerName) { toast.error('Enter customer name for credit sale'); return; }
    mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl animate-[fade-up_0.25s_ease-out_forwards]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-heading font-bold text-gray-900">Add Cash In</h3>
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
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Item / Product Name</label>
            <input value={itemName} onChange={e => setItemName(e.target.value)} type="text"
              placeholder="e.g. Ankara fabric, Rice bag..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Status</label>
            <div className="flex gap-3">
              {(['paid', 'credit'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setPaymentStatus(s)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    paymentStatus === s
                      ? s === 'paid'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>
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
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} type="text" required
                  placeholder="Customer name"
                  className="w-full pl-10 pr-4 py-2.5 border border-amber-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400 transition-all" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel"
                  placeholder="Phone for WhatsApp reminder"
                  className="w-full pl-10 pr-4 py-2.5 border border-amber-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400 transition-all" />
              </div>
            </div>
          )}

          <button type="submit" disabled={isPending}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 bg-emerald-500 hover:bg-emerald-600 transition-all active:scale-[0.98]">
            {isPending ? 'Saving...' : 'Record Cash In'}
          </button>
        </form>
      </div>
    </div>
  );
}
