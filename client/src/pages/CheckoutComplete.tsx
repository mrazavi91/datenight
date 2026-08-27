import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Invitation } from "@shared/schema";

type State = "loading" | "success" | "pending" | "error";

export default function CheckoutComplete() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>("loading");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setMessage("Missing checkout session.");
      return;
    }

    api<{ invitation?: Invitation; message?: string }>(`/api/invitations/checkout/complete?session_id=${encodeURIComponent(sessionId)}`)
      .then((data) => {
        if (!data.invitation) {
          setState("pending");
          return;
        }
        setInvitation(data.invitation);
        setState("success");
        queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        setTimeout(() => navigate("/", { replace: true }), 2200);
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ApiError ? err.message : "Something went wrong confirming your payment.");
      });
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm w-full animate-pop-in">
        {state === "loading" && (
          <>
            <div className="text-5xl mb-3 animate-wiggle">💳</div>
            <p className="text-terracotta-600 font-semibold">Confirming your payment…</p>
          </>
        )}
        {state === "pending" && (
          <>
            <div className="text-5xl mb-3 animate-wiggle">⏳</div>
            <p className="text-terracotta-600 font-semibold">Payment received — just finalizing your invite.</p>
            <p className="text-sm text-terracotta-400 mt-2">This can take a few seconds. Head back to your dashboard and it'll be there.</p>
            <Link to="/" className="btn-primary w-full mt-4 inline-flex">
              Go to dashboard
            </Link>
          </>
        )}
        {state === "success" && (
          <>
            <div className="text-5xl mb-3">💌</div>
            <p className="text-terracotta-600 font-bold text-lg">Payment successful!</p>
            <p className="text-sm text-terracotta-400 mt-1">
              {invitation ? `"${invitation.title}" is on its way to your partner.` : "Your invitation is on its way."}
            </p>
            <p className="text-xs text-terracotta-300 mt-3">Redirecting you to the dashboard…</p>
          </>
        )}
        {state === "error" && (
          <>
            <div className="text-5xl mb-3">💔</div>
            <p className="text-terracotta-600 font-bold text-lg">We couldn't confirm that payment</p>
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
