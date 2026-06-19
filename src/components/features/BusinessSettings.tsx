import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Business } from '@/types';
import { toast } from 'sonner';
import { Building2, Plus, Trash2, MapPin, Briefcase } from 'lucide-react';

const SECTORS = ['Fashion/Clothing', 'Food/Drinks', 'Electronics', 'Beauty/Cosmetics', 'Provisions', 'Fabrics/Textiles', 'Hardware', 'Pharmacy', 'Agriculture', 'Other'];

export default function BusinessSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [address, setAddress] = useState('');

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ['businesses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('businesses').select('*').eq('user_id', user!.id).order('created_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('businesses').insert({
        user_id: user!.id, name, sector, address,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('Business added!');
      setShowForm(false); setName(''); setSector(''); setAddress('');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('businesses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['businesses'] }); toast.success('Business removed'); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{businesses.length}/3 businesses added</p>
        {businesses.length < 3 && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #1E3A8A, #2A4FA8)' }}>
            <Plus className="w-3.5 h-3.5" /> Add Business
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#1E3A8A]/10 space-y-3 animate-fade-up">
          <h4 className="font-semibold text-gray-800 text-sm">New Business</h4>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Business Name *" type="text"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1E3A8A]" />
          <select value={sector} onChange={e => setSector(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1E3A8A] bg-white">
            <option value="">Select Sector</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Market Address" type="text"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1E3A8A]" />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">Cancel</button>
            <button onClick={() => { if (!name) { toast.error('Enter business name'); return; } addMutation.mutate(); }}
              disabled={addMutation.isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              {addMutation.isPending ? 'Saving...' : 'Save Business'}
            </button>
          </div>
        </div>
      )}

      {businesses.length === 0 ? (
        <div className="text-center py-8">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No businesses yet</p>
          <p className="text-gray-400 text-xs">Add up to 3 shop locations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {businesses.map(biz => (
            <div key={biz.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-[#1E3A8A]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{biz.name}</p>
                    {biz.sector && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3 text-gray-400" />
                        <p className="text-gray-500 text-xs">{biz.sector}</p>
                      </div>
                    )}
                    {biz.address && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <p className="text-gray-400 text-xs">{biz.address}</p>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteMutation.mutate(biz.id)}
                  className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
