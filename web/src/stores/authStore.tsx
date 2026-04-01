import { create } from 'zustand';
import { ReactNode, useEffect } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const AUTH_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

interface User {
  id: string;
  email: string;
  name?: string;
}

type ApprovalStatus = 'pending' | 'active' | 'invited' | 'suspended' | null;

interface AuthState {
  initialized: boolean;
  token: string | null;
  user: User | null;
  status: ApprovalStatus;
  globalRole: string | null;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
  refreshProfile: () => Promise<void>;
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
  status: null,
  globalRole: null,

  setSession: (session) =>
    set({
      token: session?.access_token ?? null,
      user: mapUser(session?.user ?? null),
      status: session ? get().status : null,
      globalRole: session ? get().globalRole : null,
    }),

  setInitialized: (initialized) => set({ initialized }),

  refreshProfile: async () => {
    const token = get().token;

    if (!token) {
      set({ status: null, globalRole: null });
      return;
    }

    const response = await fetch(`${AUTH_API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await response
      .json()
      .catch(() => ({ error: 'Failed to load profile' })) as {
        error?: string;
        code?: string;
        user?: {
          id: string;
          email: string;
          status: ApprovalStatus;
          globalRole: string | null;
        };
      };

    if (!response.ok || !body.user) {
      if (response.status === 401) {
        await supabase.auth.signOut();
        set({ token: null, user: null, status: null, globalRole: null });
        return;
      }

      throw new Error(body.error || 'Failed to load profile');
    }

    set({
      user: {
        id: body.user.id,
        email: body.user.email,
        name: get().user?.name,
      },
      status: body.user.status,
      globalRole: body.user.globalRole,
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ token: null, user: null, status: null, globalRole: null });
  },

  isAuthenticated: () => !!get().token,
}));

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let isMounted = true;

    const syncProfile = async (session: Session | null) => {
      try {
        if (session) {
          await useAuthStore.getState().refreshProfile();
        } else {
          useAuthStore.setState({ status: null, globalRole: null });
        }
      } catch (error) {
        console.error('Failed to refresh profile:', error);
        await supabase.auth.signOut();
        useAuthStore.setState({
          token: null,
          user: null,
          status: null,
          globalRole: null,
        });
      } finally {
        if (isMounted) {
          useAuthStore.getState().setInitialized(true);
        }
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      useAuthStore.getState().setSession(data.session);
      void syncProfile(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.getState().setSession(session);
      void syncProfile(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
