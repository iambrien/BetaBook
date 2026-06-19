import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Mail, Lock, User, BookOpen, TrendingUp, ArrowLeft, RefreshCw } from 'lucide-react';
import { AuthMode } from '@/types';

type Step = 'form' | 'otp';

export default function IntroPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill all required fields'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Enter a valid email address'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, fullName);
        // signUp resolved with a session → AuthContext sets user → App.tsx redirects
        toast.success('Welcome to BetaBook!');
      } else {
        await signIn(email, password);
        toast.success('Welcome back!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (
        msg === 'CHECK_EMAIL' ||
        msg.toLowerCase().includes('email not confirmed') ||
        msg.toLowerCase().includes('confirmation')
      ) {
        // Backend sent OTP — show the code input screen
        setOtp(['', '', '', '']);
        setStep('otp');
        setResendCooldown(60);
        toast.success('Check your Gmail — a 4-digit code was sent!');
        setLoading(false);
      } else if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid_credentials') || msg.toLowerCase().includes('invalid credentials')) {
        toast.error('Incorrect email or password.');
        setLoading(false);
      } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered') || msg.toLowerCase().includes('user already')) {
        toast.error('Email already registered — sign in instead.');
        setMode('signin');
        setLoading(false);
      } else {
        toast.error(msg);
        setLoading(false);
      }
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 4 digits entered
    if (digit && index === 3 && next.every(d => d !== '')) {
      verifyCode(next.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const next = pasted.split('');
      setOtp(next);
      inputRefs.current[3]?.focus();
      verifyCode(pasted);
    }
  };

  const verifyCode = async (code: string) => {
    if (code.length !== 4) { toast.error('Enter the full 4-digit code'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });
      if (error) throw error;
      // verifyOtp logs the user in — onAuthStateChange in AuthContext fires SIGNED_IN
      // which sets user → App.tsx renders AppLayout automatically
      if (data.user) {
        toast.success('Email verified! Welcome to BetaBook 🎉');
      }
      // Don't reset loading — navigation will unmount this component
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('otp')) {
        toast.error('Code is wrong or expired. Try again or request a new one.');
      } else {
        toast.error(msg);
      }
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setResendCooldown(60);
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
      toast.success('New code sent to your Gmail!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not resend code');
    }
  };

  // ── OTP Verification Screen ──────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div className="h-full auth-bg flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
            {/* Back button */}
            <button
              onClick={() => { setStep('form'); setLoading(false); }}
              className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-xs font-medium mb-5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>

            <h2 className="text-gray-900 font-heading font-bold text-xl text-center mb-1">Check your Gmail</h2>
            <p className="text-gray-500 text-sm text-center mb-1">
              We sent a <span className="font-semibold text-gray-700">4-digit code</span> to
            </p>
            <p className="text-blue-600 font-semibold text-sm text-center mb-6 truncate">{email}</p>

            {/* 4-digit OTP boxes */}
            <div className="flex items-center justify-center gap-3 mb-6" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none
                    ${digit
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-gray-50 text-gray-900'}
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
                  autoFocus={i === 0}
                  disabled={loading}
                />
              ))}
            </div>

            {/* Verify button */}
            <button
              onClick={() => verifyCode(otp.join(''))}
              disabled={loading || otp.some(d => !d)}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all bg-blue-500 hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200">
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                : 'Verify & Continue'}
            </button>

            {/* Resend */}
            <div className="text-center mt-4">
              {resendCooldown > 0 ? (
                <p className="text-gray-400 text-xs">
                  Resend code in <span className="font-semibold text-gray-600">{resendCooldown}s</span>
                </p>
              ) : (
                <button onClick={handleResend}
                  className="flex items-center justify-center gap-1.5 mx-auto text-blue-500 hover:text-blue-700 text-xs font-semibold transition-colors">
                  <RefreshCw className="w-3 h-3" /> Resend Code
                </button>
              )}
            </div>
          </div>
          <p className="text-center text-gray-400 text-xs mt-4">Didn't see it? Check your Spam folder too</p>
        </div>
      </div>
    );
  }

  // ── Main Auth Form ───────────────────────────────────────────────────────
  return (
    <div className="h-full auth-bg flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
            <BookOpen className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">BetaBook</h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Smart Market Ledger
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Tab Toggle */}
          <div className="flex rounded-xl overflow-hidden mb-6 bg-gray-100 p-1">
            {(['signin', 'signup'] as AuthMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name (optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Amaka Okafor" type="text"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" type="email" required
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters" type={showPw ? 'text' : 'password'} required
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-60 bg-blue-500 hover:bg-blue-600 active:scale-[0.98] shadow-sm shadow-blue-200 mt-2">
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                  </span>
                : mode === 'signin' ? 'Sign In' : 'Create My Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-5">
          By continuing, you agree to BetaBook's Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
