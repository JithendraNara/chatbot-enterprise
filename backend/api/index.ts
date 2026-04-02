// Vercel Serverless Function Entry Point
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Create Fastify instance
const app = Fastify({
  logger: true,
});

// Register plugins
await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'https://chatbot-enterprise.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
});

await app.register(websocket);

// Health check
app.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'chatbot-enterprise-api',
  };
});

// Auth routes
app.post('/api/auth/register', async (request, reply) => {
  try {
    const { email, password, name } = request.body as any;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    
    if (error) throw error;
    return reply.send({ success: true, user: data.user });
  } catch (err: any) {
    return reply.status(400).send({ error: err.message });
  }
});

app.post('/api/auth/login', async (request, reply) => {
  try {
    const { email, password } = request.body as any;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Create JWT
    const token = app.jwt.sign({ userId: data.user?.id, email: data.user?.email });
    
    return reply.send({ 
      success: true, 
      token,
      user: data.user 
    });
  } catch (err: any) {
    return reply.status(401).send({ error: err.message });
  }
});

// Protected routes
app.register(async (instance) => {
  instance.addHook('onRequest', async (request) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('No token');
      }
      const token = authHeader.slice(7);
      request.user = instance.jwt.verify(token);
    } catch {
      const error = new Error('Unauthorized') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }
  });

  // Get conversations
  instance.get('/api/conversations', async (request, reply) => {
    const userId = (request.user as any).userId;
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ success: true, conversations: data });
  });

  // Create conversation
  instance.post('/api/conversations', async (request, reply) => {
    const userId = (request.user as any).userId;
    const { title } = request.body as any;
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title: title || 'New Chat' })
      .select()
      .single();
    
    if (error) return reply.status(500).send({ error: error.message });
    return reply.status(201).send({ success: true, conversation: data });
  });

  // Get messages
  instance.get('/api/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as any;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    
    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ success: true, messages: data });
  });

  // Send message (with MiniMax)
  instance.post('/api/chat/message', async (request, reply) => {
    const userId = (request.user as any).userId;
    const { conversationId, content } = request.body as any;
    
    // Save user message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content,
    });
    
    // TODO: Call MiniMax API here
    // For now, return a mock response
    const { data: assistantMsg, error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: 'This is a test response from MiniMax. Integration coming soon!',
    }).select().single();
    
    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ success: true, message: assistantMsg });
  });
});

// Error handler
app.setErrorHandler((error: any, request, reply) => {
  app.log.error(error);
  reply.status(error.statusCode || 500).send({ 
    error: error.message || 'Internal server error' 
  });
});

// Prepare app
await app.ready();

// Export handler for Vercel
export default async function handler(req: any, res: any) {
  app.server.emit('request', req, res);
}
