import { useEffect, useRef, useState } from "react";
import type { Invitation, PublicUser, Memory } from "@shared/schema";
import { formatDate, formatTime } from "@/lib/invitations";
import { useInvitationActions } from "@/hooks/useInvitations";
import { api, apiUpload, ApiError } from "@/lib/api";
import { Heart, MapPin, Camera, X } from "lucide-react";

interface Photo {
  id: string;
  url: string;
}

const MAX_PHOTOS = 6;

export default function PastDateCard({ invitation, partner }: { invitation: Invitation; partner: PublicUser | null }) {
  const { saveMemory } = useInvitationActions();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadMemory() {
    api<{ memory: Memory | null; photos: Photo[] }>(`/api/invitations/${invitation.id}/memory`).then((res) => {
      if (res.memory) {
        setMemory(res.memory);
        setNote(res.memory.note ?? "");
        setRating(res.memory.rating ?? 0);
      }
      setPhotos(res.photos ?? []);
    });
  }

  useEffect(loadMemory, [invitation.id]);

  async function handleSave() {
    const res = await saveMemory.mutateAsync({ id: invitation.id, note, rating: rating || undefined });
    setMemory(res.memory);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPhotoError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("photos", f));
      const res = await apiUpload<{ photos: Photo[] }>(`/api/invitations/${invitation.id}/memory/photos`, formData);
      setPhotos(res.photos);
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : "Couldn't upload those photos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto(photoId: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    try {
      await api(`/api/invitations/${invitation.id}/memory/photos/${photoId}`, { method: "DELETE" });
    } catch {
      loadMemory(); // out of sync with the server — refetch to recover
    }
  }

  return (
    <div className="card p-4 sm:p-5 opacity-90">
      <div className="flex items-start gap-3">
        <div className="text-3xl leading-none grayscale-[15%]">{invitation.emoji}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-terracotta-700 truncate">{invitation.title}</h3>
          <p className="text-sm text-terracotta-500 font-semibold mt-0.5">
            {formatDate(invitation.date)} · {formatTime(invitation.time)}
          </p>
          {invitation.location && (
            <p className="text-sm text-terracotta-400 flex items-center gap-1 mt-0.5">
              <MapPin size={14} /> {invitation.location}
            </p>
          )}

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {photos.map((p) => (
                <div key={p.id} className="relative w-16 h-16 rounded-xl overflow-hidden border border-blush-100 shrink-0">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleDeletePhoto(p.id)}
                    className="absolute top-0.5 right-0.5 bg-terracotta-900/60 text-white rounded-full p-0.5"
                    aria-label="Remove photo"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!editing && memory && (memory.note || memory.rating) ? (
            <div className="mt-2 bg-blush-50 rounded-xl px-3 py-2">
              {memory.rating ? (
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Heart key={n} size={16} className={n <= (memory.rating ?? 0) ? "fill-blush-500 text-blush-500" : "text-blush-200"} />
                  ))}
                </div>
              ) : null}
              {memory.note && <p className="text-sm text-terracotta-500 italic">"{memory.note}"</p>}
              <button className="text-xs text-terracotta-400 underline mt-1" onClick={() => setEditing(true)}>
                Edit memory
              </button>
            </div>
          ) : !editing ? (
            <button className="btn-ghost !py-1.5 !px-3 text-sm mt-2" onClick={() => setEditing(true)}>
              Add a memory ✍️
            </button>
          ) : null}

          {editing && (
            <div className="mt-2 bg-blush-50 rounded-xl p-3 space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`Rate ${n}`}>
                    <Heart size={22} className={n <= rating ? "fill-blush-500 text-blush-500" : "text-blush-200"} />
                  </button>
                ))}
              </div>
              <textarea
                className="input min-h-16 resize-none text-sm"
                placeholder="How was it?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
              />
              <div className="flex gap-2">
                <button className="btn-primary !py-1.5 !px-4 text-sm" onClick={handleSave} disabled={saveMemory.isPending}>
                  Save
                </button>
                <button className="btn-ghost !py-1.5 !px-4 text-sm" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />
              <button
                type="button"
                className="btn-ghost !py-1.5 !px-3 text-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera size={15} />
                {uploading ? "Uploading…" : "Add photos"}
              </button>
            </div>
          )}
          {photoError && <p className="text-xs text-blush-600 mt-1">{photoError}</p>}
          {saved && <p className="text-xs text-green-600 mt-1">Saved 💾</p>}
        </div>
      </div>
    </div>
  );
}
