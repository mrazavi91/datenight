import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "@/lib/api";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  authProvider: string;
  emailVerified: boolean;
  coupleId: string | null;
  oneTimeCredits: number;
  createdAt: number;
}

interface AdminCouple {
  id: string;
  inviteCode: string;
  user1Id: string;
  user2Id: string | null;
  credits: number;
  createdAt: number;
}

interface AdminInvitation {
  id: string;
  title: string;
  status: string;
  senderId: string;
  recipientId: string;
  date: string;
  time: string;
  createdAt: number;
}

interface AdminOneTimeInvitation {
  id: string;
  title: string;
  status: string;
  senderId: string;
  recipientEmail: string;
  createdAt: number;
}

interface AdminSupportRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: number;
}

interface AdminAccountDeletion {
  id: string;
  name: string;
  email: string;
  reason: string | null;
  createdAt: number;
}

interface AdminData {
  users: AdminUser[];
  couples: AdminCouple[];
  invitations: AdminInvitation[];
  oneTimeInvitations: AdminOneTimeInvitation[];
  supportRequests: AdminSupportRequest[];
  accountDeletions: AdminAccountDeletion[];
}

const STORAGE_KEY = "meetyah_admin_secret";

function fmt(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function Admin() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem(STORAGE_KEY) || "");
  const [inputSecret, setInputSecret] = useState(secret);
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(withSecret: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/data", { headers: { "x-admin-secret": withSecret } });
      const body = await res.json();
      if (!res.ok) throw new ApiError(res.status, body?.message || "Failed to load");
      setData(body as AdminData);
      sessionStorage.setItem(STORAGE_KEY, withSecret);
      setSecret(withSecret);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the admin API");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (secret) load(secret);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 max-w-sm w-full">
          <h1 className="text-xl font-display font-bold text-terracotta-700 mb-1">Admin</h1>
          <p className="text-sm text-terracotta-400 mb-4">Enter the admin secret to view the database.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load(inputSecret);
            }}
            className="space-y-3"
          >
            <input
              type="password"
              className="input"
              value={inputSecret}
              onChange={(e) => setInputSecret(e.target.value)}
              placeholder="Admin secret"
              autoFocus
            />
            {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Checking…" : "View data"}
            </button>
          </form>
          <Link to="/" className="block text-center text-xs text-terracotta-300 mt-4">
            Back to MeetYah
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-terracotta-700">Admin</h1>
        <div className="flex items-center gap-2">
          <Link to="/" className="btn-secondary !py-1.5 !px-3 text-sm">
            Back to MeetYah
          </Link>
          <button
            className="btn-secondary !py-1.5 !px-3 text-sm"
            onClick={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              setData(null);
              setSecret("");
            }}
          >
            Lock
          </button>
        </div>
      </div>

      <Section title={`Users (${data.users.length})`}>
        <Table
          columns={["Name", "Email", "Provider", "Verified", "Couple", "Tokens", "Created"]}
          rows={data.users.map((u) => [
            u.name,
            u.email,
            u.authProvider,
            u.emailVerified ? "✅" : "—",
            u.coupleId ? u.coupleId.slice(0, 8) : "—",
            String(u.oneTimeCredits),
            fmt(u.createdAt),
          ])}
        />
      </Section>

      <Section title={`Couples (${data.couples.length})`}>
        <Table
          columns={["Invite code", "User 1", "User 2", "Tokens", "Created"]}
          rows={data.couples.map((c) => [
            c.inviteCode,
            c.user1Id.slice(0, 8),
            c.user2Id ? c.user2Id.slice(0, 8) : "— unpaired —",
            String(c.credits),
            fmt(c.createdAt),
          ])}
        />
      </Section>

      <Section title={`Couple invitations (${data.invitations.length})`}>
        <Table
          columns={["Title", "Status", "Date", "Sender", "Recipient", "Created"]}
          rows={data.invitations.map((i) => [i.title, i.status, `${i.date} ${i.time}`, i.senderId.slice(0, 8), i.recipientId.slice(0, 8), fmt(i.createdAt)])}
        />
      </Section>

      <Section title={`One-time invitations (${data.oneTimeInvitations.length})`}>
        <Table
          columns={["Title", "Status", "Sender", "Recipient email", "Created"]}
          rows={data.oneTimeInvitations.map((i) => [i.title, i.status, i.senderId.slice(0, 8), i.recipientEmail, fmt(i.createdAt)])}
        />
      </Section>

      <Section title={`Support requests (${data.supportRequests.length})`}>
        <Table
          columns={["Name", "Email", "Message", "Status", "Created"]}
          rows={data.supportRequests.map((s) => [s.name, s.email, s.message, s.status, fmt(s.createdAt)])}
        />
      </Section>

      <Section title={`Account deletions (${data.accountDeletions.length})`}>
        <Table
          columns={["Name", "Email", "Reason", "Deleted"]}
          rows={data.accountDeletions.map((d) => [d.name, d.email, d.reason || "— not given —", fmt(d.createdAt)])}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display font-bold text-terracotta-700 mb-2">{title}</h2>
      <div className="card p-0 overflow-x-auto">{children}</div>
    </div>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-terracotta-400 p-4">Nothing yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-blush-100">
          {columns.map((c) => (
            <th key={c} className="text-left font-semibold text-terracotta-600 px-3 py-2 whitespace-nowrap">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-blush-50 last:border-0">
            {row.map((cell, j) => (
              <td key={j} className="px-3 py-2 text-terracotta-500 max-w-xs truncate" title={cell}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
