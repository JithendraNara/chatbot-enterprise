// Vercel Serverless Function Entry Point
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';

// Create Fastify instance
const app = Fastify({ logger: true });

// Setup function
async function setup() {
  await app.register(cors, {
    origin: '*',
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret',
  });

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'chatbot-enterprise-api',
  }));

  await app.ready();
}

// Initialize
let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    await setup();
    initialized = true;
  }
  app.server.emit('request', req, res);
}
