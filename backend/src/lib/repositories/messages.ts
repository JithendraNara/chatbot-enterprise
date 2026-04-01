import type { AuthenticatedUser } from '../auth.js';
import { supabaseAdmin } from '../supabase.js';
import { getConversationForUser, mapMessage, type AppMessage } from './conversations.js';

export async function createUserMessage(
  conversationId: string,
  user: AuthenticatedUser,
  content: string,
  attachments?: { type: 'image'; url: string }[]
): Promise<AppMessage> {
  const conversation = await getConversationForUser(conversationId, user);

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      organization_id: conversation.organizationId,
      user_id: user.id,
      role: 'user',
      content,
      attachments: attachments || [],
    })
    .select('id, role, content, created_at, attachments')
    .single<{
      id: string;
      role: 'user';
      content: string;
      created_at: string;
      attachments: Array<{ type: 'image'; url: string }> | null;
    }>();

  if (error || !data) {
    throw new Error(`Failed to create user message: ${error?.message || 'missing row'}`);
  }

  return mapMessage(data);
}

export async function createAssistantMessage(
  conversationId: string,
  user: AuthenticatedUser,
  content: string
): Promise<AppMessage> {
  const conversation = await getConversationForUser(conversationId, user);

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      organization_id: conversation.organizationId,
      user_id: user.id,
      role: 'assistant',
      content,
    })
    .select('id, role, content, created_at, attachments')
    .single<{
      id: string;
      role: 'assistant';
      content: string;
      created_at: string;
      attachments: Array<{ type: 'image'; url: string }> | null;
    }>();

  if (error || !data) {
    throw new Error(`Failed to create assistant message: ${error?.message || 'missing row'}`);
  }

  return mapMessage(data);
}
