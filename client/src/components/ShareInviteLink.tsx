import { useState } from "react";
import { MessageCircle, Copy, Check, Share2 } from "lucide-react";

// Lets the sender share a one-time invite link directly instead of relying only on the
// recipient's inbox — useful when the invite email lands in spam, or they'd rather just
// text/WhatsApp the link.
export default function ShareInviteLink({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const shareText = `You're invited: "${title}" 💕`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function onShare() {
    try {
      await navigator.share({ title: "MeetYah invite", text: shareText, url });
    } catch {
      // User cancelled the share sheet, or the platform rejected it — nothing to do.
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied in some contexts; the link is shown below regardless.
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`;

  return (
    <div className="mt-4">
      <p className="text-xs text-terracotta-400 mb-2">Or share the link directly:</p>
      <div className="bg-blush-50 rounded-xl px-3 py-2 text-xs text-terracotta-500 break-all mb-3">{url}</div>
      <div className="flex flex-wrap gap-2 justify-center">
        {canShare && (
          <button type="button" onClick={onShare} className="btn-secondary !py-2 !px-3 text-sm">
            <Share2 size={16} /> Share
          </button>
        )}
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2 !px-3 text-sm">
          <MessageCircle size={16} /> WhatsApp
        </a>
        <button type="button" onClick={onCopy} className="btn-secondary !py-2 !px-3 text-sm">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
