import type { AuthenticatedUser } from '../auth.js';
import { supabaseAdmin } from '../supabase.js';
import { ensureUserWorkspace } from './organizations.js';

interface ConversationRow {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at: string;
  attachments: Array<{ type: 'image'; url: string }> | null;
}

function toMillis(value: string): number {
  return new Date(value).getTime();
}

export interface AppConversation {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: { type: 'image'; url: string }[];
}

export function mapConversation(row: ConversationRow): AppConversation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    title: row.title,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

export function mapMessage(row: MessageRow): AppMessage {
  return {
    id: row.id,
    role: row.role === 'assistant' ? 'assistant' : 'user',
    content: row.content,
    timestamp: toMillis(row.created_at),
    attachments: row.attachments || undefined,
  };
}

export async function listConversationsForUser(user: AuthenticatedUser): Promise<AppConversation[]> {
  const { organizationId } = await ensureUserWorkspace(user);

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('id, organization_id, user_id, title, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .returns<ConversationRow[]>();

  if (error) {
    throw new Error(`Failed to load conversations: ${error.message}`);
  }

  return (data || []).map(mapConversation);
}

export async function createConversationForUser(
  user: AuthenticatedUser,
  title?: string
): Promise<AppConversation> {
  const { organizationId } = await ensureUserWorkspace(user);

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      title: title?.trim() || 'New conversation',
    })
    .select('id, organization_id, user_id, title, created_at, updated_at')
    .single<ConversationRow>();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message || 'missing row'}`);
  }

  return mapConversation(data);
}

export async function getConversationForUser(
  conversationId: string,
  user: AuthenticatedUser
): Promise<AppConversation | null> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('id, organization_id, user_id, title, created_at, updated_at')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle<ConversationRow>();

  if (error) {
    throw new Error(`Failed to load conversation: ${error.message}`);
  }

  return data ? mapConversation(data) : null;
}

export async function listMessagesForConversation(
  conversationId: string,
  user: AuthenticatedUser
): Promise<AppMessage[]> {
  const conversation = await getConversationForUser(conversationId, user);
  if (!conversation) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, role, content, created_at, attachments')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .returns<MessageRow[]>();

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  return (data || []).map(mapMessage);
}

export async function deleteConversationForUser(
  conversationId: string,
  user: AuthenticatedUser
): Promise<boolean> {
  const conversation = await getConversationForUser(conversationId, user);
  if (!conversation) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to delete conversation: ${error.message}`);
  }

  return true;
}
