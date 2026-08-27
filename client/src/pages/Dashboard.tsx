import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCouple } from "@/hooks/useCouple";
import { useInvitations } from "@/hooks/useInvitations";
import { useOneTimeInvitations } from "@/hooks/useOneTimeInvitations";
import { categorize } from "@/lib/invitations";
import Header from "@/components/Header";
import ToastWatcher from "@/components/ToastWatcher";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import CreateInvitationModal from "@/components/CreateInvitationModal";
import CreateOneTimeInviteModal from "@/components/CreateOneTimeInviteModal";
import OneTimeInvitesList from "@/components/OneTimeInvitesList";
import InvitationCard from "@/components/InvitationCard";
import PastDateCard from "@/components/PastDateCard";
import Modal from "@/components/Modal";
import { Plus, Heart, UserPlus } from "lucide-react";

function Section({ title, subtitle, children, emptyText }: { title: string; subtitle?: string; children: React.ReactNode; emptyText: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="mb-8">
      <h2 className="font-display font-bold text-lg text-terracotta-700">{title}</h2>
      {subtitle && <p className="text-sm text-terracotta-400 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {hasChildren ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <p className="text-sm text-terracotta-300 card px-4 py-6 text-center">{emptyText}</p>
      )}
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: coupleData } = useCouple();
  const { data: inviteData, isLoading } = useInvitations();
  const { data: oneTimeData } = useOneTimeInvitations();
  const [showChooser, setShowChooser] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showOneTime, setShowOneTime] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCancelledNotice, setShowCancelledNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get("checkout") === "cancelled") {
      setShowCancelledNotice(true);
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      setSearchParams(next, { replace: true });
      const t = setTimeout(() => setShowCancelledNotice(false), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-wiggle">💕</div>
      </div>
    );
  }

  const partner = coupleData?.partner ?? null;
  const invitations = inviteData?.invitations ?? [];
  const { awaitingYou, awaitingPartner, upcoming, past, declined } = categorize(invitations, user.id);

  return (
    <div className="min-h-screen pb-28">
      <Header />
      <ToastWatcher />
      <EmailVerifyBanner />

      {showCancelledNotice && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="card px-4 py-3 border-blush-200 text-sm text-terracotta-600 animate-pop-in">
            Checkout cancelled — no charge was made, and your invitation wasn't sent.
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 pt-6">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-terracotta-700">
            Hi {user.name.split(" ")[0]}
            {partner ? ` & ${partner.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-terracotta-400">Here's what's happening with your dates.</p>
        </div>

        {awaitingYou.length > 0 && (
          <Section title="Needs your response 💌" emptyText="">
            {awaitingYou.map((inv) => (
              <InvitationCard key={inv.id} invitation={inv} currentUserId={user.id} partner={partner} />
            ))}
          </Section>
        )}

        <Section title="Upcoming Dates" subtitle="Accepted and coming up" emptyText="No upcoming dates yet — plan one! 🌅">
          {upcoming.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} currentUserId={user.id} partner={partner} />
          ))}
        </Section>

        <Section title="Pending Invitations" subtitle="Sent, awaiting a response" emptyText="Nothing pending right now.">
          {awaitingPartner.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} currentUserId={user.id} partner={partner} />
          ))}
        </Section>

        <Section title="Past Dates" subtitle="Add a memory or rating" emptyText="Your date history will show up here.">
          {past.map((inv) => (
            <PastDateCard key={inv.id} invitation={inv} partner={partner} />
          ))}
        </Section>

        {declined.length > 0 && (
          <Section title="Declined" emptyText="">
            {declined.map((inv) => (
              <InvitationCard key={inv.id} invitation={inv} currentUserId={user.id} partner={partner} />
            ))}
          </Section>
        )}

        {(oneTimeData?.invitations.length ?? 0) > 0 && (
          <Section title="First-date requests" subtitle="One-time invites you've sent" emptyText="">
            <OneTimeInvitesList />
          </Section>
        )}

        <div className="flex items-center justify-center gap-4 text-sm text-terracotta-300 pt-4">
          <Link to="/about" className="hover:text-terracotta-500">
            About
          </Link>
          <span>·</span>
          <Link to="/support" className="hover:text-terracotta-500">
            Support
          </Link>
        </div>
      </main>

      <button
        onClick={() => setShowChooser(true)}
        className="fixed bottom-6 right-6 btn-primary !rounded-full !p-4 shadow-soft"
        aria-label="Create invitation"
      >
        <Plus size={24} />
        <span className="hidden sm:inline">New date</span>
      </button>

      {showChooser && (
        <Modal title="What kind of invite?" onClose={() => setShowChooser(false)}>
          <div className="space-y-3">
            <button
              className="w-full card p-4 text-left flex items-center gap-3 hover:border-terracotta-300 border-2 border-transparent transition-colors"
              onClick={() => {
                setShowChooser(false);
                setShowCreate(true);
              }}
            >
              <div className="w-10 h-10 rounded-full bg-sunset-100 text-terracotta-600 flex items-center justify-center shrink-0">
                <Heart size={18} />
              </div>
              <div>
                <p className="font-semibold text-terracotta-700">Plan a date with {partner?.name?.split(" ")[0] ?? "your partner"}</p>
                <p className="text-sm text-terracotta-400">The usual — accept, decline, or reschedule.</p>
              </div>
            </button>
            <button
              className="w-full card p-4 text-left flex items-center gap-3 hover:border-terracotta-300 border-2 border-transparent transition-colors"
              onClick={() => {
                setShowChooser(false);
                setShowOneTime(true);
              }}
            >
              <div className="w-10 h-10 rounded-full bg-sunset-100 text-terracotta-600 flex items-center justify-center shrink-0">
                <UserPlus size={18} />
              </div>
              <div>
                <p className="font-semibold text-terracotta-700">Meet someone new</p>
                <p className="text-sm text-terracotta-400">A one-time first-date invite — no account needed for them.</p>
              </div>
            </button>
          </div>
        </Modal>
      )}

      {showCreate && <CreateInvitationModal onClose={() => setShowCreate(false)} />}
      {showOneTime && <CreateOneTimeInviteModal onClose={() => setShowOneTime(false)} />}
    </div>
  );
}
