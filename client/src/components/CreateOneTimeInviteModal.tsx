import { useState } from "react";
import Modal from "@/components/Modal";
import { THEME_EMOJIS } from "@/lib/emoji";
import { useOneTimeInvitationActions } from "@/hooks/useOneTimeInvitations";
import { useInvitationPrice } from "@/hooks/useInvitations";
import { useAuthConfig } from "@/hooks/useAuthConfig";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountMinor / 100);
}

export default function CreateOneTimeInviteModal({ onClose }: { onClose: () => void }) {
  const { checkout, useCredit } = useOneTimeInvitationActions();
  const { data: price } = useInvitationPrice();
  const { data: config } = useAuthConfig();
  const { user } = useAuth();

  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("19:00");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [emoji, setEmoji] = useState(THEME_EMOJIS[0].emoji);
  const [error, setError] = useState<string | null>(null);
  const [payWithToken, setPayWithToken] = useState(false);
  const [sent, setSent] = useState(false);

  const priceLabel = price ? formatMoney(price.amount, price.currency) : "£1.99";
  const credits = user?.oneTimeCredits ?? 0;
  const willUseToken = payWithToken && credits > 0;
  const pending = checkout.isPending || useCredit.isPending;
  const emailReady = config?.emailEnabled ?? false;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const input = { recipientEmail, recipientName, title, date, time, location, note, emoji };
      if (willUseToken) {
        await useCredit.mutateAsync(input);
        setSent(true);
        return;
      }
      const { url } = await checkout.mutateAsync(input);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send invitation");
    }
  }

  if (sent) {
    return (
      <Modal title="Sent! 💌" onClose={onClose}>
        <div className="text-center py-4">
          <div className="text-4xl mb-3">📬</div>
          <p className="text-terracotta-600 font-semibold">Your invite is on its way to {recipientEmail}.</p>
          <p className="text-sm text-terracotta-400 mt-2">We'll let you know here as soon as they respond.</p>
          <button className="btn-primary w-full mt-5" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Meet someone new 👋" onClose={onClose}>
      <p className="text-sm text-terracotta-400 -mt-2 mb-4">
        A one-time invite for a first date — no account needed for them to respond, and it's just a single yes or no.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="recipientName">
              Their name <span className="text-terracotta-300 font-normal">(optional)</span>
            </label>
            <input
              id="recipientName"
              className="input"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Jordan"
              maxLength={80}
            />
          </div>
          <div>
            <label className="label" htmlFor="recipientEmail">
              Their email
            </label>
            <input
              id="recipientEmail"
              type="email"
              className="input"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="jordan@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Theme</label>
          <div className="flex flex-wrap gap-2">
            {THEME_EMOJIS.map((t) => (
              <button
                key={t.emoji}
                type="button"
                title={t.label}
                onClick={() => setEmoji(t.emoji)}
                className={`text-2xl w-11 h-11 rounded-full flex items-center justify-center border-2 transition-transform ${
                  emoji === t.emoji ? "border-terracotta-400 bg-sunset-100 scale-110" : "border-transparent bg-blush-50 hover:scale-105"
                }`}
              >
                {t.emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ot-title">
            Title
          </label>
          <input
            id="ot-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Coffee sometime?"
            maxLength={120}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ot-date">
              Date
            </label>
            <input id="ot-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="ot-time">
              Time
            </label>
            <input id="ot-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ot-location">
            Location <span className="text-terracotta-300 font-normal">(optional)</span>
          </label>
          <input
            id="ot-location"
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="That café on Main St"
            maxLength={200}
          />
        </div>

        <div>
          <label className="label" htmlFor="ot-note">
            Personal note
          </label>
          <textarea
            id="ot-note"
            className="input min-h-20 resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Great meeting you the other day..."
            maxLength={1000}
          />
        </div>

        {credits > 0 && (
          <label className="flex items-center gap-2.5 bg-sunset-100 rounded-xl px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-terracotta-500"
              checked={payWithToken}
              onChange={(e) => setPayWithToken(e.target.checked)}
            />
            <span className="text-sm text-terracotta-600">
              Use a date token instead 🎟️ <span className="text-terracotta-400">(you have {credits})</span>
            </span>
          </label>
        )}

        {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2">{error}</p>}

        {!emailReady && (
          <p className="text-sm text-terracotta-500 bg-sunset-100 rounded-xl px-3 py-2">
            Email isn't set up on this server yet, so there's no way to deliver this invite. Add a Resend API key to get going.
          </p>
        )}
        {emailReady && !willUseToken && price && !price.paymentsEnabled && (
          <p className="text-sm text-terracotta-500 bg-sunset-100 rounded-xl px-3 py-2">
            Payments aren't set up on this server yet, so invitations can't be sent. Add a Stripe secret key to get going.
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={pending || !emailReady || (!willUseToken && price ? !price.paymentsEnabled : false)}
        >
          {pending ? "Sending…" : willUseToken ? "Send invitation with a token 🎟️" : `Pay ${priceLabel} & send invitation 💌`}
        </button>
        <p className="text-xs text-terracotta-300 text-center">
          {willUseToken ? "No charge — this uses one of your date tokens." : "They'll get an email with a link — no account needed to respond."}
        </p>
      </form>
    </Modal>
  );
}
