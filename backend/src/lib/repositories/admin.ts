import type { AuthenticatedUser, GlobalRole, ProfileStatus } from '../auth.js';
import { supabaseAdmin } from '../supabase.js';

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  global_role: GlobalRole;
  status: ProfileStatus;
  created_at: string;
}

export interface AdminOverview {
  userCount: number;
  pendingUserCount: number;
  activeUserCount: number;
  suspendedUserCount: number;
  conversationCount: number;
  messageCount: number;
  aiRunCount: number;
  memoryCount: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  globalRole: GlobalRole;
  status: ProfileStatus;
  createdAt: string;
}

export interface AdminConversation {
  id: string;
  title: string;
  ownerUserId: string;
  organizationId: string;
  updatedAt: number;
  createdAt: number;
}

function requireGlobalAdmin(user: AuthenticatedUser) {
  if (user.globalRole === 'admin' || user.globalRole === 'support') {
    return;
  }

  const error = new Error('Forbidden') as Error & { statusCode?: number };
  error.statusCode = 403;
  throw error;
}

async function countTable(table: string) {
  const { count, error } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }

  return count || 0;
}

async function countProfilesByStatus(status: ProfileStatus) {
  const { count, error } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);

  if (error) {
    throw new Error(`Failed to count profiles (${status}): ${error.message}`);
  }

  return count || 0;
}

export async function getAdminOverview(user: AuthenticatedUser): Promise<AdminOverview> {
  requireGlobalAdmin(user);

  const [
    userCount,
    pendingUserCount,
    activeUserCount,
    suspendedUserCount,
    conversationCount,
    messageCount,
    aiRunCount,
    memoryCount,
  ] = await Promise.all([
    countTable('profiles'),
    countProfilesByStatus('pending'),
    countProfilesByStatus('active'),
    countProfilesByStatus('suspended'),
    countTable('conversations'),
    countTable('messages'),
    countTable('ai_runs'),
    countTable('memories'),
  ]);

  return {
    userCount,
    pendingUserCount,
    activeUserCount,
    suspendedUserCount,
    conversationCount,
    messageCount,
    aiRunCount,
    memoryCount,
  };
}

export async function listAdminUsers(user: AuthenticatedUser): Promise<AdminUser[]> {
  requireGlobalAdmin(user);

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, display_name, global_role, status, created_at')
    .order('created_at', { ascending: false })
    .returns<ProfileRow[]>();

  if (error) {
    throw new Error(`Failed to load profiles: ${error.message}`);
  }

  return (data || []).map((profile) => ({
    id: profile.id,
    email: profile.email || '',
    displayName: profile.display_name,
    globalRole: profile.global_role,
    status: profile.status,
    createdAt: profile.created_at,
  }));
}

export async function listAdminConversations(user: AuthenticatedUser): Promise<AdminConversation[]> {
  requireGlobalAdmin(user);

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('id, title, user_id, organization_id, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)
    .returns<
      Array<{
        id: string;
        title: string;
        user_id: string;
        organization_id: string;
        created_at: string;
        updated_at: string;
      }>
    >();

  if (error) {
    throw new Error(`Failed to load conversations: ${error.message}`);
  }

  return (data || []).map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    ownerUserId: conversation.user_id,
    organizationId: conversation.organization_id,
    createdAt: new Date(conversation.created_at).getTime(),
    updatedAt: new Date(conversation.updated_at).getTime(),
  }));
}

export async function updateAdminUserStatus(
  actor: AuthenticatedUser,
  userId: string,
  status: Extract<ProfileStatus, 'pending' | 'active' | 'suspended'>
) {
  requireGlobalAdmin(actor);

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ status })
    .eq('id', userId)
    .select('id, email, display_name, global_role, status, created_at')
    .single<ProfileRow>();

  if (error || !data) {
    throw new Error(`Failed to update user status: ${error?.message || 'missing row'}`);
  }

  await supabaseAdmin.from('admin_audit_logs').insert({
    actor_user_id: actor.id,
    action: `user.status.${status}`,
    entity_type: 'profile',
    entity_id: userId,
    metadata: {
      actor_email: actor.email,
      target_status: status,
    },
  });

  return {
    id: data.id,
    email: data.email || '',
    displayName: data.display_name,
    globalRole: data.global_role,
    status: data.status,
    createdAt: data.created_at,
  } satisfies AdminUser;
}
