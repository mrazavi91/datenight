import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications, useNotificationActions } from "@/hooks/useNotifications";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { data } = useNotifications();
  const { markAllRead } = useNotificationActions();
  const [open, setOpen] = useState(false);

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-full hover:bg-blush-100 text-terracotta-600"
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unreadCount > 0) markAllRead.mutate();
        }}
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-blush-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[90vw] card p-2 z-40 max-h-96 overflow-y-auto">
            <h3 className="font-display font-bold px-3 py-2 text-terracotta-600">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-sm text-terracotta-300 px-3 py-4 text-center">No notifications yet 🌙</p>
            ) : (
              <ul className="space-y-1">
                {notifications.map((n) => (
                  <li key={n.id} className={`px-3 py-2 rounded-xl text-sm ${n.isRead ? "text-terracotta-500" : "bg-blush-50 text-terracotta-700 font-medium"}`}>
                    <p>{n.message}</p>
                    <p className="text-xs text-terracotta-300 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
