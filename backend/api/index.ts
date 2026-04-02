import type { VercelRequest, VercelResponse } from '@vercel/node';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { authRoutes } from '../src/routes/auth.js';
import { chatRoutes } from '../src/routes/chat.js';
import { conversationRoutes } from '../src/routes/conversations.js';

// Initialize Fastify
const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['https://chatbot-enterprise.vercel.app', 'http://localhost:3000'],
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key',
});

await fastify.register(websocket);

// Health check
fastify.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'chatbot-enterprise-api'
  };
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(chatRoutes, { prefix: '/api/chat' });
await fastify.register(conversationRoutes, { prefix: '/api/conversations' });

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await fastify.ready();
  fastify.server.emit('request', req, res);
}
