import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../types.js';

// In-memory user store (mock for MVP)
const users: Map<string, User> = new Map();
const emailIndex: Map<string, string> = new Map(); // email -> userId

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...val] = c.split('=');
      return [key, val.join('=')];
    })
  );
}

export async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Check if user already exists
      if (emailIndex.has(body.email)) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      // Create new user (mock password hashing - in production use bcrypt)
      const userId = uuidv4();
      const user: User = {
        id: userId,
        email: body.email,
        passwordHash: body.password, // Mock: in production use bcrypt
        createdAt: Date.now(),
      };

      users.set(userId, user);
      emailIndex.set(body.email, userId);

      // Generate JWT
      const token = fastify.jwt.sign(
        { userId: user.id, email: user.email },
        { expiresIn: '7d' }
      );

      reply.header('Set-Cookie', `token=${token}; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`);

      return reply.send({
        success: true,
        user: { id: user.id, email: user.email },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      throw error;
    }
  });

  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);

      // Find user
      const userId = emailIndex.get(body.email);
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const user = users.get(userId);
      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Mock password check - in production use bcrypt.compare
      if (user.passwordHash !== body.password) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = fastify.jwt.sign(
        { userId: user.id, email: user.email },
        { expiresIn: '7d' }
      );

      reply.header('Set-Cookie', `token=${token}; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`);

      return reply.send({
        success: true,
        user: { id: user.id, email: user.email },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      throw error;
    }
  });

  // Refresh token
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const cookieHeader = request.headers.cookie;
    const cookies = parseCookies(cookieHeader);
    const token = cookies.token;

    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    try {
      const decoded = fastify.jwt.verify(token) as { userId: string; email: string };
      const user = users.get(decoded.userId);

      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Generate new JWT
      const newToken = fastify.jwt.sign(
        { userId: user.id, email: user.email },
        { expiresIn: '7d' }
      );

      reply.header('Set-Cookie', `token=${newToken}; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`);

      return reply.send({
        success: true,
        token: newToken,
      });
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  // Logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Set-Cookie', 'token=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/');
    return reply.send({ success: true });
  });
}
