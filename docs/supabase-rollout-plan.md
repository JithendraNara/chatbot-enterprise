# Supabase Rollout Plan

This plan replaces the current in-memory auth and conversation state in the Fastify backend with Supabase Auth + Postgres, then layers admin tools, cache, and bot memory on top.

## Current Gaps

- [auth.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/backend/src/routes/auth.ts) stores users in memory and signs custom JWTs.
- [conversation-store.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/backend/src/lib/conversation-store.ts) stores all conversations and messages in memory.
- [conversations.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/backend/src/routes/conversations.ts) reads from the in-memory store.
- [chat.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/backend/src/routes/chat.ts) persists chat state only in memory.
- [authStore.tsx](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/web/src/stores/authStore.tsx) and [auth-store.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/mobile/stores/auth-store.ts) assume the backend is the identity provider.

## Chosen Stack

- Identity: Supabase Auth
- Primary database: Supabase Postgres
- Authorization: Row Level Security
- Vector memory: `pgvector`
- App API: Fastify continues to orchestrate chat, moderation, admin, and model calls
- Cache: Vercel Runtime Cache for short-lived hot reads

## Data Model

Create these tables in order:

1. `profiles`
2. `organizations`
3. `organization_memberships`
4. `conversations`
5. `messages`
6. `ai_runs`
7. `memories`
8. `admin_audit_logs`

Use the SQL in [001_core.sql](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/supabase/001_core.sql) as the starting migration.

## RLS Strategy

RLS rules are designed around three helper ideas:

- platform admin: global support/admin users
- org admin: owner/admin membership inside one organization
- conversation access: owner or org admin

Rules by table:

- `profiles`
  - user can read and update their own profile
  - platform admin can read and update all profiles
- `organizations`
  - org members can read
  - authenticated users can create
  - org admins can update
- `organization_memberships`
  - users can read their own memberships
  - org admins can read and manage memberships for their org
- `conversations`
  - users can read and write their own conversations
  - org admins can read and moderate all org conversations
- `messages`
  - users can read messages for accessible conversations
  - direct client inserts are limited to user-authored rows
  - assistant/tool rows should be written through the backend with service-role access
- `ai_runs`
  - users can read their own AI run records
  - org admins can read all org AI runs
  - writes should come from backend service-role code
- `memories`
  - users can read their own memory rows
  - org admins can review org memory rows
  - memory extraction/writes should come from backend service-role code
- `admin_audit_logs`
  - read restricted to org admins and platform admins
  - writes from backend admin flows

## New User Flow

Use Supabase Auth as the source of truth.

1. User signs up with Supabase Auth.
2. Trigger creates `profiles` row from `auth.users`.
3. Frontend calls `bootstrap_workspace()` once after first login.
4. `bootstrap_workspace()` creates:
   - one `organizations` row
   - one `organization_memberships` row with role `owner`
5. Backend reads the Supabase JWT and trusts membership + role checks from Postgres.

Later, replace open signup with invite flows by adding:

- `invites` table
- email-based org join acceptance
- admin-only user creation page

## Admin Page Scope

Build one `/admin` section in the web app with these screens:

- Users
  - list org members
  - invite member
  - change membership role
  - suspend/reactivate profile
- Conversations
  - search and inspect conversations
  - archive/delete abusive or test conversations
- Usage
  - AI run counts
  - token usage
  - failure rate
- Memory
  - review extracted memories
  - delete bad memories
  - pin high-value memories

Keep all writes behind Fastify admin routes. Do not let the browser use service-role credentials.

## Cache Plan

Use Vercel Runtime Cache first. Do not add Redis yet.

Cache targets:

- conversation list summaries per user/org
- admin dashboard aggregates
- memory retrieval results for repeated prompts
- static model capability metadata

Do not cache:

- raw auth/session state
- mutable row-level data shared across users
- full prompts or secrets

Add cache invalidation tags:

- `org:{orgId}:conversations`
- `org:{orgId}:admin`
- `user:{userId}:memories`
- `conversation:{conversationId}`

## Memory Plan

Use three layers:

1. short-term context
   - most recent N messages in the prompt
2. rolling conversation summary
   - `conversations.summary`
3. long-term semantic memory
   - rows in `memories`

The draft SQL uses `vector(1536)` for `memories.embedding`, which is a good default if you use a 1536-dimension embedding model. If you standardize on a different embedding model before rollout, change that dimension before running the migration.

Memory ingestion should run after assistant responses:

- extract only durable facts, preferences, tasks, and summaries
- write one row per memory
- generate embedding and store in `memories.embedding`

Memory retrieval per turn:

- filter by `organization_id`
- prefer current `user_id`
- allow shared org memory for later workspace assistants
- fetch top semantic matches plus recent summaries

## File Replacement Order

### Phase 1: Auth Foundation

Replace first:

- [index.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/backend/src/index.ts)
- [auth.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/backend/src/routes/auth.ts)
- [authStore.tsx](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/web/src/stores/authStore.tsx)
- [auth-store.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/mobile/stores/auth-store.ts)

Add:

- `backend/src/lib/supabase-admin.ts`
- `backend/src/lib/auth.ts`
- `web/src/lib/supabase.ts`
- `mobile/lib/supabase.ts`

Goal:

- frontend logs in with Supabase
- Fastify verifies Supabase JWTs instead of signing custom JWTs

### Phase 2: Persistence

Replace next:

- [conversation-store.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/backend/src/lib/conversation-store.ts)
- [conversations.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/backend/src/routes/conversations.ts)
- [chat.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/backend/src/routes/chat.ts)
- [api.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/web/src/lib/api.ts)
- [api.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/mobile/lib/api.ts)

Add:

- `backend/src/lib/repositories/conversations.ts`
- `backend/src/lib/repositories/messages.ts`
- `backend/src/lib/repositories/ai-runs.ts`

Goal:

- conversations and messages live in Postgres
- AI runs are recorded for billing/admin reporting

### Phase 3: Admin

Add:

- `backend/src/routes/admin.ts`
- `web/src/pages/Admin.tsx`
- `web/src/components/admin/*`

Update:

- [App.tsx](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/web/src/App.tsx)

Goal:

- role-gated admin page
- service-role backend endpoints with explicit admin checks

### Phase 4: Cache

Add:

- `backend/src/lib/cache.ts`

Update:

- conversation list reads
- admin metrics reads
- memory retrieval path in chat

Goal:

- reduce repeated DB and model-side work

### Phase 5: Memory

Add:

- `backend/src/lib/repositories/memories.ts`
- `backend/src/lib/memory.ts`

Update:

- [chat.ts](/Users/jithendranara/Documents/GitHub/chatbot-enterprise/backend/src/routes/chat.ts)

Goal:

- post-response memory extraction
- semantic retrieval before model call

## Acceptance Criteria

Before deleting the old in-memory flows:

- signup/login uses Supabase only
- conversation reload survives server restarts
- admin can inspect users and conversations
- branch preview works with Supabase credentials
- memory retrieval is observable in logs and `ai_runs`
- old in-memory store code is removed, not left in parallel
