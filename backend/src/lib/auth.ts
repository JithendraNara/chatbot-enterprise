import type { FastifyRequest } from 'fastify';
import { supabaseAdmin } from './supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  accessToken: string;
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

export async function authenticateRequest(request: FastifyRequest): Promise<AuthenticatedUser> {
  const token = getRequestToken(request);

  if (!token) {
    throw new Error('No token provided');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error('Invalid token');
  }

  const user: AuthenticatedUser = {
    id: data.user.id,
    email: data.user.email ?? null,
    accessToken: token,
  };

  request.user = user;
  return user;
}
