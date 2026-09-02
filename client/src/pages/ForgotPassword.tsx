import { useState } from "react";
import { Link } from "react-router-dom";
import { usePasswordReset } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

export default function ForgotPassword() {
  const { forgotPassword } = usePasswordReset();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await forgotPassword.mutateAsync({ email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2 animate-pop-in">🔑</div>
          <h1 className="text-3xl font-display font-bold text-terracotta-600">Reset your password</h1>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center py-2">
              <div className="text-4xl mb-3">📬</div>
              <p className="text-terracotta-600 font-semibold">If that email has an account with a password, we've sent a reset link.</p>
              <p className="text-sm text-terracotta-400 mt-2">Check your inbox — the link expires in an hour.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-sm text-terracotta-400">Enter your email and we'll send you a link to set a new password.</p>
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
                  placeholder="you@example.com"
                  required
                />
              </div>
              {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={forgotPassword.isPending}>
                {forgotPassword.isPending ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-terracotta-400 mt-5">
          <Link to="/login" className="text-terracotta-600 font-semibold hover:underline">
            Back to log in
          </Link>
          {" · "}
          <Link to="/" className="text-terracotta-600 font-semibold hover:underline">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
