import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { conversationStore } from '../lib/conversation-store.js';
import { rateLimiter } from '../lib/rate-limiter.js';
import { createMiniMaxClient } from '../lib/minimax.js';
import { MiniMaxMessage, MiniMaxTool } from '../types.js';
import { Writable } from 'stream';

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
    type: 'function',
    name: 'web_search',
    description: 'Search the web for current information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        max_results: { type: 'integer', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'understand_image',
    description: 'Analyze and understand image content',
    parameters: {
      type: 'object',
      properties: {
        image_url: { type: 'string' },
        question: { type: 'string' },
      },
      required: ['image_url'],
    },
  },
];

// Custom SSE reply stream
class SSEReplyStream extends Writable {
  private reply: FastifyReply;

  constructor(reply: FastifyReply) {
    super();
    this.reply = reply;
  }

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: () => void) {
    this.reply.raw.write(chunk);
    callback();
  }
}

export async function chatRoutes(fastify: FastifyInstance) {
  const minimaxClient = createMiniMaxClient(
    process.env.MINIMAX_API_KEY || '',
    process.env.MINIMAX_API_HOST || 'https://api.minimax.io'
  );

  // POST /api/chat/message - Send a message and stream response
  fastify.post('/message', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = request.user as { userId: string };
      const userId = decoded.userId;

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

      // Get or create conversation
      let conversationId = body.conversationId;
      let conversation = conversationId ? await conversationStore.get(conversationId) : undefined;

      // Verify conversation belongs to user or create new one
      if (conversation) {
        if (conversation.userId !== userId) {
          return reply.status(403).send({ error: 'Access denied to this conversation' });
        }
      } else {
        // Create new conversation if no ID provided
        conversation = await conversationStore.create(userId, `Chat ${new Date().toLocaleTimeString()}`);
        conversationId = conversation.id;
      }

      // Add user message to conversation
      const userMessage = await conversationStore.addMessage(conversationId!, {
        role: 'user',
        content: body.content,
        attachments: body.attachments,
      });

      if (!userMessage) {
        return reply.status(500).send({ error: 'Failed to save message' });
      }

      // Build messages for MiniMax API
      const messages: MiniMaxMessage[] = conversation.messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Set up SSE streaming
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      // Send initial rate limit info
      reply.raw.write(`data: ${JSON.stringify({ type: 'rate_limit', remaining })}\n\n`);

      try {
        // Stream response from MiniMax
        let assistantContent = '';

        await minimaxClient.createMessage(
          SYSTEM_PROMPT,
          messages,
          TOOLS,
          (token: string) => {
            assistantContent += token;
            reply.raw.write(`data: ${JSON.stringify({ type: 'content', delta: token })}\n\n`);
          }
        );

        // Save assistant response
        const assistantMessage = await conversationStore.addMessage(conversationId!, {
          role: 'assistant',
          content: assistantContent,
        });

        // Send completion event
        reply.raw.write(`data: ${JSON.stringify({
          type: 'message_complete',
          messageId: assistantMessage?.id,
          conversationId,
        })}\n\n`);

        reply.raw.end();
      } catch (apiError) {
        fastify.log.error({ err: apiError }, 'MiniMax API error');

        // Send error to client
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
      const decoded = request.user as { userId: string };
      const userId = decoded.userId;

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
