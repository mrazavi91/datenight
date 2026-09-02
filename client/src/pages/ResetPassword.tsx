import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { usePasswordReset } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = usePasswordReset();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await resetPassword.mutateAsync({ token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-3">💔</div>
          <p className="text-terracotta-600 font-bold text-lg">Missing reset link</p>
          <p className="text-sm text-terracotta-400 mt-1">Use the link from your email, or request a new one.</p>
          <Link to="/forgot-password" className="btn-primary w-full mt-4 inline-flex">
            Request a reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2 animate-pop-in">🔑</div>
          <h1 className="text-3xl font-display font-bold text-terracotta-600">Set a new password</h1>
        </div>

        <div className="card p-6">
          {done ? (
            <div className="text-center py-2">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-terracotta-600 font-semibold">Password updated! Redirecting to log in…</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>
              {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-terracotta-400 mt-5">
          <Link to="/" className="text-terracotta-600 font-semibold hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
