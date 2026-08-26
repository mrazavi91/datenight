import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useCouple, useCoupleActions } from "@/hooks/useCouple";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

export default function Onboarding() {
  const { user, logout } = useAuth();
  const { data, isLoading } = useCouple();
  const { create, join } = useCoupleActions();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (isLoading) return null;
  if (data?.couple?.paired) return <Navigate to="/" replace />;

  const couple = data?.couple;

  async function handleCreate() {
    setError(null);
    try {
      await create.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await join.mutateAsync(inviteCode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  function copyCode() {
    if (!couple) return;
    navigator.clipboard.writeText(couple.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">💞</div>
          <h1 className="text-2xl font-display font-bold text-terracotta-600">Hi {user?.name?.split(" ")[0]}!</h1>
          <p className="text-terracotta-400 mt-1">Let's link you up with your partner</p>
        </div>

        {couple && !couple.paired ? (
          <div className="card p-6 text-center animate-pop-in">
            <p className="text-terracotta-500 mb-3">Share this code with your partner:</p>
            <div className="text-4xl font-display font-extrabold tracking-[0.3em] text-terracotta-600 bg-sunset-100 rounded-2xl py-4 mb-3">
              {couple.inviteCode}
            </div>
            <button onClick={copyCode} className="btn-secondary w-full mb-2">
              {copied ? "Copied! ✅" : "Copy code"}
            </button>
            <p className="text-sm text-terracotta-300 mt-3">Waiting for your partner to join…</p>
            <div className="flex justify-center gap-1 mt-2 text-xl">
              <span className="animate-wiggle">💌</span>
            </div>
          </div>
        ) : (
          <div className="card p-6 space-y-6">
            <div>
              <h2 className="font-display font-bold text-lg mb-2">Start a couple space</h2>
              <p className="text-sm text-terracotta-400 mb-3">Create a space and invite your partner with a code.</p>
              <button onClick={handleCreate} className="btn-primary w-full" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create couple space"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px bg-blush-100 flex-1" />
              <span className="text-xs text-terracotta-300 font-semibold">OR</span>
              <div className="h-px bg-blush-100 flex-1" />
            </div>

            <form onSubmit={handleJoin}>
              <h2 className="font-display font-bold text-lg mb-2">Join your partner</h2>
              <p className="text-sm text-terracotta-400 mb-3">Enter the 6-character invite code they shared.</p>
              <input
                className="input text-center tracking-[0.3em] font-bold uppercase mb-3"
                maxLength={6}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                required
              />
              <button type="submit" className="btn-secondary w-full" disabled={join.isPending}>
                {join.isPending ? "Joining…" : "Join couple space"}
              </button>
            </form>
          </div>
        )}

        {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2 mt-4 text-center">{error}</p>}

        <button onClick={() => logout.mutate()} className="btn-ghost w-full mt-6 text-sm">
          Log out
        </button>
      </div>
    </div>
  );
}
