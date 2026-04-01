import { supabaseAdmin } from '../supabase.js';
import type { AuthenticatedUser } from '../auth.js';

interface MembershipRow {
  organization_id: string;
}

function fallbackWorkspaceName(email: string | null): string {
  const base = email?.split('@')[0] || 'workspace';
  const normalized = base.replace(/[._-]+/g, ' ').trim();
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ') || 'Workspace';
}

export async function ensureUserWorkspace(user: AuthenticatedUser): Promise<{ organizationId: string }> {
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      display_name: fallbackWorkspaceName(user.email),
    },
    {
      onConflict: 'id',
    }
  );

  if (profileError) {
    throw new Error(`Failed to upsert profile: ${profileError.message}`);
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    throw new Error(`Failed to load membership: ${membershipError.message}`);
  }

  if (membership?.organization_id) {
    return { organizationId: membership.organization_id };
  }

  const { data: organization, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({
      name: fallbackWorkspaceName(user.email),
      created_by: user.id,
    })
    .select('id')
    .single<{ id: string }>();

  if (orgError || !organization) {
    throw new Error(`Failed to create organization: ${orgError?.message || 'missing row'}`);
  }

  const { error: createMembershipError } = await supabaseAdmin
    .from('organization_memberships')
    .insert({
      organization_id: organization.id,
      user_id: user.id,
      role: 'owner',
      is_default: true,
    });

  if (createMembershipError) {
    throw new Error(`Failed to create membership: ${createMembershipError.message}`);
  }

  return { organizationId: organization.id };
}
