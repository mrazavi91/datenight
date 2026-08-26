import { eq, or, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./db";
import { users, couples, invitations, memories, notifications, type User, type Couple, type Invitation, type Memory, type Notification } from "../shared/schema";

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
  async createUser(data: { name: string; email: string; passwordHash?: string | null; googleId?: string | null; authProvider: string; avatarUrl?: string | null }): Promise<User> {
    const user: User = {
      id: nanoid(),
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash ?? null,
      googleId: data.googleId ?? null,
      authProvider: data.authProvider,
      avatarUrl: data.avatarUrl ?? null,
      coupleId: null,
      createdAt: Date.now(),
    };
    db.insert(users).values(user).run();
    return user;
  },
  async updateUser(id: string, patch: Partial<User>): Promise<void> {
    db.update(users).set(patch).where(eq(users.id, id)).run();
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

  // ----- Invitations -----
  async createInvitation(data: { coupleId: string; senderId: string; recipientId: string; title: string; date: string; time: string; location?: string; note?: string; emoji: string }): Promise<Invitation> {
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
};
