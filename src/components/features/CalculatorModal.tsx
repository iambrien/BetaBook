import { useState, useCallback, useEffect } from 'react';
import { X, Delete, Copy, TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CalculatorModalProps {
  onClose: () => void;
  onUseCashIn?: (amount: number) => void;
  onUseCashOut?: (amount: number) => void;
}

type CalcOp = '+' | '-' | '×' | '÷' | null;

const MAX_DISPLAY_LEN = 14;

export default function CalculatorModal({ onClose, onUseCashIn, onUseCashOut }: CalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<CalcOp>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState('');
  const [resultShown, setResultShown] = useState(false);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
      setResultShown(false);
    } else {
      if (display === '0' && digit !== '.') {
        setDisplay(digit);
      } else if (digit === '.' && display.includes('.')) {
        return;
      } else if (display.replace(/[^0-9]/g, '').length >= MAX_DISPLAY_LEN) {
        return;
      } else {
        setDisplay(prev => prev + digit);
      }
      setResultShown(false);
    }
  }, [display, waitingForOperand]);

  const inputOperator = useCallback((op: CalcOp) => {
    const current = parseFloat(display.replace(/,/g, ''));
    if (prevValue !== null && !waitingForOperand) {
      const result = compute(prevValue, current, operator);
      const formatted = formatDisplay(result);
      setDisplay(formatted);
      setPrevValue(result);
      setExpression(`${formatDisplay(result)} ${op}`);
    } else {
      setPrevValue(current);
      setExpression(`${formatDisplay(current)} ${op}`);
    }
    setOperator(op);
    setWaitingForOperand(true);
    setResultShown(false);
  }, [display, operator, prevValue, waitingForOperand]);

  const calculate = useCallback(() => {
    const current = parseFloat(display.replace(/,/g, ''));
    if (prevValue === null || operator === null) return;
    const fullExpr = `${expression} ${formatDisplay(current)} =`;
    const result = compute(prevValue, current, operator);
    const formatted = formatDisplay(result);
    setExpression(fullExpr);
    setDisplay(formatted);
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setResultShown(true);
  }, [display, expression, operator, prevValue]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setExpression('');
    setResultShown(false);
  }, []);

  const backspace = useCallback(() => {
    if (resultShown) { clear(); return; }
    if (display.length <= 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(prev => prev.slice(0, -1));
    }
  }, [display, resultShown, clear]);

  const toggleSign = useCallback(() => {
    if (display === '0') return;
    setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
  }, [display]);

  const percentage = useCallback(() => {
    const val = parseFloat(display.replace(/,/g, ''));
    if (prevValue !== null) {
      setDisplay(formatDisplay(prevValue * val / 100));
    } else {
      setDisplay(formatDisplay(val / 100));
    }
    setResultShown(false);
  }, [display, prevValue]);

  const copyResult = useCallback(() => {
    const raw = display.replace(/,/g, '');
    navigator.clipboard.writeText(raw).then(() => toast.success('Amount copied!')).catch(() => {});
  }, [display]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key);
      else if (e.key === '.') inputDigit('.');
      else if (e.key === '+') inputOperator('+');
      else if (e.key === '-') inputOperator('-');
      else if (e.key === '*') inputOperator('×');
      else if (e.key === '/') { e.preventDefault(); inputOperator('÷'); }
      else if (e.key === 'Enter' || e.key === '=') calculate();
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'c' || e.key === 'C') clear();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [inputDigit, inputOperator, calculate, backspace, clear, onClose]);

  const numericValue = parseFloat(display.replace(/,/g, ''));
  const isValidAmount = !isNaN(numericValue) && numericValue > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Calculator Panel */}
      <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-white rounded-3xl shadow-2xl overflow-hidden animate-[slide-up_0.3s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-500 flex items-center justify-center">
              <Calculator className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-heading font-bold text-gray-900 text-sm">Calculator</span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Display */}
        <div className="px-5 py-3 bg-slate-50 mx-4 rounded-2xl mb-4 min-h-[90px] flex flex-col justify-end items-end">
          {/* Expression */}
          <p className="text-gray-400 text-xs font-medium min-h-[16px] truncate w-full text-right">
            {expression || '\u00A0'}
          </p>
          {/* Main number */}
          <p className={cn(
            'font-heading font-bold text-gray-900 mt-1 leading-none text-right w-full overflow-hidden',
            display.length > 10 ? 'text-2xl' : display.length > 7 ? 'text-3xl' : 'text-4xl'
          )}>
            ₦{addCommas(display)}
          </p>
          {/* Current operator indicator */}
          {operator && !resultShown && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">{operator}</span>
            </div>
          )}
        </div>

        {/* Buttons Grid */}
        <div className="px-4 pb-4 grid grid-cols-4 gap-2.5">
          {/* Row 1: AC, +/-, %, ÷ */}
          <CalcBtn label="AC" onClick={clear} variant="utility" />
          <CalcBtn label="+/-" onClick={toggleSign} variant="utility" />
          <CalcBtn label="%" onClick={percentage} variant="utility" />
          <CalcBtn label="÷" onClick={() => inputOperator('÷')} variant="operator" active={operator === '÷'} />

          {/* Row 2: 7, 8, 9, × */}
          <CalcBtn label="7" onClick={() => inputDigit('7')} />
          <CalcBtn label="8" onClick={() => inputDigit('8')} />
          <CalcBtn label="9" onClick={() => inputDigit('9')} />
          <CalcBtn label="×" onClick={() => inputOperator('×')} variant="operator" active={operator === '×'} />

          {/* Row 3: 4, 5, 6, - */}
          <CalcBtn label="4" onClick={() => inputDigit('4')} />
          <CalcBtn label="5" onClick={() => inputDigit('5')} />
          <CalcBtn label="6" onClick={() => inputDigit('6')} />
          <CalcBtn label="−" onClick={() => inputOperator('-')} variant="operator" active={operator === '-'} />

          {/* Row 4: 1, 2, 3, + */}
          <CalcBtn label="1" onClick={() => inputDigit('1')} />
          <CalcBtn label="2" onClick={() => inputDigit('2')} />
          <CalcBtn label="3" onClick={() => inputDigit('3')} />
          <CalcBtn label="+" onClick={() => inputOperator('+')} variant="operator" active={operator === '+'} />

          {/* Row 5: 0 (wide), ., ⌫, = */}
          <CalcBtn label="0" onClick={() => inputDigit('0')} wide />
          <CalcBtn label="." onClick={() => inputDigit('.')} />
          <CalcBtn label="⌫" onClick={backspace} icon={<Delete className="w-4 h-4" />} />
          <CalcBtn label="=" onClick={calculate} variant="equals" />
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-5 grid grid-cols-3 gap-2">
          <button
            onClick={copyResult}
            disabled={!isValidAmount}
            className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
          <button
            onClick={() => { if (isValidAmount && onUseCashIn) { onUseCashIn(numericValue); onClose(); } }}
            disabled={!isValidAmount}
            className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Cash In
          </button>
          <button
            onClick={() => { if (isValidAmount && onUseCashOut) { onUseCashOut(numericValue); onClose(); } }}
            disabled={!isValidAmount}
            className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Cash Out
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="hidden sm:block text-center text-gray-300 text-[10px] pb-3">
          Keyboard supported · Esc to close
        </p>
      </div>
    </div>
  );
}

