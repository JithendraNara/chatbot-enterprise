import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database operations
export const db = {
  // Conversations
  async createConversation(userId: string, title?: string) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title: title || `Chat ${new Date().toLocaleDateString()}` })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getConversation(id: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, messages(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getConversationsByUser(userId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async updateConversationTitle(id: string, title: string) {
    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteConversation(id: string) {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Messages
  async createMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    attachments?: { uri: string; type: string; name: string }[]
  ) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        attachments: attachments || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getMessagesByConversation(conversationId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Profile
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: { name?: string; avatar_url?: string }) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
  },
};
