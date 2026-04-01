import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  getAdminOverview,
  listAdminConversations,
  listAdminUsers,
  updateAdminUserStatus,
} from '../lib/repositories/admin.js';

const updateUserStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended']),
});

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

  fastify.patch(
    '/users/:id/status',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const body = updateUserStatusSchema.parse(request.body);
        const user = await updateAdminUserStatus(request.user, id, body.status);
        return reply.send({ success: true, user });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid input', details: error.errors });
        }

        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        return reply.status(statusCode).send({ error: (error as Error).message });
      }
    }
  );
}
