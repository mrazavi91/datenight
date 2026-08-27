import { useEffect, useState } from "react";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { useAuth } from "@/hooks/useAuth";
import { apiPost, ApiError } from "@/lib/api";
import { Mail } from "lucide-react";

const FAQS = [
  { q: "How do I pair with my partner?", a: "One of you creates a couple space to get a 6-character invite code, then the other joins with that code from the onboarding screen." },
  { q: "What happens if my partner declines an invite?", a: "No hard feelings — and you get a date token credited back, which you can use to send a future invite for free." },
  { q: "Does sending an invite always cost money?", a: "It costs £1.99 unless you have a date token (earned from a decline or a date that happened) — tokens are always free to use." },
];

export default function Support() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await apiPost("/api/support", { name, email, message });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send your message. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center">
          <div className="text-5xl mb-4">🛟</div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-terracotta-700">We're here to help</h1>
          <p className="text-lg text-terracotta-500 mt-4">Stuck on something, found a bug, or just have feedback? Send us a note.</p>
        </section>

        <section className="max-w-lg mx-auto px-4 pb-16">
          <div className="card p-6 sm:p-8">
            {sent ? (
              <div className="text-center py-6 animate-pop-in">
                <div className="text-4xl mb-3">💌</div>
                <h2 className="font-display font-bold text-lg text-terracotta-700">Message sent!</h2>
                <p className="text-terracotta-400 mt-2">Thanks for reaching out — we'll get back to you as soon as we can.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="label" htmlFor="name">
                    Name
                  </label>
                  <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
                </div>
                <div>
                  <label className="label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="message">
                    How can we help?
                  </label>
                  <textarea
                    id="message"
                    className="input min-h-32 resize-none"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's going on…"
                    maxLength={4000}
                    required
                  />
                </div>

                {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2">{error}</p>}

                <button type="submit" className="btn-primary w-full" disabled={pending}>
                  <Mail size={16} />
                  {pending ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="max-w-2xl mx-auto px-4 pb-20">
          <h2 className="text-xl font-display font-bold text-terracotta-700 text-center mb-5">Quick answers</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <div key={f.q} className="card p-5">
                <h3 className="font-semibold text-terracotta-700">{f.q}</h3>
                <p className="text-sm text-terracotta-400 mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
