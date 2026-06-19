import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Attendant } from '@/types';
import { toast } from 'sonner';
import {
  Users, Plus, Trash2, Phone, Hash, Shield, ShieldOff,
  ChevronDown, X, Eye, EyeOff, Info,
} from 'lucide-react';

export default function AttendantSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [restricted, setRestricted] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: attendants = [], isLoading } = useQuery<Attendant[]>({
    queryKey: ['attendants', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendants')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('attendants').insert({
        user_id: user!.id,
        name: name.trim(),
        phone: phone.trim() || null,
        pin,
        restricted_access: restricted,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendants'] });
      toast.success(`${name} added as attendant!`);
      setShowForm(false);
      setName(''); setPhone(''); setPin(''); setRestricted(true);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add attendant'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attendants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendants'] });
      toast.success('Attendant removed');
    },
  });

  const toggleRestriction = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase
        .from('attendants')
        .update({ restricted_access: val })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendants'] }),
  });

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Enter attendant name'); return; }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { toast.error('PIN must be exactly 4 digits'); return; }
    addMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-xs leading-relaxed">
          Attendants use a 4-digit PIN to access the device in staff mode. Their entries are saved to your account under the active business. Restricted access hides financial stats, history, AI chat, and settings.
        </p>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm font-medium">
          {isLoading ? '...' : `${attendants.length} attendant${attendants.length !== 1 ? 's' : ''} registered`}
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all active:scale-95"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add Attendant'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 animate-[slide-in_0.15s_ease_forwards]">
          <h4 className="font-semibold text-gray-800 text-sm">New Staff Member</h4>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Amaka, Emeka..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="08012345678"
                type="tel"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">4-Digit PIN *</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="e.g. 1234"
                type={showPin ? 'text' : 'password'}
                maxLength={4}
                className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-mono tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex gap-1 mt-1.5">
              {[0,1,2,3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${pin.length > i ? 'bg-blue-500' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          {/* Restricted access toggle */}
          <button
            type="button"
            onClick={() => setRestricted(!restricted)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-all"
          >
            <div className="flex items-center gap-2.5">
              {restricted
                ? <ShieldOff className="w-4 h-4 text-amber-500" />
                : <Shield className="w-4 h-4 text-emerald-500" />}
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">
                  {restricted ? 'Restricted Access' : 'Full Access'}
                </p>
                <p className="text-xs text-gray-400">
                  {restricted
                    ? 'Can only record cash entries'
                    : 'Can view stats and all data'}
                </p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-all ${restricted ? 'bg-blue-500' : 'bg-gray-200'}`}>
              <span className={`block w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${restricted ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); setName(''); setPhone(''); setPin(''); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={addMutation.isPending || !name || pin.length !== 4}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold transition-all active:scale-[0.98]"
            >
              {addMutation.isPending ? 'Saving...' : 'Add Attendant'}
            </button>
          </div>
        </div>
      )}

      {/* Attendant list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : attendants.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm font-medium">No attendants yet</p>
          <p className="text-gray-400 text-xs mt-1">Add store staff to let them record shop entries</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {attendants.map(att => (
            <AttendantCard
              key={att.id}
              att={att}
              expanded={expandedId === att.id}
              onToggleExpand={() => setExpandedId(expandedId === att.id ? null : att.id)}
              onDelete={() => deleteMutation.mutate(att.id)}
              onToggleRestriction={() =>
                toggleRestriction.mutate({ id: att.id, val: !att.restricted_access })
              }
              deleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Attendant Card ────────────────────────────────────────────────────────────
interface CardProps {
  att: Attendant;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onToggleRestriction: () => void;
  deleting: boolean;
}

function AttendantCard({ att, expanded, onToggleExpand, onDelete, onToggleRestriction, deleting }: CardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-blue-600 font-bold text-sm">{att.name[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-semibold text-sm">{att.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {att.restricted_access ? (
              <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
                <ShieldOff className="w-3 h-3" /> Restricted
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                <Shield className="w-3 h-3" /> Full Access
              </span>
            )}
            {att.phone && (
              <span className="text-gray-400 text-xs truncate">· {att.phone}</span>
            )}
          </div>
        </div>
        <button
          onClick={onToggleExpand}
          className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-2.5 animate-[slide-in_0.12s_ease_forwards]">
          {/* PIN display */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <Hash className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500 text-xs font-medium flex-1">PIN</span>
            <span className="text-gray-700 font-mono font-bold text-sm tracking-[6px]">••••</span>
          </div>

          {/* Toggle restriction */}
          <button
            onClick={onToggleRestriction}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-sm font-medium ${
              att.restricted_access
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {att.restricted_access
              ? <><Shield className="w-3.5 h-3.5" /> Grant Full Access</>
              : <><ShieldOff className="w-3.5 h-3.5" /> Restrict Access</>}
          </button>

          {/* Delete */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 text-sm font-medium transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove Attendant
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={onDelete} disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-all disabled:opacity-60">
                {deleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
