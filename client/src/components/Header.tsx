import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCouple } from "@/hooks/useCouple";
import NotificationBell from "@/components/NotificationBell";
import { LogOut, Settings } from "lucide-react";

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow" />;
  }
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-terracotta-300 to-blush-400 text-white flex items-center justify-center font-bold border-2 border-white shadow">
      {initial}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const { data } = useCouple();
  const partner = data?.partner;
  const credits = data?.couple?.credits ?? 0;
  const oneTimeCredits = user?.oneTimeCredits ?? 0;

  return (
    <header className="sticky top-0 z-20 bg-cream-100/80 backdrop-blur border-b border-blush-100">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💕</span>
          <span className="font-display font-bold text-lg text-terracotta-600 hidden sm:inline">MeetYah</span>
        </div>

        <div className="flex items-center gap-3">
          {credits > 0 && (
            <span className="badge bg-sunset-100 text-terracotta-600 gap-1" title="Date tokens — spend instead of paying">
              🎟️ {credits}
            </span>
          )}
          {oneTimeCredits > 0 && (
            <span className="badge bg-blush-100 text-blush-600 gap-1" title="First-date tokens — spend on one-time invites">
              🎫 {oneTimeCredits}
            </span>
          )}
          {partner && user && (
            <div className="hidden sm:flex items-center -space-x-2">
              <Avatar name={user.name} url={user.avatarUrl} />
              <Avatar name={partner.name} url={partner.avatarUrl} />
            </div>
          )}
          <NotificationBell />
          <Link to="/settings" className="p-2 rounded-full hover:bg-blush-100 text-terracotta-500" aria-label="Account settings">
            <Settings size={20} />
          </Link>
          <button onClick={() => logout.mutate()} className="p-2 rounded-full hover:bg-blush-100 text-terracotta-500" aria-label="Log out">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
