import type { FastifyRequest } from 'fastify';
import { supabaseAdmin } from './supabase.js';

export type ProfileStatus = 'pending' | 'active' | 'invited' | 'suspended';
export type GlobalRole = 'user' | 'admin' | 'support';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  accessToken: string;
  status: ProfileStatus;
  globalRole: GlobalRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  return Object.fromEntries(
    cookieHeader.split('; ').map((cookie) => {
      const [key, ...value] = cookie.split('=');
      return [key, value.join('=')];
    })
  );
}

export function getRequestToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookies = parseCookies(request.headers.cookie);
  return cookies.token || null;
}

function getAdminEmailAllowlist(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAIL_ALLOWLIST || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function ensureProfileRecord(user: { id: string; email?: string | null }) {
  const { error } = await supabaseAdmin.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name: user.email?.split('@')[0] ?? null,
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(`Failed to sync profile: ${error.message}`);
  }
}

async function ensureBootstrapAdmin(user: { id: string; email?: string | null }) {
  const email = user.email?.toLowerCase() ?? null;
  if (!email) return;

  if (!getAdminEmailAllowlist().has(email)) {
    return;
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      global_role: 'admin',
      status: 'active',
    })
    .eq('id', user.id);

  if (error) {
    throw new Error(`Failed to bootstrap admin profile: ${error.message}`);
  }
}

async function loadProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, status, global_role')
    .eq('id', userId)
    .single<{
      id: string;
      email: string | null;
      status: ProfileStatus;
      global_role: GlobalRole;
    }>();

  if (error || !data) {
    throw new Error(`Failed to load profile: ${error?.message || 'not found'}`);
  }

  return data;
}

async function verifySupabaseUser(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error('Invalid token');
  }

  return data.user;
}

function buildAuthenticatedUser(
  token: string,
  user: { id: string; email?: string | null },
  profile?: { status?: ProfileStatus; global_role?: GlobalRole }
): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email ?? null,
    accessToken: token,
    status: profile?.status ?? 'pending',
    globalRole: profile?.global_role ?? 'user',
  };
}

export async function getAuthenticatedUserSnapshot(request: FastifyRequest): Promise<AuthenticatedUser> {
  const token = getRequestToken(request);

  if (!token) {
    throw new Error('No token provided');
  }

  const supabaseUser = await verifySupabaseUser(token);

  try {
    await ensureProfileRecord(supabaseUser);
    await ensureBootstrapAdmin(supabaseUser);
    const profile = await loadProfile(supabaseUser.id);
    const user = buildAuthenticatedUser(token, supabaseUser, profile);
    request.user = user;
    return user;
  } catch (error) {
    const user = buildAuthenticatedUser(token, supabaseUser);
    request.user = user;
    return user;
  }
}

export async function authenticateRequest(
  request: FastifyRequest,
  options: { requireActive?: boolean } = {}
): Promise<AuthenticatedUser> {
  const requireActive = options.requireActive ?? true;
  const token = getRequestToken(request);

  if (!token) {
    throw new Error('No token provided');
  }

  const supabaseUser = await verifySupabaseUser(token);
  await ensureProfileRecord(supabaseUser);
  await ensureBootstrapAdmin(supabaseUser);
  const profile = await loadProfile(supabaseUser.id);
  const user = buildAuthenticatedUser(token, supabaseUser, profile);

  if (requireActive && profile.status !== 'active') {
    const authError = new Error(
      profile.status === 'suspended' ? 'Account suspended' : 'Pending approval'
    ) as Error & { statusCode?: number; code?: string };
    authError.statusCode = 403;
    authError.code = profile.status === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'PENDING_APPROVAL';
    throw authError;
  }

  request.user = user;
  return user;
}
