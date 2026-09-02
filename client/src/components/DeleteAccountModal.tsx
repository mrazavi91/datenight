import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "@/components/Modal";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { ACCOUNT_DELETE_REASONS } from "@shared/schema";

export default function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    const reason = selectedReason === "Something else" ? customReason.trim() : selectedReason ?? customReason.trim();
    try {
      await deleteAccount.mutateAsync({ reason: reason || undefined });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete your account. Please try again.");
    }
  }

  if (confirming) {
    return (
      <Modal title="Are you sure?" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-terracotta-500">
            This permanently deletes your account. If you're paired with a partner, <strong>their account and your whole shared
            date history are deleted too</strong> — they'll get an email letting them know. This can't be undone.
          </p>
          {error && <p className="text-sm text-blush-600 bg-blush-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setConfirming(false)} disabled={deleteAccount.isPending}>
              Go back
            </button>
            <button
              className="flex-1 rounded-full font-semibold px-5 py-2.5 bg-blush-600 text-white hover:brightness-105 disabled:opacity-50"
              onClick={handleDelete}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? "Deleting…" : "Delete my account"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Delete your account" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-terracotta-500">
          Sorry to see you go. Mind telling us why? Totally optional — you can skip straight to deleting.
        </p>
        <div className="space-y-2">
          {ACCOUNT_DELETE_REASONS.map((reason) => (
            <label
              key={reason}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer border-2 transition-colors ${
                selectedReason === reason ? "border-terracotta-400 bg-sunset-100" : "border-transparent bg-blush-50"
              }`}
            >
              <input
                type="radio"
                name="delete-reason"
                className="w-4 h-4 accent-terracotta-500"
                checked={selectedReason === reason}
                onChange={() => setSelectedReason(reason)}
              />
              <span className="text-sm text-terracotta-600">{reason}</span>
            </label>
          ))}
        </div>
        {selectedReason === "Something else" && (
          <textarea
            className="input min-h-20 resize-none text-sm"
            placeholder="Tell us more (optional)"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            maxLength={500}
          />
        )}
        <button className="btn-secondary w-full !bg-blush-50" onClick={() => setConfirming(true)}>
          Continue
        </button>
      </div>
    </Modal>
  );
}
