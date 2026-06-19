import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { formatNaira, formatDate, buildWhatsAppLink } from '@/lib/utils';
import { Transaction } from '@/types';
import { CreditCard, MessageCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DebtTracker() {
  const { user } = useAuth();
  const { activeBusinessId } = useApp();

  const { data: debts = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['debts', user?.id, activeBusinessId],
    queryFn: async () => {
      let q = supabase.from('transactions').select('*')
        .eq('user_id', user!.id)
        .eq('type', 'income')
        .eq('payment_status', 'credit')
        .order('created_at', { ascending: false });
      if (activeBusinessId) q = q.eq('business_id', activeBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const totalOwed = debts.reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Debt Tracker</h3>
          {debts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-xs font-semibold">
              {debts.length}
            </span>
          )}
        </div>
        {totalOwed > 0 && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Total: {formatNaira(totalOwed)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : debts.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-gray-600 text-sm font-medium">All clear!</p>
          <p className="text-gray-400 text-xs mt-1">No outstanding customer debts</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {debts.map((debt) => (
            <DebtRow key={debt.id} debt={debt} userId={user!.id} businessId={activeBusinessId} />
          ))}
        </div>
      )}
    </div>
  );
}

function DebtRow({ debt, userId, businessId }: { debt: Transaction; userId: string; businessId: string | null }) {
  const qc = useQueryClient();
  const hasPhone = !!debt.customer_phone;

  const { mutate: markPaid, isPending } = useMutation({
    mutationFn: async () => {
      // Only update the existing credit transaction to 'paid' — never insert a new one
      const { error } = await supabase
        .from('transactions')
        .update({ payment_status: 'paid' })
        .eq('id', debt.id)
        .eq('payment_status', 'credit'); // guard: only update if still credit
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['transactions-recent'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success(`${debt.customer_name || 'Customer'} marked as paid! 🎉`);
      // Optional WhatsApp thank you
      if (hasPhone) {
        const msg = `Hello ${debt.customer_name}! 🙏\n\nThank you for your payment of *₦${Number(debt.amount).toLocaleString()}* for *${debt.item_name || 'goods'}*.\n\nYour account is now cleared. We appreciate your business!\n\n_BetaBook_`;
        const cleanPhone = debt.customer_phone!.replace(/\D/g, '');
        const intlPhone = cleanPhone.startsWith('0') ? `234${cleanPhone.slice(1)}` : cleanPhone;
        window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update'),
  });

  const handleWhatsApp = () => {
    if (!hasPhone) return;
    const link = buildWhatsAppLink(
      debt.customer_phone!, debt.customer_name || 'Customer',
      debt.amount, debt.item_name || 'goods', debt.created_at
    );
    window.open(link, '_blank');
  };

  return (
    <div className="px-4 py-3.5 hover:bg-amber-50/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-gray-800 text-sm font-semibold truncate">
              {debt.customer_name || 'Unknown Customer'}
            </p>
            <p className="text-amber-600 font-bold text-sm flex-shrink-0">{formatNaira(debt.amount)}</p>
          </div>
          <p className="text-gray-500 text-xs mt-0.5 truncate">
            {debt.item_name || 'Goods'} · {formatDate(debt.created_at)}
          </p>
          {debt.customer_phone && (
            <p className="text-gray-400 text-xs mt-0.5">{debt.customer_phone}</p>
          )}
          <div className="flex items-center gap-2 mt-2.5">
            <button onClick={() => markPaid()} disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-50">
              <CheckCircle className="w-3 h-3" />
              {isPending ? 'Saving...' : 'Mark as Paid'}
            </button>
            <button onClick={handleWhatsApp} disabled={!hasPhone}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40 bg-[#25D366] hover:bg-[#1ebe5b]">
              <MessageCircle className="w-3 h-3" />
              Remind
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
