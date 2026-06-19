import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Business } from '@/types';
import { Building2, ChevronDown, Check, Plus, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  compact?: boolean;
  onAddBusiness?: () => void;
}

export default function BusinessSwitcher({ compact, onAddBusiness }: Props) {
  const { user } = useAuth();
  const { activeBusinessId, setActiveBusinessId } = useApp();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ['businesses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const active = businesses.find(b => b.id === activeBusinessId);
  const displayName = active?.name || 'All Businesses';

  if (compact) {
    // Compact inline trigger for page headers
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-all max-w-[140px]"
        >
          <Building2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          <span className="text-blue-700 text-xs font-semibold truncate">{displayName}</span>
          <ChevronDown className={cn('w-3 h-3 text-blue-400 flex-shrink-0 transition-transform duration-200', open && 'rotate-180')} />
        </button>

        {open && (
          <DropdownPanel
            businesses={businesses}
            activeBusinessId={activeBusinessId}
            onSelect={(id) => { setActiveBusinessId(id); setOpen(false); }}
            onAdd={onAddBusiness}
            align="right"
          />
        )}
      </div>
    );
  }

  // Full-width header version (for sidebar / desktop)
  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 text-sm font-semibold truncate">{displayName}</p>
          <p className="text-gray-400 text-xs">{businesses.length} shop{businesses.length !== 1 ? 's' : ''} registered</p>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <DropdownPanel
          businesses={businesses}
          activeBusinessId={activeBusinessId}
          onSelect={(id) => { setActiveBusinessId(id); setOpen(false); }}
          onAdd={onAddBusiness}
          align="left"
          fullWidth
        />
      )}
    </div>
  );
}

// ── Shared Dropdown Panel ────────────────────────────────────────────────────
interface DropdownPanelProps {
  businesses: Business[];
  activeBusinessId: string | null;
  onSelect: (id: string | null) => void;
  onAdd?: () => void;
  align?: 'left' | 'right';
  fullWidth?: boolean;
}

function DropdownPanel({ businesses, activeBusinessId, onSelect, onAdd, align = 'left', fullWidth }: DropdownPanelProps) {
  return (
    <div
      className={cn(
        'absolute top-full mt-2 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden',
        'animate-[slide-in_0.15s_cubic-bezier(0.34,1.56,0.64,1)_forwards]',
        fullWidth ? 'left-0 right-0' : 'min-w-[200px]',
        align === 'right' ? 'right-0' : 'left-0'
      )}
    >
      {/* All businesses option */}
      <button
        onClick={() => onSelect(null)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Globe className="w-4 h-4 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-800 text-sm font-semibold">All Businesses</p>
          <p className="text-gray-400 text-xs">Combined view</p>
        </div>
        {!activeBusinessId && (
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </button>

      {businesses.length > 0 && <div className="border-t border-gray-50" />}

      {/* Business list */}
      {businesses.map((biz, i) => (
        <div key={biz.id}>
          {i > 0 && <div className="border-t border-gray-50" />}
          <button
            onClick={() => onSelect(biz.id)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50/50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-800 text-sm font-semibold truncate">{biz.name}</p>
              {biz.sector && <p className="text-gray-400 text-xs truncate">{biz.sector}</p>}
              {biz.address && !biz.sector && <p className="text-gray-400 text-xs truncate">{biz.address}</p>}
            </div>
            {activeBusinessId === biz.id && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        </div>
      ))}

      {/* Add business button — only if under 3 */}
      {businesses.length < 3 && (
        <>
          <div className="border-t border-gray-100" />
          <button
            onClick={onAdd}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Plus className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-emerald-600 text-sm font-semibold">Add New Business</p>
          </button>
        </>
      )}
    </div>
  );
}
