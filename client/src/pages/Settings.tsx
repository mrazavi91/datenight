import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (!user) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await updateProfile.mutateAsync({ name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your name");
    }
  }

  return (
    <div className="min-h-screen pb-16">
      <Header />
      <main className="max-w-lg mx-auto px-4 pt-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-terracotta-400 hover:text-terracotta-600 mb-4">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-display font-bold text-terracotta-700 mb-6">Account settings</h1>

        <div className="card p-6 mb-6">
          <h2 className="font-display font-bold text-terracotta-700 mb-4">Profile</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </div>
            <div>
              <label className="label">Email</label>
              <p className="text-sm text-terracotta-500 bg-blush-50 rounded-xl px-3 py-2.5">{user.email}</p>
            </div>
            {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving…" : saved ? "Saved! ✅" : "Save changes"}
            </button>
          </form>
        </div>

        <div className="card p-6 border-blush-200">
          <h2 className="font-display font-bold text-terracotta-700 mb-1">Delete account</h2>
          <p className="text-sm text-terracotta-400 mb-4">This permanently removes your account and can't be undone.</p>
          <button className="btn-secondary !text-blush-600 w-full" onClick={() => setShowDelete(true)}>
            Delete my account
          </button>
        </div>
      </main>

      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}
    </div>
  );
}
