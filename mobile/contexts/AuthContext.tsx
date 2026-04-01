import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getCurrentUser } from '../lib/api';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name?: string;
}

type ApprovalStatus = 'pending' | 'active' | 'invited' | 'suspended' | null;

interface AuthContextType {
  token: string | null;
  user: User | null;
  status: ApprovalStatus;
  globalRole: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name:
      (typeof supabaseUser.user_metadata?.name === 'string' && supabaseUser.user_metadata.name) ||
      (typeof supabaseUser.user_metadata?.full_name === 'string' &&
        supabaseUser.user_metadata.full_name) ||
      undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<ApprovalStatus>(null);
  const [globalRole, setGlobalRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const applySession = (session: Session | null) => {
      setToken(session?.access_token ?? null);
      setUser(mapUser(session?.user ?? null));
      if (!session) {
        setStatus(null);
        setGlobalRole(null);
      }
    };

    const syncProfile = async (session: Session | null) => {
      try {
        if (session) {
          await refreshProfile(session.access_token);
        }
      } catch (error) {
        console.error('Failed to refresh profile:', error);
        await supabase.auth.signOut();
        if (isMounted) {
          setToken(null);
          setUser(null);
          setStatus(null);
          setGlobalRole(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      applySession(data.session);
      void syncProfile(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
      void syncProfile(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async (providedToken?: string) => {
    const currentToken = providedToken || token;
    if (!currentToken) {
      setStatus(null);
      setGlobalRole(null);
      return;
    }

    const profile = await getCurrentUser(currentToken);
    setUser((current) =>
      current
        ? {
            ...current,
            email: profile.email || current.email,
          }
        : current
    );
    setStatus(profile.status);
    setGlobalRole(profile.globalRole);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    const emailRedirectTo = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
        data: {
          name: email.split('@')[0],
        },
      },
    });

    if (error) {
      throw error;
    }

    return {
      requiresEmailConfirmation: !data.session,
    };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ token, user, status, globalRole, signIn, signUp, refreshProfile, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
