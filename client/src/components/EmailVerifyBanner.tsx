import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAuthConfig } from "@/hooks/useAuthConfig";
import { apiPost, ApiError } from "@/lib/api";
import { Mail } from "lucide-react";

export default function EmailVerifyBanner() {
  const { user } = useAuth();
  const { data: config } = useAuthConfig();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resend = useMutation({
    mutationFn: () => apiPost("/api/auth/resend-verification"),
    onSuccess: () => setSent(true),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't resend that email"),
  });

  if (!user || user.emailVerified || !config?.emailEnabled) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4">
      <div className="card px-4 py-3 border-sunset-200 bg-sunset-100/60 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-terracotta-600 flex items-center gap-2">
          <Mail size={16} /> Please confirm your email address ({user.email}).
        </span>
        {sent ? (
          <span className="text-terracotta-500 font-medium">Sent! Check your inbox 💌</span>
        ) : (
          <button className="btn-ghost !py-1 !px-3 text-sm" onClick={() => resend.mutate()} disabled={resend.isPending}>
            {resend.isPending ? "Sending…" : "Resend confirmation"}
          </button>
        )}
        {error && <span className="text-blush-600 text-xs w-full">{error}</span>}
      </div>
    </div>
  );
}
