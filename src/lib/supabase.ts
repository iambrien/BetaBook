import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const toEmail = (phone: string): string =>
  `${phone.replace(/\D/g, '')}@betabook.ng`;

export const fromEmail = (email: string): string =>
  email.replace('@betabook.ng', '');
