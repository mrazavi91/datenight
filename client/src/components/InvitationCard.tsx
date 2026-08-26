import { useState } from "react";
import type { Invitation, PublicUser } from "@shared/schema";
import { useInvitationActions } from "@/hooks/useInvitations";
import { formatDate, formatTime } from "@/lib/invitations";
import { celebrate } from "@/lib/confetti";
import { ApiError } from "@/lib/api";
import { MapPin, RotateCcw } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-sunset-100 text-terracotta-600",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-blush-100 text-blush-600",
  rescheduled: "bg-blush-100 text-blush-600",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted 💚",
  declined: "Declined 💔",
  rescheduled: "New time proposed 🔄",
};

export default function InvitationCard({
  invitation,
  currentUserId,
  partner,
  variant,
}: {
  invitation: Invitation;
  currentUserId: string;
  partner: PublicUser | null;
  variant?: "compact";
}) {
  const { respond } = useInvitationActions();
  const [showPropose, setShowPropose] = useState(false);
  const [proposedDate, setProposedDate] = useState(invitation.date);
  const [proposedTime, setProposedTime] = useState(invitation.time);
  const [proposedNote, setProposedNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSender = invitation.senderId === currentUserId;
  const youAreAwaited = invitation.awaitingResponseFrom === currentUserId;
  const senderLabel = isSender ? "You invited" : `${partner?.name ?? "Your partner"} invited you`;

  const displayDate = invitation.status === "rescheduled" ? invitation.proposedDate! : invitation.date;
  const displayTime = invitation.status === "rescheduled" ? invitation.proposedTime! : invitation.time;

  async function handleAccept() {
    setError(null);
    try {
      await respond.mutateAsync({ id: invitation.id, input: { action: "accept" } });
      celebrate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function handleDecline() {
    setError(null);
    try {
      await respond.mutateAsync({ id: invitation.id, input: { action: "decline" } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await respond.mutateAsync({
        id: invitation.id,
        input: { action: "propose", proposedDate, proposedTime, proposedNote },
      });
      setShowPropose(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className={`card p-4 sm:p-5 ${variant === "compact" ? "" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="text-3xl leading-none">{invitation.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-terracotta-700 truncate">{invitation.title}</h3>
            <span className={`badge ${STATUS_STYLES[invitation.status]} shrink-0`}>{STATUS_LABEL[invitation.status]}</span>
          </div>
          <p className="text-xs text-terracotta-400 mt-0.5">{senderLabel}</p>
          <p className="text-sm text-terracotta-600 mt-1.5 font-semibold">
            {formatDate(displayDate)} · {formatTime(displayTime)}
          </p>
          {invitation.location && (
            <p className="text-sm text-terracotta-400 flex items-center gap-1 mt-0.5">
              <MapPin size={14} /> {invitation.location}
            </p>
          )}
          {invitation.note && <p className="text-sm text-terracotta-500 mt-2 italic">"{invitation.note}"</p>}

          {invitation.status === "rescheduled" && invitation.proposedNote && (
            <p className="text-sm text-terracotta-500 mt-2 bg-blush-50 rounded-xl px-3 py-2">
              <RotateCcw size={13} className="inline mr-1 -mt-0.5" />
              {invitation.proposedNote}
            </p>
          )}

          {youAreAwaited && (invitation.status === "pending" || invitation.status === "rescheduled") && (
            <div className="mt-3">
              {!showPropose ? (
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary !py-2 !px-4 text-sm" onClick={handleAccept} disabled={respond.isPending}>
                    Accept 💚
                  </button>
                  <button className="btn-secondary !py-2 !px-4 text-sm" onClick={handleDecline} disabled={respond.isPending}>
                    Decline 💔
                  </button>
                  <button className="btn-ghost !py-2 !px-4 text-sm" onClick={() => setShowPropose(true)} disabled={respond.isPending}>
                    Suggest new time 🔄
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePropose} className="space-y-2 bg-blush-50 rounded-xl p-3 mt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="input !py-1.5 text-sm"
                      value={proposedDate}
                      onChange={(e) => setProposedDate(e.target.value)}
                      required
                    />
                    <input
                      type="time"
                      className="input !py-1.5 text-sm"
                      value={proposedTime}
                      onChange={(e) => setProposedTime(e.target.value)}
                      required
                    />
                  </div>
                  <input
                    className="input !py-1.5 text-sm"
                    placeholder="How about this instead? (optional)"
                    value={proposedNote}
                    onChange={(e) => setProposedNote(e.target.value)}
                    maxLength={1000}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary !py-1.5 !px-4 text-sm" disabled={respond.isPending}>
                      Send new time
                    </button>
                    <button type="button" className="btn-ghost !py-1.5 !px-4 text-sm" onClick={() => setShowPropose(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {!youAreAwaited && (invitation.status === "pending" || invitation.status === "rescheduled") && (
            <p className="text-xs text-terracotta-300 mt-2">Waiting for {partner?.name ?? "your partner"} to respond…</p>
          )}

          {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
