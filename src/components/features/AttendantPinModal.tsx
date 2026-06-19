import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { X, Lock, Delete, LogOut, ShieldCheck } from 'lucide-react';

interface Props { onClose: () => void; }

type Screen = 'menu' | 'attendant-pin' | 'exit-confirm';

export default function AttendantPinModal({ onClose }: Props) {
  const { user } = useAuth();
  const { setAttendantSession, isAttendantMode, attendantSession } = useApp();
  // If already in attendant mode, owner is calling this from admin side to exit
  const [screen, setScreen] = useState<Screen>(isAttendantMode ? 'exit-confirm' : 'menu');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (d: string) => { if (pin.length < 4) setPin(p => p + d); };
  const handleDelete = () => setPin(p => p.slice(0, -1));

  // Auto-submit when 4 digits entered
  const handlePinChange = async (newPin: string) => {
    if (newPin.length !== 4) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('attendants')
      .select('*')
      .eq('user_id', user!.id)
      .eq('pin', newPin)
      .single();
    setLoading(false);
    if (error || !data) {
      toast.error('Invalid PIN. Try again.');
      setPin('');
      return;
    }
    setAttendantSession({
      id: data.id,
      name: data.name,
      restricted: data.restricted_access,
    });
    toast.success(`Welcome, ${data.name}! 👋`);
    onClose();
  };

  const onDigitPress = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) handlePinChange(next);
  };

  const handleExitAttendant = () => {
    setAttendantSession(null);
    toast.success('Returned to owner mode');
    onClose();
  };

  const digits = ['1','2','3','4','5','6','7','8','9','','0','del'];

  // ── Menu screen: only option is hand device to an attendant ─────────────
  if (screen === 'menu') {
    return (
      <Backdrop onClose={onClose}>
        <ModalCard>
          <ModalHeader title="Staff Access" onClose={onClose} />
          <p className="text-gray-500 text-sm text-center mt-1 mb-6">
            Hand the device to a registered staff member. They will only be able to record cash entries.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setScreen('attendant-pin'); setPin(''); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-gray-900 font-semibold text-sm">Attendant Login</p>
                <p className="text-gray-500 text-xs mt-0.5">Enter staff 4-digit PIN to hand over device</p>
              </div>
            </button>
          </div>
        </ModalCard>
      </Backdrop>
    );
  }

  // ── Exit confirm screen ──────────────────────────────────────────────────
  if (screen === 'exit-confirm') {
    return (
      <Backdrop onClose={onClose}>
        <ModalCard>
          <ModalHeader title="Exit Attendant Mode" onClose={onClose} />
          <div className="flex flex-col items-center gap-3 my-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-gray-500 text-sm text-center">
              Return the device to owner mode. <br />
              <span className="text-gray-700 font-medium">{attendantSession?.name}</span> will be logged out of staff access.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button onClick={handleExitAttendant}
              className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all active:scale-[0.98]">
              Confirm Exit
            </button>
          </div>
        </ModalCard>
      </Backdrop>
    );
  }

  // ── Attendant PIN entry screen ───────────────────────────────────────────
  return (
    <Backdrop onClose={onClose}>
      <ModalCard>
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => { setScreen('menu'); setPin(''); }}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-3 h-3 text-gray-500" style={{ transform: 'rotate(45deg)' }} />
          </button>
          <h3 className="font-heading font-bold text-gray-900 flex-1">Attendant PIN</h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        <p className="text-gray-400 text-sm text-center mt-1 mb-5">
          Enter your 4-digit staff PIN
        </p>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`transition-all duration-200 rounded-full ${
              pin.length > i
                ? 'w-4 h-4 bg-blue-500 scale-110 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                : 'w-3.5 h-3.5 bg-gray-200'
            }`} />
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5">
              {digits.map((d, i) => (
                <button key={i} type="button"
                  onClick={() => d === 'del' ? handleDelete() : d ? onDigitPress(d) : undefined}
                  disabled={!d && d !== '0'}
                  className={`h-14 rounded-xl font-semibold text-lg transition-all active:scale-90 select-none ${
                    d === 'del'
                      ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      : d
                      ? 'bg-gray-100 text-gray-900 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100'
                      : 'invisible'
                  }`}
                >
                  {d === 'del' ? <Delete className="w-5 h-5 mx-auto" /> : d}
                </button>
              ))}
            </div>

            <p className="text-gray-400 text-xs text-center mt-4">
              PIN auto-submits on the 4th digit
            </p>
          </>
        )}
      </ModalCard>
    </Backdrop>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────
function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

function ModalCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-6 animate-[slide-in_0.2s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
      {children}
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
          <Lock className="w-4 h-4 text-blue-500" />
        </div>
        <h3 className="font-heading font-bold text-gray-900">{title}</h3>
      </div>
      <button onClick={onClose}
        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
        <X className="w-3.5 h-3.5 text-gray-500" />
      </button>
    </div>
  );
}
