import { Link } from "react-router-dom";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { useInvitationPrice } from "@/hooks/useInvitations";
import { Calendar, PartyPopper, RefreshCw, Images, Ticket, Bell, UserPlus } from "lucide-react";

const FEATURES = [
  {
    icon: Calendar,
    title: "Plan the date",
    text: "Pick a title, time, place, and a theme emoji, then add a sweet note before you send it.",
  },
  {
    icon: UserPlus,
    title: "Meet someone new",
    text: "Just met? Send a one-time first-date invite by email — no account needed for them to say yes.",
  },
  {
    icon: PartyPopper,
    title: "Celebrate a yes",
    text: "Your partner accepts, declines, or suggests a new time — confetti flies the moment it's on.",
  },
  {
    icon: RefreshCw,
    title: "Reschedule with ease",
    text: "Plans change. Proposing a new time keeps the invite alive instead of starting over.",
  },
  {
    icon: Images,
    title: "Keep the memories",
    text: "After a date happens, add photos, notes, and a heart rating so it's never forgotten.",
  },
  {
    icon: Ticket,
    title: "Earn date tokens",
    text: "Go on a date, or get a decline, and you'll earn a token toward your next invite.",
  },
  {
    icon: Bell,
    title: "Never miss a beat",
    text: "In-app notifications keep you both in the loop the moment something happens.",
  },
];

const STEPS = [
  { emoji: "💌", title: "Send an invite", text: "Create a date invitation for your partner in under a minute." },
  { emoji: "💚", title: "They respond", text: "Accept, decline, or propose a new time — whatever fits." },
  { emoji: "📸", title: "Make it a memory", text: "Once it happens, capture photos and notes to look back on." },
];

export default function Home() {
  const { data: price } = useInvitationPrice();
  const isFree = price?.freeMode ?? true;

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 pt-16 pb-20 text-center">
          <div className="text-6xl mb-4 animate-pop-in">💌</div>
          {isFree && (
            <span className="inline-block badge bg-sunset-100 text-terracotta-600 mb-4 !text-sm !px-4 !py-1.5">
              💕 100% free — plan away, on us
            </span>
          )}
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-terracotta-700 leading-tight">
            Never let date night <br className="hidden sm:block" />
            <span className="text-blush-500">slip through the cracks.</span>
          </h1>
          <p className="text-lg text-terracotta-500 mt-5 max-w-xl mx-auto">
            MeetYah is the fun, official way for couples to plan time together — send a playful invite, get a real answer, and
            keep every memory that follows.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link to="/signup" className="btn-primary !px-7 !py-3 text-base">
              Get started free
            </Link>
            <Link to="/login" className="btn-secondary !px-7 !py-3 text-base">
              I have an account
            </Link>
          </div>
          <div className="flex justify-center gap-4 mt-8 text-3xl">
            <span className="animate-bob inline-block" style={{ animationDelay: "0s" }}>
              💕
            </span>
            <span className="animate-bob inline-block" style={{ animationDelay: "0.3s" }}>
              🥂
            </span>
            <span className="animate-bob inline-block" style={{ animationDelay: "0.6s" }}>
              🌅
            </span>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-20">
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title} className="card p-6 text-center relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-terracotta-400 text-white text-sm font-bold flex items-center justify-center shadow">
                  {i + 1}
                </div>
                <div className="text-4xl mb-3">{step.emoji}</div>
                <h3 className="font-display font-bold text-terracotta-700">{step.title}</h3>
                <p className="text-sm text-terracotta-400 mt-1.5">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/60 py-20 border-y border-blush-100">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-3xl font-display font-bold text-terracotta-700 text-center">Everything a couple needs</h2>
            <p className="text-terracotta-400 text-center mt-2 max-w-lg mx-auto">
              Built for two — warm, simple, and a little bit delightful.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {FEATURES.map((f) => (
                <div key={f.title} className="card p-5">
                  <div className="w-11 h-11 rounded-full bg-sunset-100 text-terracotta-600 flex items-center justify-center mb-3">
                    <f.icon size={20} />
                  </div>
                  <h3 className="font-display font-bold text-terracotta-700">{f.title}</h3>
                  <p className="text-sm text-terracotta-400 mt-1.5">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="card p-10">
            <div className="text-4xl mb-3">💞</div>
            <h2 className="text-2xl font-display font-bold text-terracotta-700">Ready to plan your next date?</h2>
            <p className="text-terracotta-400 mt-2">
              It takes less than a minute to pair up and send your first invite
              {isFree ? " — completely free." : "."}
            </p>
            <Link to="/signup" className="btn-primary !px-7 !py-3 text-base mt-6 inline-flex">
              Create your couple space
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
