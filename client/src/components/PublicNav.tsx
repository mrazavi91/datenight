import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function PublicNav() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-cream-100/80 backdrop-blur border-b border-blush-100">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">💕</span>
          <span className="font-display font-bold text-lg text-terracotta-600">Date Night</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-semibold text-terracotta-500">
          <Link to="/about" className="hover:text-terracotta-600">
            About
          </Link>
          <Link to="/support" className="hover:text-terracotta-600">
            Support
          </Link>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <Link to="/" className="btn-primary !py-2 !px-4 text-sm">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost !py-2 !px-3 text-sm">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary !py-2 !px-4 text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
