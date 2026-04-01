import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface AdminOverview {
  organizationId: string;
  memberCount: number;
  conversationCount: number;
  messageCount: number;
  aiRunCount: number;
  memoryCount: number;
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  globalRole: string;
  membershipRole: string;
  status: string;
  isDefaultWorkspace: boolean;
  joinedAt: string;
}

interface AdminConversation {
  id: string;
  title: string;
  ownerUserId: string;
  createdAt: number;
  updatedAt: number;
}

export default function AdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [overviewResponse, usersResponse, conversationsResponse] = await Promise.all([
          api.getAdminOverview(),
          api.getAdminUsers(),
          api.getAdminConversations(),
        ]);

        if (cancelled) return;

        setOverview(overviewResponse.overview);
        setUsers(usersResponse.users);
        setConversations(conversationsResponse.conversations);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-background p-8 text-text-secondary">Loading admin…</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-3xl mx-auto bg-card border border-border-color rounded-2xl p-6">
          <h1 className="text-2xl font-semibold mb-3">Admin</h1>
          <p className="text-accent">{error}</p>
        </div>
      </div>
    );
  }

  const statCards = overview
    ? [
        ['Members', overview.memberCount],
        ['Conversations', overview.conversationCount],
        ['Messages', overview.messageCount],
        ['AI Runs', overview.aiRunCount],
        ['Memories', overview.memoryCount],
      ]
    : [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-text-secondary mt-2">
            Workspace overview for organization {overview?.organizationId}
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {statCards.map(([label, value]) => (
            <div key={label} className="bg-card border border-border-color rounded-2xl p-5">
              <p className="text-sm text-text-secondary">{label}</p>
              <p className="text-3xl font-semibold mt-2">{value}</p>
            </div>
          ))}
        </section>

        <section className="bg-card border border-border-color rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border-color">
            <h2 className="text-xl font-semibold">Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-text-secondary">
                <tr>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Global</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-border-color">
                    <td className="px-5 py-3">{user.email}</td>
                    <td className="px-5 py-3">{user.displayName || '—'}</td>
                    <td className="px-5 py-3">{user.membershipRole}</td>
                    <td className="px-5 py-3">{user.globalRole}</td>
                    <td className="px-5 py-3">{user.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-card border border-border-color rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border-color">
            <h2 className="text-xl font-semibold">Recent Conversations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-text-secondary">
                <tr>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conversation) => (
                  <tr key={conversation.id} className="border-t border-border-color">
                    <td className="px-5 py-3">{conversation.title}</td>
                    <td className="px-5 py-3 font-mono text-xs">{conversation.ownerUserId}</td>
                    <td className="px-5 py-3">
                      {new Date(conversation.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
