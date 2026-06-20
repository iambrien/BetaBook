export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  sector?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  business_id?: string;
  type: 'income' | 'expense';
  amount: number;
  item_name?: string;
  payment_status?: 'paid' | 'credit';
  customer_name?: string;
  customer_phone?: string;
  category?: string;
  notes?: string;
  created_at: string;
}

export interface Attendant {
  id: string;
  user_id: string;
  business_id?: string;
  name: string;
  phone?: string;
  pin: string;
  restricted_access: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type TabView = 'home' | 'analytics' | 'transactions' | 'chat' | 'settings';
export type AuthMode = 'signin' | 'signup';
