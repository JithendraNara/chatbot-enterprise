import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { authRoutes } from './routes/auth.js';
import { chatRoutes } from './routes/chat.js';
import { conversationRoutes } from './routes/conversations.js';

// Create Fastify instance
export async function createApp() {
  const fastify = Fastify({
    logger: {
      level: 'info',
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'https://chatbot-enterprise.vercel.app',
      'https://chatbot-enterprise-git-master-jithendra-n-naras-projects.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
  });

  // Register JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  });

  // Register WebSocket
  await fastify.register(websocket);

  // Health check endpoint
  fastify.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'chatbot-enterprise-api',
    };
  });

  // WebSocket endpoint
  fastify.get('/ws', { websocket: true }, (socket) => {
    fastify.log.info('WebSocket connection established');

    socket.on('message', (message: Buffer | string) => {
      try {
        const data = JSON.parse(message.toString());
        fastify.log.info('Received:', data);

        // Echo back for now
        socket.send(JSON.stringify({
          type: 'pong',
          received: data,
          timestamp: Date.now(),
        }));
      } catch (err) {
        fastify.log.error({ err }, 'WebSocket message error');
      }
    });

    socket.on('close', () => {
      fastify.log.info('WebSocket connection closed');
    });
  });

  // Register auth routes (no auth required)
  await fastify.register(authRoutes, { prefix: '/api/auth' });

  // Register protected routes (with JWT authentication)
  await fastify.register(async (instance) => {
    instance.addHook('onRequest', async (request) => {
      try {
        let token: string | undefined;

        // Check cookie first
        const cookieHeader = request.headers.cookie;
        if (cookieHeader) {
          const cookies = Object.fromEntries(
            cookieHeader.split('; ').map(c => {
              const [key, ...val] = c.split('=');
              return [key, val.join('=')];
            })
          );
          token=***
        }

        // Check Authorization header
        if (!token) {
          const authHeader=request.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token=authHeader.slice(7);
          }
        }

        if (!token) {
          throw new Error('No token provided');
        }

        const decoded = instance.jwt.verify(token);
        request.user = decoded;
      } catch (err) {
        const error = new Error('Unauthorized') as Error & { statusCode?: number };
        error.statusCode = 401;
        throw error;
      }
    });

    await instance.register(chatRoutes, { prefix: '/api/chat' });
    await instance.register(conversationRoutes, { prefix: '/api/conversations' });
  });

  // Global error handler
  fastify.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    fastify.log.error({ error }, 'Request error');

    if ('validation' in error) {
      return reply.status(400).send({
        error: 'Validation error',
        details: error,
      });
    }

    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.message || 'Internal server error',
    });
  });

  return fastify;
}

// Start server if running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await createApp();
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen({ port, host });
  app.log.info(`Server listening on ${host}:${port}`);
}
