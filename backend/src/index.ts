import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { authRoutes } from './routes/auth.js';
import { chatRoutes } from './routes/chat.js';
import { conversationRoutes } from './routes/conversations.js';
import { authenticateRequest } from './lib/auth.js';
import { adminRoutes } from './routes/admin.js';

const fastify = Fastify({
  logger: {
    level: 'info',
  },
});

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    // Register WebSocket
    await fastify.register(websocket);

    // Health check endpoint
    fastify.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    });

    // WebSocket endpoint
    fastify.get('/ws', { websocket: true }, (socket, req) => {
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

    // Register auth routes
    fastify.register(authRoutes, { prefix: '/api/auth' });

    // Register chat routes (with JWT authentication)
    fastify.register(async (instance) => {
      instance.addHook('onRequest', async (request) => {
        await authenticateRequest(request);
      });

      await instance.register(chatRoutes, { prefix: '/api/chat' });
      await instance.register(conversationRoutes, { prefix: '/api/conversations' });
      await instance.register(adminRoutes, { prefix: '/api/admin' });
    });

    // Global error handler
    fastify.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
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
        code: error.code,
      });
    });

    // Start server
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on ${host}:${port}`);

  } catch (err) {
    fastify.log.error({ err }, 'Startup error');
    process.exit(1);
  }
}

start();
