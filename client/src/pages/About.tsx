import { Link } from "react-router-dom";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { Heart, Sparkles, ShieldCheck } from "lucide-react";

const VALUES = [
  {
    icon: Heart,
    title: "Small effort, real connection",
    text: "A good relationship isn't built on grand gestures — it's built on showing up. We wanted the smallest possible bit of friction between 'let's do something' and it actually being on the calendar.",
  },
  {
    icon: Sparkles,
    title: "A little delight goes a long way",
    text: "Confetti when you say yes. A token when plans change. MeetYah is meant to feel like a warm surprise, not another chore app.",
  },
  {
    icon: ShieldCheck,
    title: "Just the two of you",
    text: "Every couple gets their own private space. No feeds, no strangers, no noise — just you, your partner, and your plans.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
          <div className="text-5xl mb-4">💌</div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-terracotta-700">About MeetYah</h1>
          <p className="text-lg text-terracotta-500 mt-4">
            We built MeetYah because "we should do something this weekend" kept dying in a group chat, unanswered.
          </p>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-12">
          <div className="card p-8 space-y-4 text-terracotta-600 leading-relaxed">
            <p>
              MeetYah started as a simple idea: turn "we should hang out sometime" into an actual plan, with an actual answer,
              in under a minute. Calendars are for meetings. Group chats lose ideas in the scroll. Neither one feels like an
              invitation — and asking someone on a date should feel like one, even after years together.
            </p>
            <p>
              So we made a place just for the two of you. One partner proposes a date night — dinner, a walk, a lazy movie
              night — and the other gets to say yes with a little celebration, no with grace, or "actually, how about Tuesday?"
              without the whole plan falling apart. And once the date happens, it doesn't just disappear — you can look back on
              it together with photos, notes, and a rating that becomes a small archive of your time together.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid sm:grid-cols-3 gap-5">
            {VALUES.map((v) => (
              <div key={v.title} className="card p-6">
                <div className="w-11 h-11 rounded-full bg-sunset-100 text-terracotta-600 flex items-center justify-center mb-3">
                  <v.icon size={20} />
                </div>
                <h3 className="font-display font-bold text-terracotta-700">{v.title}</h3>
                <p className="text-sm text-terracotta-400 mt-1.5">{v.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-2xl mx-auto px-4 pb-20 text-center">
          <div className="card p-8">
            <div className="text-3xl mb-2">🥂</div>
            <h2 className="font-display font-bold text-xl text-terracotta-700">Got a question or an idea?</h2>
            <p className="text-terracotta-400 mt-1">We'd genuinely love to hear it.</p>
            <Link to="/support" className="btn-secondary mt-4 inline-flex">
              Get in touch
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