// ── Helper: compute ─────────────────────────────────────────────────────────
function compute(a: number, b: number, op: CalcOp): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b !== 0 ? a / b : 0;
    default: return b;
  }
}

function formatDisplay(val: number): string {
  if (isNaN(val) || !isFinite(val)) return '0';
  // Remove floating point noise
  const rounded = parseFloat(val.toPrecision(10));
  return String(rounded);
}

function addCommas(raw: string): string {
  const isNeg = raw.startsWith('-');
  const str = isNeg ? raw.slice(1) : raw;
  const [int, dec] = str.split('.');
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (isNeg ? '-' : '') + formatted + (dec !== undefined ? '.' + dec : '');
}

// ── CalcBtn ──────────────────────────────────────────────────────────────────
interface CalcBtnProps {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'utility' | 'operator' | 'equals';
  active?: boolean;
  wide?: boolean;
  icon?: React.ReactNode;
}

function CalcBtn({ label, onClick, variant = 'default', active = false, wide = false, icon }: CalcBtnProps) {
  const [pressed, setPressed] = useState(false);

  const base = 'flex items-center justify-center rounded-2xl font-semibold text-lg h-[58px] select-none transition-all duration-100 active:scale-[0.93]';

  const styles = {
    default: 'bg-white border border-gray-100 text-gray-800 hover:bg-gray-50 shadow-sm',
    utility: 'bg-slate-100 text-gray-600 hover:bg-slate-200',
    operator: active
      ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
      : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    equals: 'bg-blue-500 text-white shadow-md shadow-blue-200 hover:bg-blue-600',
  };

  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className={cn(base, styles[variant], wide && 'col-span-2')}
      style={{ transform: pressed ? 'scale(0.92)' : 'scale(1)' }}
    >
      {icon || label}
    </button>
  );
}
