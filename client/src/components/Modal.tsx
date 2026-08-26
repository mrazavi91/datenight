import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-terracotta-900/30 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="card w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-b-xl2 animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2 sticky top-0 bg-white/95 backdrop-blur">
          <h2 className="font-display font-bold text-xl text-terracotta-600">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-blush-100 text-terracotta-500" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
