import { useOneTimeInvitations } from "@/hooks/useOneTimeInvitations";
import { formatDate, formatTime } from "@/lib/invitations";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-sunset-100 text-terracotta-600",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-blush-100 text-blush-600",
  expired: "bg-blush-100 text-terracotta-400",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for a reply",
  accepted: "Accepted 💚",
  declined: "Declined 💔",
  expired: "Expired",
};

export default function OneTimeInvitesList() {
  const { data } = useOneTimeInvitations();
  const invitations = data?.invitations ?? [];

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-2">
      {invitations.map((inv) => (
        <div key={inv.id} className="card p-3 flex items-center gap-3">
          <div className="text-2xl leading-none">{inv.emoji}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-terracotta-700 truncate text-sm">{inv.title}</p>
            <p className="text-xs text-terracotta-400">
              To {inv.recipientName || inv.recipientEmail} · {formatDate(inv.date)} · {formatTime(inv.time)}
            </p>
          </div>
          <span className={`badge shrink-0 ${STATUS_STYLES[inv.status] ?? ""}`}>{STATUS_LABEL[inv.status] ?? inv.status}</span>
        </div>
      ))}
    </div>
  );
}
