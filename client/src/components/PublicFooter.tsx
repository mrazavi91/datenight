import { Link } from "react-router-dom";

export default function PublicFooter() {
  return (
    <footer className="border-t border-blush-100 mt-16">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-terracotta-400">
        <div className="flex items-center gap-2">
          <span className="text-lg">💕</span>
          <span className="font-display font-bold text-terracotta-500">MeetYah</span>
        </div>
        <nav className="flex items-center gap-5 font-medium">
          <Link to="/" className="hover:text-terracotta-600">
            Home
          </Link>
          <Link to="/about" className="hover:text-terracotta-600">
            About
          </Link>
          <Link to="/support" className="hover:text-terracotta-600">
            Support
          </Link>
        </nav>
        <p>&copy; {new Date().getFullYear()} MeetYah. Made for couples, with love.</p>
      </div>
    </footer>
  );
}
