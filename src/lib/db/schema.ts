import type { AdapterAccountType } from "@auth/core/adapters";
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const waitlistSignups = pgTable("waitlist_signups", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  source: text("source").notNull().default("p1-waitlist"),
  /** Set when the waitlist email signs in — row is never deleted (slice 5.3). */
  userId: text("user_id"),
});

/**
 * Soft-auction intent ledger. No Stripe / capture columns — P2 only.
 * See P2.md and CAMPAIGN.md. Indexes match drizzle/0001 + 0002.
 */
export const intentBids = pgTable(
  "intent_bids",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    panelId: text("panel_id").notNull(),
    userId: text("user_id").notNull(),
    brandLabel: text("brand_label").notNull(),
    tradeLabel: text("trade_label").notNull(),
    standingUsd: integer("standing_usd").notNull(),
    depositUsd: integer("deposit_usd").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    /** http(s) or /api/artwork/{id}. Never a data: URL (slice 8.5). */
    artworkUrl: text("artwork_url"),
  },
  (table) => [
    index("intent_bids_panel_id_idx").on(table.panelId),
    index("intent_bids_status_idx").on(table.status),
    index("intent_bids_trade_label_idx").on(table.tradeLabel),
  ],
);

/**
 * Slice 8.5 — binary artwork payloads. Intent ledger stores only the path.
 * body_base64 is the raw payload without a data: prefix.
 */
export const artworkBlobs = pgTable("artwork_blobs", {
  id: text("id").primaryKey(),
  contentType: text("content_type").notNull(),
  bodyBase64: text("body_base64").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Slice 8.8 — operator-managed ban patterns (additive to static banned-trades).
 */
export const operatorBanList = pgTable("operator_ban_list", {
  id: text("id").primaryKey(),
  pattern: text("pattern").notNull().unique(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Auth.js / Drizzle adapter tables (Resend magic link in live mode).
 * JWT sessions stay on; these rows hold users + email verification tokens.
 */
export const authUsers = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const authAccounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const authSessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const authVerificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (token) => [
    primaryKey({ columns: [token.identifier, token.token] }),
  ],
);

export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type NewWaitlistSignup = typeof waitlistSignups.$inferInsert;
export type IntentBidRow = typeof intentBids.$inferSelect;
export type NewIntentBidRow = typeof intentBids.$inferInsert;
export type ArtworkBlobRow = typeof artworkBlobs.$inferSelect;
export type NewArtworkBlobRow = typeof artworkBlobs.$inferInsert;
export type OperatorBanListRow = typeof operatorBanList.$inferSelect;
export type NewOperatorBanListRow = typeof operatorBanList.$inferInsert;
