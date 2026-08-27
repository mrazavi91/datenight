import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, ApiError } from "@/lib/api";

type State = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Missing verification link.");
      return;
    }
    apiPost("/api/auth/verify-email", { token })
      .then(() => {
        setState("success");
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ApiError ? err.message : "Something went wrong confirming your email.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm w-full animate-pop-in">
        {state === "loading" && (
          <>
            <div className="text-5xl mb-3 animate-wiggle">💌</div>
            <p className="text-terracotta-600 font-semibold">Confirming your email…</p>
          </>
        )}
        {state === "success" && (
          <>
            <div className="text-5xl mb-3">✅</div>
            <p className="text-terracotta-600 font-bold text-lg">Email confirmed!</p>
            <p className="text-sm text-terracotta-400 mt-1">You're all set.</p>
            <Link to="/" className="btn-primary w-full mt-4 inline-flex">
              Go to dashboard
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <div className="text-5xl mb-3">💔</div>
            <p className="text-terracotta-600 font-bold text-lg">Couldn't confirm that link</p>
            {message && <p className="text-sm text-terracotta-400 mt-1">{message}</p>}
            <Link to="/" className="btn-secondary w-full mt-4 inline-flex">
              Back to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
