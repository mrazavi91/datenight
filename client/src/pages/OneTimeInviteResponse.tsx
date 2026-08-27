import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, apiPost, ApiError } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/invitations";
import { celebrate } from "@/lib/confetti";
import { MapPin } from "lucide-react";

interface PublicOneTimeInvitation {
  title: string;
  date: string;
  time: string;
  location: string | null;
  note: string | null;
  emoji: string;
  status: "pending" | "accepted" | "declined" | "expired";
  senderName: string;
  recipientName: string | null;
}

type LoadState = "loading" | "ready" | "error";

export default function OneTimeInviteResponse() {
  const { token } = useParams<{ token: string }>();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [invite, setInvite] = useState<PublicOneTimeInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<"accept" | "decline" | null>(null);

  function load() {
    if (!token) return;
    api<{ invitation: PublicOneTimeInvitation }>(`/api/one-time-invitations/public/${token}`)
      .then((res) => {
        setInvite(res.invitation);
        setLoadState("ready");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "This invitation link isn't valid.");
        setLoadState("error");
      });
  }

  useEffect(load, [token]);

  async function respond(action: "accept" | "decline") {
    if (!token) return;
    setResponding(action);
    setError(null);
    try {
      const res = await apiPost<{ invitation: PublicOneTimeInvitation }>(`/api/one-time-invitations/public/${token}/respond`, { action });
      setInvite(res.invitation);
      if (action === "accept") celebrate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setResponding(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💕</div>
          <h1 className="text-2xl font-display font-bold text-terracotta-600">MeetYah</h1>
        </div>

        {loadState === "loading" && (
          <div className="card p-8 text-center">
            <div className="text-4xl animate-wiggle">💌</div>
          </div>
        )}

        {loadState === "error" && (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">💔</div>
            <p className="text-terracotta-600 font-semibold">{error}</p>
            <Link to="/" className="btn-secondary w-full mt-5 inline-flex">
              Go to MeetYah
            </Link>
          </div>
        )}

        {loadState === "ready" && invite && (
          <div className="card p-6 animate-pop-in">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{invite.emoji}</div>
              <p className="text-terracotta-400 text-sm">
                {invite.senderName} wants to meet{invite.recipientName ? `, ${invite.recipientName}` : ""}
              </p>
              <h2 className="font-display font-bold text-xl text-terracotta-700 mt-1">{invite.title}</h2>
            </div>

            <div className="bg-blush-50 rounded-xl p-4 space-y-1.5">
              <p className="text-terracotta-600 font-semibold">
                {formatDate(invite.date)} · {formatTime(invite.time)}
              </p>
              {invite.location && (
                <p className="text-sm text-terracotta-500 flex items-center gap-1">
                  <MapPin size={14} /> {invite.location}
                </p>
              )}
              {invite.note && <p className="text-sm text-terracotta-500 italic mt-2">"{invite.note}"</p>}
            </div>

            {invite.status === "pending" && (
              <div className="flex gap-2 mt-5">
                <button className="btn-primary flex-1" onClick={() => respond("accept")} disabled={responding !== null}>
                  {responding === "accept" ? "…" : "Accept 💚"}
                </button>
                <button className="btn-secondary flex-1" onClick={() => respond("decline")} disabled={responding !== null}>
                  {responding === "decline" ? "…" : "Decline 💔"}
                </button>
              </div>
            )}

            {invite.status === "accepted" && (
              <p className="text-center text-green-600 font-semibold mt-5">You're in! We've let {invite.senderName} know 🎉</p>
            )}
            {invite.status === "declined" && (
              <p className="text-center text-terracotta-500 font-semibold mt-5">
                No worries — we've let {invite.senderName} know.
              </p>
            )}
            {invite.status === "expired" && (
              <p className="text-center text-terracotta-500 font-semibold mt-5">This invitation has expired.</p>
            )}

            {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2 mt-3 text-center">{error}</p>}
          </div>
        )}

        <p className="text-center text-xs text-terracotta-300 mt-6">No account needed to respond to this invite.</p>
      </div>
    </div>
  );
}
