import { useState } from "react";
import Modal from "@/components/Modal";
import { THEME_EMOJIS } from "@/lib/emoji";
import { useInvitationActions, useInvitationPrice } from "@/hooks/useInvitations";
import { ApiError } from "@/lib/api";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountMinor / 100);
}

export default function CreateInvitationModal({ onClose }: { onClose: () => void }) {
  const { checkout } = useInvitationActions();
  const { data: price } = useInvitationPrice();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("19:00");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [emoji, setEmoji] = useState(THEME_EMOJIS[0].emoji);
  const [error, setError] = useState<string | null>(null);

  const priceLabel = price ? formatMoney(price.amount, price.currency) : "£1.99";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { url } = await checkout.mutateAsync({ title, date, time, location, note, emoji });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start checkout");
    }
  }

  return (
    <Modal title="Plan a date 💌" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
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
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dinner & a movie?"
            maxLength={120}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="date">
              Date
            </label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="time">
              Time
            </label>
            <input id="time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="location">
            Location <span className="text-terracotta-300 font-normal">(optional)</span>
          </label>
          <input
            id="location"
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Our favorite spot"
            maxLength={200}
          />
        </div>

        <div>
          <label className="label" htmlFor="note">
            Personal note
          </label>
          <textarea
            id="note"
            className="input min-h-20 resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="I've missed you this week... 💗"
            maxLength={1000}
          />
        </div>

        {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2">{error}</p>}

        {price && !price.paymentsEnabled && (
          <p className="text-sm text-terracotta-500 bg-sunset-100 rounded-xl px-3 py-2">
            Payments aren't set up on this server yet, so invitations can't be sent. Add a Stripe secret key to get going.
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={checkout.isPending || (price ? !price.paymentsEnabled : false)}>
          {checkout.isPending ? "Redirecting to checkout…" : `Pay ${priceLabel} & send invitation 💌`}
        </button>
        <p className="text-xs text-terracotta-300 text-center">You'll pay securely via Stripe, then your invite gets sent.</p>
      </form>
    </Modal>
  );
}
