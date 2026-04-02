import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message } from '../types.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database tables
export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        attachments JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
    `);
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

// User operations
export async function createUser(email: string, passwordHash: string, name?: string): Promise<string> {
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
    [email, passwordHash, name || null]
  );
  return result.rows[0].id;
}

export async function getUserByEmail(email: string): Promise<{ id: string; email: string; password_hash: string; name?: string } | null> {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

// Conversation operations
export async function createConversation(userId: string, title?: string): Promise<Conversation> {
  const result = await pool.query(
    'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *',
    [userId, title || `Chat ${new Date().toLocaleDateString()}`]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    messages: [],
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const result = await pool.query('SELECT * FROM conversations WHERE id = $1', [id]);
  if (!result.rows[0]) return null;
  
  const row = result.rows[0];
  const messages = await getMessagesByConversationId(id);
  
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    messages,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function getConversationsByUserId(userId: string): Promise<Conversation[]> {
  const result = await pool.query(
    'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    messages: [], // Lazy load messages
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await pool.query(
    'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2',
    [title, id]
  );
}

export async function deleteConversation(id: string): Promise<void> {
  await pool.query('DELETE FROM conversations WHERE id = $1', [id]);
}

// Message operations
export async function createMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  attachments?: { uri: string; type: string; name: string }[]
): Promise<Message> {
  const result = await pool.query(
    'INSERT INTO messages (conversation_id, role, content, attachments) VALUES ($1, $2, $3, $4) RETURNING *',
    [conversationId, role, content, attachments ? JSON.stringify(attachments) : null]
  );
  
  // Update conversation updated_at
  await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
  
  const row = result.rows[0];
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: new Date(row.created_at).getTime(),
    attachments: row.attachments,
  };
}

export async function getMessagesByConversationId(conversationId: string): Promise<Message[]> {
  const result = await pool.query(
    'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: new Date(row.created_at).getTime(),
    attachments: row.attachments,
  }));
}

export async function deleteMessagesByConversationId(conversationId: string): Promise<void> {
  await pool.query('DELETE FROM messages WHERE conversation_id = $1', [conversationId]);
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export { pool };
