import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { conversationStore } from '../lib/conversation-store.js';

const createConversationSchema = z.object({
  title: z.string().optional(),
});

export async function conversationRoutes(fastify: FastifyInstance) {
  // Get all conversations for authenticated user
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = request.user as { userId: string };
      const conversations = conversationStore.getByUser(decoded.userId);

      return reply.send({
        success: true,
        conversations: conversations.map(c => ({
          id: c.id,
          title: c.title,
          messageCount: c.messages.length,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Create new conversation
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = request.user as { userId: string };
      const body = createConversationSchema.parse(request.body);

      const conversation = conversationStore.create(decoded.userId, body.title);

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

  // Get single conversation with messages
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const decoded = request.user as { userId: string };
      const { id } = request.params;

      const conversation = conversationStore.get(id);

      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      if (conversation.userId !== decoded.userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      return reply.send({
        success: true,
        conversation: {
          id: conversation.id,
          title: conversation.title,
          messages: conversation.messages,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Delete conversation
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const decoded = request.user as { userId: string };
      const { id } = request.params;

      const deleted = conversationStore.delete(id, decoded.userId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Conversation not found or access denied' });
      }

      return reply.send({ success: true });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}
