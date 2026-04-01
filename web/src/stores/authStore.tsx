import { create } from 'zustand';
import { ReactNode, useEffect } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  initialized: boolean;
  token: string | null;
  user: User | null;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
}

function mapUser(user: SupabaseUser | null): User | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    name:
      (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
      undefined,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  token: null,
  user: null,

  setSession: (session) =>
    set({
      token: session?.access_token ?? null,
      user: mapUser(session?.user ?? null),
    }),

  setInitialized: (initialized) => set({ initialized }),

  logout: async () => {
    await supabase.auth.signOut();
    set({ token: null, user: null });
  },

  isAuthenticated: () => !!get().token,
}));

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      useAuthStore.getState().setSession(data.session);
      useAuthStore.getState().setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.getState().setSession(session);
      useAuthStore.getState().setInitialized(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
