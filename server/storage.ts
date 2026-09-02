import { eq, or, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./db";
import {
  users,
  couples,
  invitations,
  memories,
  memoryPhotos,
  notifications,
  payments,
  supportRequests,
  accountDeletions,
  oneTimeInvitations,
  oneTimePayments,
  type User,
  type Couple,
  type Invitation,
  type Memory,
  type MemoryPhoto,
  type Notification,
  type Payment,
  type SupportRequest,
  type AccountDeletion,
  type OneTimeInvitation,
  type OneTimePayment,
} from "../shared/schema";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function genInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export const storage = {
  // ----- Users -----
  async getUserById(id: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  },
  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  },
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.googleId, googleId)).get();
  },
  async createUser(data: {
    name: string;
    email: string;
    passwordHash?: string | null;
    googleId?: string | null;
    authProvider: string;
    avatarUrl?: string | null;
    emailVerifiedAt?: number | null;
    verificationToken?: string | null;
    verificationTokenExpiresAt?: number | null;
  }): Promise<User> {
    const user: User = {
      id: nanoid(),
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash ?? null,
      googleId: data.googleId ?? null,
      authProvider: data.authProvider,
      avatarUrl: data.avatarUrl ?? null,
      coupleId: null,
      emailVerifiedAt: data.emailVerifiedAt ?? null,
      verificationToken: data.verificationToken ?? null,
      verificationTokenExpiresAt: data.verificationTokenExpiresAt ?? null,
      resetToken: null,
      resetTokenExpiresAt: null,
      oneTimeCredits: 0,
      createdAt: Date.now(),
    };
    db.insert(users).values(user).run();
    return user;
  },
  async updateUser(id: string, patch: Partial<User>): Promise<void> {
    db.update(users).set(patch).where(eq(users.id, id)).run();
  },
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.verificationToken, token)).get();
  },
  async getUserByResetToken(token: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.resetToken, token)).get();
  },
  // Removes a user and cleans up what's only theirs (notifications, one-time invites they
  // sent). If they were in a paired couple, the couple and its invitation/memory history stay
  // intact for the remaining partner — just the deleted user's slot is freed up so a new
  // partner can join. An unpaired (solo) couple has no history to preserve, so it's removed too.
  async deleteUserCascade(userId: string): Promise<{ remainingPartnerId: string | null }> {
    db.delete(oneTimeInvitations).where(eq(oneTimeInvitations.senderId, userId)).run();
    db.delete(oneTimePayments).where(eq(oneTimePayments.senderId, userId)).run();
    db.delete(notifications).where(eq(notifications.userId, userId)).run();

    let remainingPartnerId: string | null = null;
    const user = await this.getUserById(userId);
    if (user?.coupleId) {
      const couple = await this.getCoupleById(user.coupleId);
      if (couple) {
        const isUser1 = couple.user1Id === userId;
        const otherId = isUser1 ? couple.user2Id : couple.user1Id;
        if (!otherId) {
          db.delete(couples).where(eq(couples.id, couple.id)).run();
        } else {
          db.update(couples)
            .set(isUser1 ? { user1Id: otherId, user2Id: null } : { user2Id: null })
            .where(eq(couples.id, couple.id))
            .run();
          remainingPartnerId = otherId;
        }
      }
    }

    db.delete(users).where(eq(users.id, userId)).run();
    return { remainingPartnerId };
  },
  async incrementOneTimeCredits(userId: string, delta: number): Promise<void> {
    db.update(users).set({ oneTimeCredits: sql`${users.oneTimeCredits} + ${delta}` }).where(eq(users.id, userId)).run();
  },
  async spendOneTimeCredit(userId: string): Promise<boolean> {
    const result = db
      .update(users)
      .set({ oneTimeCredits: sql`${users.oneTimeCredits} - 1` })
      .where(and(eq(users.id, userId), sql`${users.oneTimeCredits} > 0`))
      .run();
    return result.changes > 0;
  },

  // ----- Couples -----
  async getCoupleById(id: string): Promise<Couple | undefined> {
    return db.select().from(couples).where(eq(couples.id, id)).get();
  },
  async getCoupleByInviteCode(code: string): Promise<Couple | undefined> {
    return db.select().from(couples).where(eq(couples.inviteCode, code.toUpperCase())).get();
  },
  async createCouple(user1Id: string): Promise<Couple> {
    let inviteCode = genInviteCode();
    while (await this.getCoupleByInviteCode(inviteCode)) {
      inviteCode = genInviteCode();
    }
    const couple: Couple = {
      id: nanoid(),
      inviteCode,
      user1Id,
      user2Id: null,
      credits: 0,
      createdAt: Date.now(),
    };
    db.insert(couples).values(couple).run();
    db.update(users).set({ coupleId: couple.id }).where(eq(users.id, user1Id)).run();
    return couple;
  },
  async joinCouple(coupleId: string, user2Id: string): Promise<void> {
    db.update(couples).set({ user2Id }).where(eq(couples.id, coupleId)).run();
    db.update(users).set({ coupleId }).where(eq(users.id, user2Id)).run();
  },
  async getPartner(user: User): Promise<User | undefined> {
    if (!user.coupleId) return undefined;
    const couple = await this.getCoupleById(user.coupleId);
    if (!couple) return undefined;
    const partnerId = couple.user1Id === user.id ? couple.user2Id : couple.user1Id;
    if (!partnerId) return undefined;
    return this.getUserById(partnerId);
  },
  async incrementCoupleCredits(coupleId: string, delta: number): Promise<void> {
    db.update(couples).set({ credits: sql`${couples.credits} + ${delta}` }).where(eq(couples.id, coupleId)).run();
  },
  // Atomically spends one credit; false if the couple had none (guards against a
  // concurrent double-spend the same way payment fulfillment is guarded above).
  async spendCoupleCredit(coupleId: string): Promise<boolean> {
    const result = db
      .update(couples)
      .set({ credits: sql`${couples.credits} - 1` })
      .where(and(eq(couples.id, coupleId), sql`${couples.credits} > 0`))
      .run();
    return result.changes > 0;
  },

  // ----- Invitations -----
  async createInvitation(data: {
    coupleId: string;
    senderId: string;
    recipientId: string;
    title: string;
    date: string;
    time: string;
    location?: string;
    note?: string;
    emoji: string;
    paidWithCredit?: boolean;
  }): Promise<Invitation> {
    const invite: Invitation = {
      id: nanoid(),
      coupleId: data.coupleId,
      senderId: data.senderId,
      recipientId: data.recipientId,
      title: data.title,
      date: data.date,
      time: data.time,
      location: data.location || null,
      note: data.note || null,
      emoji: data.emoji,
      status: "pending",
      awaitingResponseFrom: data.recipientId,
      proposedDate: null,
      proposedTime: null,
      proposedNote: null,
      proposedBy: null,
      paidWithCredit: data.paidWithCredit ? 1 : 0,
      creditAwarded: 0,
      createdAt: Date.now(),
      respondedAt: null,
    };
    db.insert(invitations).values(invite).run();
    return invite;
  },
  async getInvitationById(id: string): Promise<Invitation | undefined> {
    return db.select().from(invitations).where(eq(invitations.id, id)).get();
  },
  async getInvitationsForCouple(coupleId: string): Promise<Invitation[]> {
    return db.select().from(invitations).where(eq(invitations.coupleId, coupleId)).orderBy(desc(invitations.createdAt)).all();
  },
  async updateInvitation(id: string, patch: Partial<Invitation>): Promise<void> {
    db.update(invitations).set(patch).where(eq(invitations.id, id)).run();
  },
  async getUnawardedAcceptedInvitations(coupleId: string): Promise<Invitation[]> {
    return db
      .select()
      .from(invitations)
      .where(and(eq(invitations.coupleId, coupleId), eq(invitations.status, "accepted"), eq(invitations.creditAwarded, 0)))
      .all();
  },
  // Atomically marks a "date happened" credit as paid out for this invitation; false if
  // another concurrent reconcile pass already claimed it.
  async claimCreditAward(invitationId: string): Promise<boolean> {
    const result = db
      .update(invitations)
      .set({ creditAwarded: 1 })
      .where(and(eq(invitations.id, invitationId), eq(invitations.creditAwarded, 0)))
      .run();
    return result.changes > 0;
  },

  // ----- Memories -----
  async getMemoryByInvitationId(invitationId: string): Promise<Memory | undefined> {
    return db.select().from(memories).where(eq(memories.invitationId, invitationId)).get();
  },
  async upsertMemory(invitationId: string, data: { note?: string; rating?: number }): Promise<Memory> {
    const existing = await this.getMemoryByInvitationId(invitationId);
    if (existing) {
      const patch = { note: data.note ?? existing.note, rating: data.rating ?? existing.rating };
      db.update(memories).set(patch).where(eq(memories.id, existing.id)).run();
      return { ...existing, ...patch };
    }
    const memory: Memory = {
      id: nanoid(),
      invitationId,
      note: data.note || null,
      rating: data.rating ?? null,
      createdAt: Date.now(),
    };
    db.insert(memories).values(memory).run();
    return memory;
  },
  async getOrCreateMemory(invitationId: string): Promise<Memory> {
    const existing = await this.getMemoryByInvitationId(invitationId);
    if (existing) return existing;
    return this.upsertMemory(invitationId, {});
  },

  // ----- Memory photos -----
  async addMemoryPhoto(data: { memoryId: string; filename: string; originalName?: string }): Promise<MemoryPhoto> {
    const photo: MemoryPhoto = {
      id: nanoid(),
      memoryId: data.memoryId,
      filename: data.filename,
      originalName: data.originalName ?? null,
      createdAt: Date.now(),
    };
    db.insert(memoryPhotos).values(photo).run();
    return photo;
  },
  async getMemoryPhotos(memoryId: string): Promise<MemoryPhoto[]> {
    return db.select().from(memoryPhotos).where(eq(memoryPhotos.memoryId, memoryId)).orderBy(desc(memoryPhotos.createdAt)).all();
  },
  async getMemoryPhotoById(id: string): Promise<MemoryPhoto | undefined> {
    return db.select().from(memoryPhotos).where(eq(memoryPhotos.id, id)).get();
  },
  async deleteMemoryPhoto(id: string): Promise<void> {
    db.delete(memoryPhotos).where(eq(memoryPhotos.id, id)).run();
  },
  async countMemoryPhotos(memoryId: string): Promise<number> {
    const rows = await this.getMemoryPhotos(memoryId);
    return rows.length;
  },

  // ----- Notifications -----
  async createNotification(data: { userId: string; type: string; message: string; invitationId?: string }): Promise<Notification> {
    const notif: Notification = {
      id: nanoid(),
      userId: data.userId,
      type: data.type,
      message: data.message,
      invitationId: data.invitationId ?? null,
      isRead: 0,
      createdAt: Date.now(),
    };
    db.insert(notifications).values(notif).run();
    return notif;
  },
  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50).all();
  },
  async markNotificationRead(id: string, userId: string): Promise<void> {
    db.update(notifications).set({ isRead: 1 }).where(and(eq(notifications.id, id), eq(notifications.userId, userId))).run();
  },
  async markAllNotificationsRead(userId: string): Promise<void> {
    db.update(notifications).set({ isRead: 1 }).where(eq(notifications.userId, userId)).run();
  },

  // ----- Payments -----
  async createPayment(data: {
    coupleId: string;
    senderId: string;
    recipientId: string;
    pendingData: string;
    amount: number;
    currency: string;
  }): Promise<Payment> {
    const payment: Payment = {
      id: nanoid(),
      stripeSessionId: null,
      coupleId: data.coupleId,
      senderId: data.senderId,
      recipientId: data.recipientId,
      pendingData: data.pendingData,
      amount: data.amount,
      currency: data.currency,
      status: "pending",
      invitationId: null,
      createdAt: Date.now(),
      fulfilledAt: null,
    };
    db.insert(payments).values(payment).run();
    return payment;
  },
  async getPaymentById(id: string): Promise<Payment | undefined> {
    return db.select().from(payments).where(eq(payments.id, id)).get();
  },
  async getPaymentByStripeSessionId(sessionId: string): Promise<Payment | undefined> {
    return db.select().from(payments).where(eq(payments.stripeSessionId, sessionId)).get();
  },
  async updatePayment(id: string, patch: Partial<Payment>): Promise<void> {
    db.update(payments).set(patch).where(eq(payments.id, id)).run();
  },
  // Atomically transitions a payment from pending -> paid. Returns true only for the
  // caller that wins the race, so concurrent webhook + success-page calls can't both fulfill.
  async claimPaymentForFulfillment(id: string): Promise<boolean> {
    const result = db
      .update(payments)
      .set({ status: "paid", fulfilledAt: Date.now() })
      .where(and(eq(payments.id, id), eq(payments.status, "pending")))
      .run();
    return result.changes > 0;
  },

  // ----- Support requests -----
  async createSupportRequest(data: { userId?: string; name: string; email: string; message: string }): Promise<SupportRequest> {
    const request: SupportRequest = {
      id: nanoid(),
      userId: data.userId ?? null,
      name: data.name,
      email: data.email,
      message: data.message,
      status: "open",
      createdAt: Date.now(),
    };
    db.insert(supportRequests).values(request).run();
    return request;
  },

  // ----- Account deletions -----
  async createAccountDeletion(data: { name: string; email: string; reason?: string }): Promise<AccountDeletion> {
    const record: AccountDeletion = {
      id: nanoid(),
      name: data.name,
      email: data.email,
      reason: data.reason || null,
      createdAt: Date.now(),
    };
    db.insert(accountDeletions).values(record).run();
    return record;
  },

  // ----- One-time invitations -----
  async createOneTimeInvitation(data: {
    senderId: string;
    recipientEmail: string;
    recipientName?: string;
    title: string;
    date: string;
    time: string;
    location?: string;
    note?: string;
    emoji: string;
    paidWithCredit?: boolean;
    responseToken: string;
    expiresAt: number;
  }): Promise<OneTimeInvitation> {
    const invite: OneTimeInvitation = {
      id: nanoid(),
      senderId: data.senderId,
      recipientEmail: data.recipientEmail.toLowerCase(),
      recipientName: data.recipientName || null,
      title: data.title,
      date: data.date,
      time: data.time,
      location: data.location || null,
      note: data.note || null,
      emoji: data.emoji,
      status: "pending",
      responseToken: data.responseToken,
      paidWithCredit: data.paidWithCredit ? 1 : 0,
      creditAwarded: 0,
      createdAt: Date.now(),
      respondedAt: null,
      expiresAt: data.expiresAt,
    };
    db.insert(oneTimeInvitations).values(invite).run();
    return invite;
  },
  async getOneTimeInvitationById(id: string): Promise<OneTimeInvitation | undefined> {
    return db.select().from(oneTimeInvitations).where(eq(oneTimeInvitations.id, id)).get();
  },
  async getOneTimeInvitationByToken(token: string): Promise<OneTimeInvitation | undefined> {
    return db.select().from(oneTimeInvitations).where(eq(oneTimeInvitations.responseToken, token)).get();
  },
  async getOneTimeInvitationsForSender(senderId: string): Promise<OneTimeInvitation[]> {
    return db.select().from(oneTimeInvitations).where(eq(oneTimeInvitations.senderId, senderId)).orderBy(desc(oneTimeInvitations.createdAt)).all();
  },
  async updateOneTimeInvitation(id: string, patch: Partial<OneTimeInvitation>): Promise<void> {
    db.update(oneTimeInvitations).set(patch).where(eq(oneTimeInvitations.id, id)).run();
  },
  // Atomically moves a one-time invite off "pending" so a double-submit can't respond twice.
  async claimOneTimeInvitationResponse(id: string): Promise<boolean> {
    const result = db
      .update(oneTimeInvitations)
      .set({ respondedAt: Date.now() })
      .where(and(eq(oneTimeInvitations.id, id), eq(oneTimeInvitations.status, "pending")))
      .run();
    return result.changes > 0;
  },
  async getUnawardedAcceptedOneTimeInvitations(senderId: string): Promise<OneTimeInvitation[]> {
    return db
      .select()
      .from(oneTimeInvitations)
      .where(and(eq(oneTimeInvitations.senderId, senderId), eq(oneTimeInvitations.status, "accepted"), eq(oneTimeInvitations.creditAwarded, 0)))
      .all();
  },
  async claimOneTimeInvitationCreditAward(id: string): Promise<boolean> {
    const result = db
      .update(oneTimeInvitations)
      .set({ creditAwarded: 1 })
      .where(and(eq(oneTimeInvitations.id, id), eq(oneTimeInvitations.creditAwarded, 0)))
      .run();
    return result.changes > 0;
  },

  // ----- One-time payments -----
  async createOneTimePayment(data: { senderId: string; pendingData: string; amount: number; currency: string }): Promise<OneTimePayment> {
    const payment: OneTimePayment = {
      id: nanoid(),
      stripeSessionId: null,
      senderId: data.senderId,
      pendingData: data.pendingData,
      amount: data.amount,
      currency: data.currency,
      status: "pending",
      oneTimeInvitationId: null,
      createdAt: Date.now(),
      fulfilledAt: null,
    };
    db.insert(oneTimePayments).values(payment).run();
    return payment;
  },
  async getOneTimePaymentById(id: string): Promise<OneTimePayment | undefined> {
    return db.select().from(oneTimePayments).where(eq(oneTimePayments.id, id)).get();
  },
  async getOneTimePaymentByStripeSessionId(sessionId: string): Promise<OneTimePayment | undefined> {
    return db.select().from(oneTimePayments).where(eq(oneTimePayments.stripeSessionId, sessionId)).get();
  },
  async updateOneTimePayment(id: string, patch: Partial<OneTimePayment>): Promise<void> {
    db.update(oneTimePayments).set(patch).where(eq(oneTimePayments.id, id)).run();
  },
  async claimOneTimePaymentForFulfillment(id: string): Promise<boolean> {
    const result = db
      .update(oneTimePayments)
      .set({ status: "paid", fulfilledAt: Date.now() })
      .where(and(eq(oneTimePayments.id, id), eq(oneTimePayments.status, "pending")))
      .run();
    return result.changes > 0;
  },
};
