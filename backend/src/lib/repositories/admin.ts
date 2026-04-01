import type { AuthenticatedUser } from '../auth.js';
import { supabaseAdmin } from '../supabase.js';
import { ensureUserWorkspace } from './organizations.js';
import { listConversationsForUser } from './conversations.js';

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  global_role: 'user' | 'admin' | 'support';
  status: 'active' | 'invited' | 'suspended';
}

interface MembershipRow {
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  is_default: boolean;
  created_at: string;
}

export interface AdminOverview {
  organizationId: string;
  memberCount: number;
  conversationCount: number;
  messageCount: number;
  aiRunCount: number;
  memoryCount: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  globalRole: string;
  membershipRole: string;
  status: string;
  isDefaultWorkspace: boolean;
  joinedAt: string;
}

export interface AdminConversation {
  id: string;
  title: string;
  ownerUserId: string;
  updatedAt: number;
  createdAt: number;
}

async function getAdminContext(user: AuthenticatedUser) {
  const { organizationId } = await ensureUserWorkspace(user);

  const [{ data: membership, error: membershipError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabaseAdmin
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .maybeSingle<{ role: 'owner' | 'admin' | 'member' | 'viewer' }>(),
      supabaseAdmin
        .from('profiles')
        .select('global_role')
        .eq('id', user.id)
        .maybeSingle<{ global_role: 'user' | 'admin' | 'support' }>(),
    ]);

  if (membershipError) {
    throw new Error(`Failed to load membership: ${membershipError.message}`);
  }

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`);
  }

  const isAdmin =
    membership?.role === 'owner' ||
    membership?.role === 'admin' ||
    profile?.global_role === 'admin' ||
    profile?.global_role === 'support';

  if (!isAdmin) {
    const error = new Error('Forbidden') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  return { organizationId };
}

async function countTable(
  table: string,
  organizationId: string
) {
  const query = supabaseAdmin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }

  return count || 0;
}

export async function getAdminOverview(user: AuthenticatedUser): Promise<AdminOverview> {
  const { organizationId } = await getAdminContext(user);

  const [memberCount, conversationCount, messageCount, aiRunCount, memoryCount] = await Promise.all([
    countTable('organization_memberships', organizationId),
    countTable('conversations', organizationId),
    countTable('messages', organizationId),
    countTable('ai_runs', organizationId),
    countTable('memories', organizationId),
  ]);

  return {
    organizationId,
    memberCount,
    conversationCount,
    messageCount,
    aiRunCount,
    memoryCount,
  };
}

export async function listAdminUsers(user: AuthenticatedUser): Promise<AdminUser[]> {
  const { organizationId } = await getAdminContext(user);

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('organization_memberships')
    .select('user_id, role, is_default, created_at')
    .eq('organization_id', organizationId)
    .returns<MembershipRow[]>();

  if (membershipError) {
    throw new Error(`Failed to load memberships: ${membershipError.message}`);
  }

  const userIds = (memberships || []).map((membership) => membership.user_id);

  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, display_name, global_role, status')
    .in('id', userIds)
    .returns<ProfileRow[]>();

  if (profilesError) {
    throw new Error(`Failed to load profiles: ${profilesError.message}`);
  }

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

  const users = (memberships || [])
    .map((membership): AdminUser | null => {
      const profile = profileMap.get(membership.user_id);
      if (!profile) return null;

      return {
        id: profile.id,
        email: profile.email || '',
        displayName: profile.display_name,
        globalRole: profile.global_role,
        membershipRole: membership.role,
        status: profile.status,
        isDefaultWorkspace: membership.is_default,
        joinedAt: membership.created_at,
      } satisfies AdminUser;
    })
    .filter((value): value is AdminUser => value !== null);

  return users;
}

export async function listAdminConversations(user: AuthenticatedUser): Promise<AdminConversation[]> {
  const { organizationId } = await getAdminContext(user);

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('id, title, user_id, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(50)
    .returns<
      Array<{
        id: string;
        title: string;
        user_id: string;
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
    createdAt: new Date(conversation.created_at).getTime(),
    updatedAt: new Date(conversation.updated_at).getTime(),
  }));
}
