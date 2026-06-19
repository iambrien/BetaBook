import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNaira = (amount: number): string =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
  if (diffHrs < 48) return 'Yesterday';
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

export const formatFullDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

export const buildWhatsAppLink = (
  phone: string,
  customerName: string,
  amount: number,
  itemName: string,
  date: string
): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  const intlPhone = cleanPhone.startsWith('0') ? `234${cleanPhone.slice(1)}` : cleanPhone;
  const msg = `Hello ${customerName}! 👋\n\nThis is a friendly reminder from your trader.\n\nYou still have an outstanding balance of *₦${amount.toLocaleString()}* for *${itemName}* purchased on ${formatFullDate(date)}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you! 🙏\n\n_Sent via BetaBook_`;
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
};

export const generateId = (): string =>
  Math.random().toString(36).slice(2, 9);
