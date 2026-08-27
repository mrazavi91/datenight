import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api";

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const isSignup = mode === "signup";
  const pending = isSignup ? signup.isPending : login.isPending;

  useEffect(() => {
    api<{ googleAuthEnabled: boolean }>("/api/auth/config")
      .then((c) => setGoogleEnabled(c.googleAuthEnabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    if (searchParams.get("error") === "google") {
      setError("Google sign-in didn't work. Please try again.");
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isSignup) {
        await signup.mutateAsync({ name, email, password });
      } else {
        await login.mutateAsync({ email, password });
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2 animate-pop-in">💌</div>
          <h1 className="text-3xl font-display font-bold text-terracotta-600">MeetYah</h1>
          <p className="text-terracotta-400 mt-1">Plan sweet moments together</p>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-display font-bold mb-4">{isSignup ? "Create your account" : "Welcome back"}</h2>

          <form onSubmit={onSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="label" htmlFor="name">
                  Name
                </label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jamie" required />
              </div>
            )}
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
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={isSignup ? 8 : undefined}
                required
              />
            </div>

            {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
            </button>
          </form>

          {googleEnabled && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-blush-100 flex-1" />
                <span className="text-xs text-terracotta-300 font-semibold">OR</span>
                <div className="h-px bg-blush-100 flex-1" />
              </div>
              <a href="/api/auth/google" className="btn-secondary w-full">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.43 2.02.96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
                </svg>
                Continue with Google
              </a>
            </>
          )}
        </div>

        <p className="text-center text-sm text-terracotta-400 mt-5">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link to="/login" className="text-terracotta-600 font-semibold hover:underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link to="/signup" className="text-terracotta-600 font-semibold hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
