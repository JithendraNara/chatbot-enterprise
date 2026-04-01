import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createConversationForUser,
  deleteConversationForUser,
  getConversationForUser,
  listConversationsForUser,
  listMessagesForConversation,
} from '../lib/repositories/conversations.js';

const createConversationSchema = z.object({
  title: z.string().optional(),
});

export async function conversationRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conversations = await listConversationsForUser(request.user);

      return reply.send({
        success: true,
        conversations: conversations.map(c => ({
          id: c.id,
          title: c.title,
          messageCount: 0,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createConversationSchema.parse(request.body);

      const conversation = await createConversationForUser(request.user, body.title);

      return reply.status(201).send({
        success: true,
        conversation: {
          id: conversation.id,
          title: conversation.title,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const conversation = await getConversationForUser(id, request.user);

      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      const messages = await listMessagesForConversation(id, request.user);

      return reply.send({
        success: true,
        conversation: {
          id: conversation.id,
          title: conversation.title,
          messages,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const deleted = await deleteConversationForUser(id, request.user);

      if (!deleted) {
        return reply.status(404).send({ error: 'Conversation not found or access denied' });
      }

      return reply.send({ success: true });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}
