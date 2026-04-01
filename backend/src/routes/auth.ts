import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAuth } from '../lib/supabase.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function mapAuthErrorStatus(message: string): number {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) return 401;
  if (normalized.includes('already registered')) return 409;
  if (normalized.includes('weak password')) return 400;
  return 400;
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);
      const { data, error } = await supabaseAuth.auth.signUp({
        email: body.email,
        password: body.password,
        options: {
          data: {
            name: body.email.split('@')[0],
          },
        },
      });

      if (error) {
        return reply.status(mapAuthErrorStatus(error.message)).send({ error: error.message });
      }

      return reply.send({
        success: true,
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
        token: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null,
        requiresEmailConfirmation: !data.session,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      throw error;
    }
  });

  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (error || !data.user || !data.session) {
        return reply
          .status(mapAuthErrorStatus(error?.message || 'Invalid credentials'))
          .send({ error: error?.message || 'Invalid credentials' });
      }

      return reply.send({
        success: true,
        user: { id: data.user.id, email: data.user.email },
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      throw error;
    }
  });

  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = refreshSchema.parse(request.body);
      const { data, error } = await supabaseAuth.auth.refreshSession({
        refresh_token: body.refreshToken,
      });

      if (error || !data.session) {
        return reply.status(401).send({ error: error?.message || 'Invalid refresh token' });
      }

      return reply.send({
        success: true,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ success: true });
  });
}
