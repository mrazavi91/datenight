import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  authProvider: text("auth_provider").notNull().default("email"), // 'email' | 'google' | 'both'
  avatarUrl: text("avatar_url"),
  coupleId: text("couple_id"),
  createdAt: integer("created_at").notNull(),
});

export const couples = sqliteTable("couples", {
  id: text("id").primaryKey(),
  inviteCode: text("invite_code").notNull().unique(),
  user1Id: text("user1_id").notNull(),
  user2Id: text("user2_id"),
  credits: integer("credits").notNull().default(0), // shared date-token balance
  createdAt: integer("created_at").notNull(),
});

export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey(),
  coupleId: text("couple_id").notNull(),
  senderId: text("sender_id").notNull(),
  recipientId: text("recipient_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time").notNull(), // HH:MM
  location: text("location"),
  note: text("note"),
  emoji: text("emoji").notNull().default("💕"),
  status: text("status").notNull().default("pending"), // pending | accepted | declined | rescheduled
  awaitingResponseFrom: text("awaiting_response_from").notNull(),
  proposedDate: text("proposed_date"),
  proposedTime: text("proposed_time"),
  proposedNote: text("proposed_note"),
  proposedBy: text("proposed_by"),
  paidWithCredit: integer("paid_with_credit").notNull().default(0),
  creditAwarded: integer("credit_awarded").notNull().default(0), // has a "date happened" token been paid out for this?
  createdAt: integer("created_at").notNull(),
  respondedAt: integer("responded_at"),
});

export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  invitationId: text("invitation_id").notNull().unique(),
  note: text("note"),
  rating: integer("rating"),
  createdAt: integer("created_at").notNull(),
});

export const memoryPhotos = sqliteTable("memory_photos", {
  id: text("id").primaryKey(),
  memoryId: text("memory_id").notNull(),
  filename: text("filename").notNull(), // on-disk name under data/uploads
  originalName: text("original_name"),
  createdAt: integer("created_at").notNull(),
});

export const supportRequests = sqliteTable("support_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // open | resolved
  createdAt: integer("created_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // invite_received | invite_accepted | invite_declined | invite_rescheduled | partner_joined
  message: text("message").notNull(),
  invitationId: text("invitation_id"),
  isRead: integer("is_read").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").unique(),
  coupleId: text("couple_id").notNull(),
  senderId: text("sender_id").notNull(),
  recipientId: text("recipient_id").notNull(),
  pendingData: text("pending_data").notNull(), // JSON-encoded invitation fields, applied on fulfillment
  amount: integer("amount").notNull(), // in minor units (pence)
  currency: text("currency").notNull().default("gbp"),
  status: text("status").notNull().default("pending"), // pending | paid | cancelled
  invitationId: text("invitation_id"),
  createdAt: integer("created_at").notNull(),
  fulfilledAt: integer("fulfilled_at"),
});

// ----- Zod validation schemas -----

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const joinCoupleSchema = z.object({
  inviteCode: z.string().trim().toUpperCase().length(6, "Invite code must be 6 characters"),
});

export const createInvitationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  emoji: z.string().trim().min(1).max(8).default("💕"),
});

export const respondInvitationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("decline") }),
  z.object({
    action: z.literal("propose"),
    proposedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    proposedTime: z.string().regex(/^\d{2}:\d{2}$/),
    proposedNote: z.string().trim().max(1000).optional().or(z.literal("")),
  }),
]);

export const createMemorySchema = z.object({
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5).optional(),
});

export const supportRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  message: z.string().trim().min(1, "Please tell us what's going on").max(4000),
});

export const INVITATION_PRICE_MINOR = 199; // £1.99
export const INVITATION_PRICE_CURRENCY = "gbp";
export const MAX_MEMORY_PHOTOS = 6;
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export type User = typeof users.$inferSelect;
export type Couple = typeof couples.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type MemoryPhoto = typeof memoryPhotos.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type SupportRequest = typeof supportRequests.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export const insertInvitationSchema = createInsertSchema(invitations);

export type PublicUser = Pick<User, "id" | "name" | "email" | "avatarUrl" | "coupleId">;

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, coupleId: user.coupleId };
}
