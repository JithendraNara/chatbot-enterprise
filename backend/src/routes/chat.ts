import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { rateLimiter } from '../lib/rate-limiter.js';
import { createMiniMaxClient } from '../lib/minimax.js';
import { MiniMaxMessage, MiniMaxTool } from '../types.js';
import {
  createConversationForUser,
  getConversationForUser,
  listMessagesForConversation,
} from '../lib/repositories/conversations.js';
import { createAssistantMessage, createUserMessage } from '../lib/repositories/messages.js';
import { completeAiRun, createAiRun, failAiRun } from '../lib/repositories/ai-runs.js';

const messageSchema = z.object({
  conversationId: z.string().optional(),
  content: z.string().min(1),
  attachments: z.array(z.object({
    type: z.literal('image'),
    url: z.string().url(),
  })).optional(),
});

const SYSTEM_PROMPT = `You are MiniMax AI, a helpful enterprise assistant. Be concise, accurate, and helpful. You have access to tools for web search and image understanding. Use these tools when appropriate to provide better answers.`;

const TOOLS: MiniMaxTool[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        max_results: { type: 'integer', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'understand_image',
    description: 'Analyze and understand image content',
    input_schema: {
      type: 'object',
      properties: {
        image_url: { type: 'string' },
        question: { type: 'string' },
      },
      required: ['image_url'],
    },
  },
];

export async function chatRoutes(fastify: FastifyInstance) {
  const minimaxClient = createMiniMaxClient(
    process.env.MINIMAX_API_KEY || '',
    process.env.MINIMAX_API_HOST || 'https://api.minimax.io'
  );

  fastify.post('/message', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user.id;

      // Validate input
      const body = messageSchema.parse(request.body);

      // Check rate limit
      if (!rateLimiter.allow(userId)) {
        const retryAfter = rateLimiter.retryAfter(userId);
        reply.header('Retry-After', retryAfter.toString());
        return reply.status(429).send({
          error: 'Rate limit exceeded',
          retryAfter,
          remaining: 0,
        });
      }

      const remaining = rateLimiter.getRemaining(userId);

      let conversationId = body.conversationId;
      let conversation = conversationId
        ? await getConversationForUser(conversationId, request.user)
        : null;

      if (!conversation) {
        conversation = await createConversationForUser(
          request.user,
          `Chat ${new Date().toLocaleTimeString()}`
        );
        conversationId = conversation.id;
      }

      await createUserMessage(conversationId!, request.user, body.content, body.attachments);
      const conversationMessages = await listMessagesForConversation(conversationId!, request.user);

      const messages: MiniMaxMessage[] = conversationMessages.map(m => ({
        role: m.role,
        content: [
          {
            type: 'text',
            text: m.content,
          },
        ],
      }));

      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      reply.raw.write(`data: ${JSON.stringify({ type: 'rate_limit', remaining })}\n\n`);

      const aiRun = await createAiRun({
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        requestedBy: request.user.id,
        model: 'MiniMax-M2.7',
      });

      try {
        let assistantContent = '';

        const result = await minimaxClient.createMessage(
          SYSTEM_PROMPT,
          messages,
          TOOLS,
          (token: string) => {
            assistantContent += token;
            reply.raw.write(`data: ${JSON.stringify({ type: 'content', delta: token })}\n\n`);
          }
        );

        const assistantMessage = await createAssistantMessage(
          conversationId!,
          request.user,
          assistantContent
        );

        await completeAiRun(aiRun.id, {
          startedAt: aiRun.startedAt,
          promptTokens: result.usage?.inputTokens,
          completionTokens: result.usage?.outputTokens,
          toolCalls: result.toolCalls,
        });

        reply.raw.write(`data: ${JSON.stringify({
          type: 'message_complete',
          messageId: assistantMessage.id,
          conversationId,
        })}\n\n`);

        reply.raw.end();
      } catch (apiError) {
        fastify.log.error({ err: apiError }, 'MiniMax API error');
        await failAiRun(
          aiRun.id,
          aiRun.startedAt,
          apiError instanceof Error ? apiError.message : 'API call failed'
        );

        reply.raw.write(`data: ${JSON.stringify({
          type: 'error',
          error: apiError instanceof Error ? apiError.message : 'API call failed',
        })}\n\n`);

        reply.raw.end();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error({ error }, 'Chat error');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/chat/rate-limit-status - Check rate limit status
  fastify.get('/rate-limit-status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user.id;

      return reply.send({
        success: true,
        remaining: rateLimiter.getRemaining(userId),
        maxRequests: 4500,
        windowMs: 5 * 60 * 60 * 1000, // 5 hours
      });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}
