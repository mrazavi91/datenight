import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { celebrate } from "@/lib/confetti";
import type { Notification } from "@shared/schema";

export default function ToastWatcher() {
  const { data } = useNotifications();
  const seenIds = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<Notification[]>([]);

  useEffect(() => {
    const notifications = data?.notifications ?? [];
    if (seenIds.current === null) {
      // First load: don't toast historical notifications.
      seenIds.current = new Set(notifications.map((n) => n.id));
      return;
    }
    const fresh = notifications.filter((n) => !seenIds.current!.has(n.id));
    if (fresh.length === 0) return;

    fresh.forEach((n) => seenIds.current!.add(n.id));
    setToasts((prev) => [...fresh, ...prev].slice(0, 4));

    if (fresh.some((n) => n.type === "invite_accepted")) {
      celebrate();
    }

    fresh.forEach((n) => {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== n.id));
      }, 5000);
    });
  }, [data]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] space-y-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className="card px-4 py-3 shadow-soft animate-pop-in border-blush-200">
          <p className="text-sm font-medium text-terracotta-700">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
