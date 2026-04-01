create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.app_global_role as enum ('user', 'admin', 'support');
create type public.membership_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.message_role as enum ('user', 'assistant', 'system', 'tool');
create type public.ai_run_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
create type public.memory_kind as enum ('preference', 'fact', 'task', 'summary');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  global_role public.app_global_role not null default 'user',
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'member',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create unique index organization_memberships_default_user_idx
  on public.organization_memberships (user_id)
  where is_default;

create index organization_memberships_user_idx
  on public.organization_memberships (user_id, role);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  summary text,
  archived_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_org_user_updated_idx
  on public.conversations (organization_id, user_id, updated_at desc);

create index conversations_org_last_message_idx
  on public.conversations (organization_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  role public.message_role not null,
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  tool_calls jsonb not null default '[]'::jsonb,
  token_usage jsonb not null default '{}'::jsonb,
  model text,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at asc);

create index messages_org_created_idx
  on public.messages (organization_id, created_at desc);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  requested_by uuid references public.profiles(id) on delete set null,
  provider text not null default 'minimax',
  model text not null,
  status public.ai_run_status not null default 'queued',
  latency_ms integer,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer generated always as (coalesce(prompt_tokens, 0) + coalesce(completion_tokens, 0)) stored,
  tool_calls jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index ai_runs_org_created_idx
  on public.ai_runs (organization_id, created_at desc);

create index ai_runs_conversation_created_idx
  on public.ai_runs (conversation_id, created_at desc);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  kind public.memory_kind not null,
  content text not null,
  importance smallint not null default 50 check (importance between 0 and 100),
  embedding vector(1536),
  last_recalled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memories_org_user_created_idx
  on public.memories (organization_id, user_id, created_at desc);

create index memories_embedding_hnsw_idx
  on public.memories
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_logs_org_created_idx
  on public.admin_audit_logs (organization_id, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger memories_set_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.bootstrap_workspace(workspace_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  org_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  select organization_id
    into org_id
  from public.organization_memberships
  where user_id = current_user_id
    and is_default
  limit 1;

  if org_id is not null then
    return org_id;
  end if;

  select email into current_email
  from public.profiles
  where id = current_user_id;

  insert into public.organizations (name, created_by)
  values (
    coalesce(workspace_name, initcap(coalesce(split_part(current_email, '@', 1), 'workspace'))),
    current_user_id
  )
  returning id into org_id;

  insert into public.organization_memberships (organization_id, user_id, role, is_default)
  values (org_id, current_user_id, 'owner', true);

  return org_id;
end;
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.global_role in ('admin', 'support')
  );
$$;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.can_access_conversation(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = target_conversation
      and (
        c.user_id = auth.uid()
        or public.is_org_admin(c.organization_id)
        or public.is_platform_admin()
      )
      and (
        public.is_org_member(c.organization_id)
        or public.is_platform_admin()
      )
  );
$$;

create or replace function public.set_message_organization_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id is null then
    select c.organization_id into new.organization_id
    from public.conversations c
    where c.id = new.conversation_id;
  end if;

  return new;
end;
$$;

create or replace function public.touch_conversation_from_message()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         updated_at = now()
   where id = new.conversation_id;

  return new;
end;
$$;

create trigger messages_set_organization_id
before insert on public.messages
for each row execute function public.set_message_organization_id();

create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_from_message();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_runs enable row level security;
alter table public.memories enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "profiles_select_self_or_platform_admin"
  on public.profiles
  for select
  using (id = auth.uid() or public.is_platform_admin());

create policy "profiles_update_self_or_platform_admin"
  on public.profiles
  for update
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

create policy "organizations_select_member"
  on public.organizations
  for select
  using (public.is_org_member(id) or public.is_platform_admin());

create policy "organizations_insert_authenticated"
  on public.organizations
  for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "organizations_update_admin"
  on public.organizations
  for update
  using (public.is_org_admin(id) or public.is_platform_admin())
  with check (public.is_org_admin(id) or public.is_platform_admin());

create policy "organization_memberships_select_self_or_admin"
  on public.organization_memberships
  for select
  using (
    user_id = auth.uid()
    or public.is_org_admin(organization_id)
    or public.is_platform_admin()
  );

create policy "organization_memberships_manage_admin"
  on public.organization_memberships
  for all
  using (public.is_org_admin(organization_id) or public.is_platform_admin())
  with check (public.is_org_admin(organization_id) or public.is_platform_admin());

create policy "conversations_select_owner_or_admin"
  on public.conversations
  for select
  using (
    (
      public.is_org_member(organization_id)
      and user_id = auth.uid()
    )
    or public.is_org_admin(organization_id)
    or public.is_platform_admin()
  );

create policy "conversations_insert_owner"
  on public.conversations
  for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and public.is_org_member(organization_id)
  );

create policy "conversations_update_owner_or_admin"
  on public.conversations
  for update
  using (
    (
      public.is_org_member(organization_id)
      and user_id = auth.uid()
    )
    or public.is_org_admin(organization_id)
    or public.is_platform_admin()
  )
  with check (
    (
      public.is_org_member(organization_id)
      and user_id = auth.uid()
    )
    or public.is_org_admin(organization_id)
    or public.is_platform_admin()
  );

create policy "conversations_delete_owner_or_admin"
  on public.conversations
  for delete
  using (
    (
      public.is_org_member(organization_id)
      and user_id = auth.uid()
    )
    or public.is_org_admin(organization_id)
    or public.is_platform_admin()
  );

create policy "messages_select_accessible_conversation"
  on public.messages
  for select
  using (public.can_access_conversation(conversation_id));

create policy "messages_insert_user_message"
  on public.messages
  for insert
  with check (
    role = 'user'
    and user_id = auth.uid()
    and public.can_access_conversation(conversation_id)
  );

create policy "ai_runs_select_owner_or_admin"
  on public.ai_runs
  for select
  using (
    requested_by = auth.uid()
    or public.is_org_admin(organization_id)
    or public.is_platform_admin()
  );

create policy "memories_select_owner_or_admin"
  on public.memories
  for select
  using (
    user_id = auth.uid()
    or public.is_org_admin(organization_id)
    or public.is_platform_admin()
  );

create policy "memories_manage_owner_or_admin"
  on public.memories
  for all
  using (
    user_id = auth.uid()
    or public.is_org_admin(organization_id)
    or public.is_platform_admin()
  )
  with check (
    user_id = auth.uid()
    or public.is_org_admin(organization_id)
    or public.is_platform_admin()
  );

create policy "admin_audit_logs_select_admin"
  on public.admin_audit_logs
  for select
  using (
    public.is_org_admin(organization_id)
    or public.is_platform_admin()
  );
