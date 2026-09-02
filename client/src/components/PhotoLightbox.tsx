import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Photo {
  id: string;
  url: string;
}

export default function PhotoLightbox({
  photos,
  index,
  onClose,
  onIndexChange,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndexChange]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center" onClick={onClose}>
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={28} />
      </button>

      {photos.length > 1 && (
        <button
          className="absolute left-2 sm:left-6 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + photos.length) % photos.length);
          }}
          aria-label="Previous photo"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      <img
        src={photo.url}
        alt=""
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />

      {photos.length > 1 && (
        <button
          className="absolute right-2 sm:right-6 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % photos.length);
          }}
          aria-label="Next photo"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
