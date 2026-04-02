// Vercel Serverless Function Entry Point
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

// Validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET');
}

// Create Supabase client with service role for admin operations
const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Create Fastify instance
const app = Fastify({ logger: true });

// Setup function
async function setup() {
  // Register CORS
  await app.register(cors, {
    origin: [
      'https://chatbot-enterprise-web.vercel.app',
      'https://chatbot-enterprise.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Register JWT
  await app.register(jwt, {
    secret: JWT_SECRET || 'fallback-secret-change-in-production',
  });

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'chatbot-enterprise-api',
  }));

  // ========== AUTH ROUTES ==========

  // Register new user
  app.post('/api/auth/register', async (request, reply) => {
    try {
      const { email, password, name } = request.body as any;

      // Validate input
      if (!email || !password) {
        return reply.status(400).send({ 
          error: 'Email and password are required' 
        });
      }

      if (password.length < 6) {
        return reply.status(400).send({ 
          error: 'Password must be at least 6 characters' 
        });
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return reply.status(409).send({ 
          error: 'User with this email already exists' 
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (authError) {
        console.error('Auth error:', authError);
        return reply.status(400).send({ 
          error: authError.message 
        });
      }

      if (!authData.user) {
        return reply.status(500).send({ 
          error: 'Failed to create user' 
        });
      }

      // Create profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          name: name || email.split('@')[0],
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        // Don't fail if profile creation fails, auth user is already created
      }

      // Generate JWT token
      const token = app.jwt.sign({ 
        userId: authData.user.id, 
        email: authData.user.email 
      });

      return reply.status(201).send({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: name || email.split('@')[0],
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return reply.status(500).send({ 
        error: error.message || 'Internal server error' 
      });
    }
  });

  // Login user
  app.post('/api/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body as any;

      // Validate input
      if (!email || !password) {
        return reply.status(400).send({ 
          error: 'Email and password are required' 
        });
      }

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Login error:', authError);
        return reply.status(401).send({ 
          error: 'Invalid email or password' 
        });
      }

      if (!authData.user) {
        return reply.status(401).send({ 
          error: 'User not found' 
        });
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // Generate JWT token
      const token = app.jwt.sign({ 
        userId: authData.user.id, 
        email: authData.user.email 
      });

      return reply.send({
        success: true,
        token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: profile?.name || email.split('@')[0],
          avatarUrl: profile?.avatar_url,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return reply.status(500).send({ 
        error: error.message || 'Internal server error' 
      });
    }
  });

  // Get current user
  app.get('/api/auth/me', async (request, reply) => {
    try {
      // Verify JWT token
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'No token provided' });
      }

      const token = authHeader.slice(7);
      const decoded = app.jwt.verify(token) as { userId: string; email: string };

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (!profile) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatar_url,
        },
      });
    } catch (error: any) {
      console.error('Auth check error:', error);
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  // ========== CONVERSATION ROUTES (Protected) ==========

  // Middleware to check auth
  app.addHook('onRequest', async (request, reply) => {
    // Skip auth for public routes
    const publicRoutes = ['/health', '/api/auth/register', '/api/auth/login'];
    if (publicRoutes.includes(request.url)) {
      return;
    }

    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'No token provided' });
      }

      const token = authHeader.slice(7);
      const decoded = app.jwt.verify(token) as { userId: string };
      request.user = decoded;
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  // Get all conversations for user
  app.get('/api/conversations', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;

      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return reply.status(500).send({ error: 'Failed to fetch conversations' });
      }

      return reply.send({
        success: true,
        conversations: conversations || [],
      });
    } catch (error: any) {
      console.error('Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Create new conversation
  app.post('/api/conversations', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { title } = request.body as any;

      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: title || 'New Chat',
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return reply.status(500).send({ error: 'Failed to create conversation' });
      }

      return reply.status(201).send({
        success: true,
        conversation,
      });
    } catch (error: any) {
      console.error('Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get conversation with messages
  app.get('/api/conversations/:id', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as any;

      // Get conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (convError || !conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      // Get messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Database error:', msgError);
      }

      return reply.send({
        success: true,
        conversation: {
          ...conversation,
          messages: messages || [],
        },
      });
    } catch (error: any) {
      console.error('Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Delete conversation
  app.delete('/api/conversations/:id', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as any;

      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Database error:', error);
        return reply.status(500).send({ error: 'Failed to delete conversation' });
      }

      return reply.send({ success: true });
    } catch (error: any) {
      console.error('Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // ========== CHAT ROUTES ==========

  // Send message and get AI response
  app.post('/api/chat/message', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { conversationId, content } = request.body as any;

      if (!content) {
        return reply.status(400).send({ error: 'Message content is required' });
      }

      // Save user message
      const { data: userMessage, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content,
        })
        .select()
        .single();

      if (msgError) {
        console.error('Database error:', msgError);
        return reply.status(500).send({ error: 'Failed to save message' });
      }

      // Get conversation history for context
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);

      // TODO: Call MiniMax API here for real AI response
      // For now, return a helpful response
      const responseContent = `I received your message: "${content}"\n\nThis is a test response. MiniMax AI integration is coming soon!`;

      // Save assistant response
      const { data: assistantMessage, error: assistantError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: responseContent,
        })
        .select()
        .single();

      if (assistantError) {
        console.error('Database error:', assistantError);
      }

      return reply.send({
        success: true,
        userMessage,
        assistantMessage,
      });
    } catch (error: any) {
      console.error('Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Global error handler
  app.setErrorHandler((error: any, request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal server error',
    });
  });

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
