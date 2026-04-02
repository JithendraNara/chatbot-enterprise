import { createServer } from 'http';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { authRoutes } from '../src/routes/auth.js';
import { chatRoutes } from '../src/routes/chat.js';
import { conversationRoutes } from '../src/routes/conversations.js';

// Create Fastify instance
const app = Fastify({
  logger: true,
});

// Register plugins
await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['https://chatbot-enterprise.vercel.app', 'http://localhost:3000'],
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key',
});

await app.register(websocket);

// Health check
app.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'chatbot-enterprise-api'
  };
});

// Register routes
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(chatRoutes, { prefix: '/api/chat' });
await app.register(conversationRoutes, { prefix: '/api/conversations' });

// Prepare Fastify for serverless
await app.ready();

// Export handler for Vercel
export default async function handler(req: any, res: any) {
  app.server.emit('request', req, res);
}
