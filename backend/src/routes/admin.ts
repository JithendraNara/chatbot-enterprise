import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  getAdminOverview,
  listAdminConversations,
  listAdminUsers,
} from '../lib/repositories/admin.js';

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get('/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const overview = await getAdminOverview(request.user);
      return reply.send({ success: true, overview });
    } catch (error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
      return reply.status(statusCode).send({ error: (error as Error).message });
    }
  });

  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const users = await listAdminUsers(request.user);
      return reply.send({ success: true, users });
    } catch (error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
      return reply.status(statusCode).send({ error: (error as Error).message });
    }
  });

  fastify.get('/conversations', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conversations = await listAdminConversations(request.user);
      return reply.send({ success: true, conversations });
    } catch (error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
      return reply.status(statusCode).send({ error: (error as Error).message });
    }
  });
}
