import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser> & { password?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapUser(user: User, profile?: { full_name?: string; avatar_url?: string; phone?: string } | null): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    full_name: profile?.full_name || user.user_metadata?.full_name,
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
    phone: profile?.phone,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url, phone')
          .eq('id', session.user.id)
          .single();
        if (mounted) setUser(mapUser(session.user, profile));
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        supabase.from('user_profiles').select('full_name, avatar_url, phone').eq('id', session.user.id).single().then(({ data: profile }) => {
          if (mounted) setUser(mapUser(session.user, profile));
        });
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(prev => prev ? { ...prev } : mapUser(session.user));
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || '' } },
    });
    if (error) throw error;

    // Email confirmation is disabled — session is available immediately
    if (data.session && data.user) {
      setUser(mapUser(data.user));
      return;
    }

    // Edge case: confirmation email was sent (should not happen with our config)
    // Auto sign-in so the user isn't stuck
    if (data.user && !data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInError && signInData.user) {
        setUser(mapUser(signInData.user));
        return;
      }
      // If auto sign-in fails (unconfirmed), throw a clear message
      throw new Error('CHECK_EMAIL');
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (data: Partial<AuthUser> & { password?: string }) => {
    const updates: Record<string, unknown> = {};
    const metaUpdates: Record<string, string> = {};

    if (data.password) updates.password = data.password;
    if (data.full_name !== undefined) metaUpdates.full_name = data.full_name || '';
    if (data.avatar_url !== undefined) metaUpdates.avatar_url = data.avatar_url || '';

    if (Object.keys(metaUpdates).length > 0) updates.data = metaUpdates;

    const { data: updated, error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
    if (updated.user) setUser(mapUser(updated.user));

    await supabase.from('user_profiles').upsert({
      id: user!.id,
      email: user!.email,
      full_name: data.full_name ?? user?.full_name,
      avatar_url: data.avatar_url ?? user?.avatar_url,
      phone: data.phone ?? user?.phone,
    });
    // Refresh local user state with latest profile
    const { data: freshProfile } = await supabase
      .from('user_profiles')
      .select('full_name, avatar_url, phone')
      .eq('id', user!.id)
      .single();
    if (freshProfile && updated.user) setUser(mapUser(updated.user, freshProfile));
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
