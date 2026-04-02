// Vercel Serverless Function Entry Point
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';

// Create Fastify instance
const app = Fastify({
  logger: true,
});

// Register plugins
await app.register(cors, {
  origin: '*',
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'fallback-secret',
});

// Health check
app.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'chatbot-enterprise-api',
  };
});

// Test endpoint
app.get('/api/test', async () => {
  return { message: 'API is working!' };
});

// Prepare app
await app.ready();

// Export handler for Vercel
export default async function handler(req: any, res: any) {
  app.server.emit('request', req, res);
}
