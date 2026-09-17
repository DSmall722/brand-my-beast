import type { AdapterAccountType } from "@auth/core/adapters";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const waitlistSignups = pgTable(
  "waitlist_signups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    source: text("source").notNull().default("p1-waitlist"),
    /** Set when the waitlist email signs in — row is never deleted (slice 5.3). */
    userId: text("user_id"),
    /** Slice 12.14 — double-opt-in token until confirmed. */
    confirmToken: text("confirm_token"),
    /** Slice 12.14 — set when the confirm link is opened. */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    /** Slice 16.0c — whole-truck interest. Not pledged. Default false. */
    wantWholeTruck: boolean("want_whole_truck").notNull().default(false),
  },
  (table) => [
    uniqueIndex("waitlist_signups_confirm_token_uidx")
      .on(table.confirmToken)
      .where(sql`${table.confirmToken} IS NOT NULL`),
  ],
);

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
    /** Slice 12.2 — optimistic lock token; bump on every write. */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    /** http(s) or /api/artwork/{id}. Never a data: URL (slice 8.5). */
    artworkUrl: text("artwork_url"),
    /** Optional proxy ceiling (slice 9.1). Intent only — never a card. */
    proxyMaxUsd: integer("proxy_max_usd"),
    /**
     * Slice 9.4 — floor-save raise-to Y. Stored, not charged.
     * Null = normal standing intent.
     */
    floorSaveUsd: integer("floor_save_usd"),
    /**
     * Slice 12.4 — client idempotency key. Replay returns the same bid.
     */
    idempotencyKey: text("idempotency_key"),
    /**
     * Slice 12.9 — soft-delete when withdrawn. Approved is never hard-deleted.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("intent_bids_panel_id_idx").on(table.panelId),
    index("intent_bids_status_idx").on(table.status),
    index("intent_bids_trade_label_idx").on(table.tradeLabel),
    index("intent_bids_deleted_at_idx").on(table.deletedAt),
    /** Slice 12.3 — at most one approved standing seat per panel. */
    uniqueIndex("intent_bids_one_approved_per_panel_idx")
      .on(table.panelId)
      .where(sql`${table.status} = 'approved'`),
    /** Slice 12.4 — one bid per non-null idempotency key. */
    uniqueIndex("intent_bids_idempotency_key_uidx")
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
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
 * Slice 13.31 — operator-editable waitlist disposable-domain blocklist.
 * Built-in defaults live in code; this table holds operator additions.
 */
export const waitlistDomainBlocklist = pgTable("waitlist_domain_blocklist", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Slice 8.9 — audit log on approve / reject (who, when, note id).
 */
export const operatorAuditLog = pgTable(
  "operator_audit_log",
  {
    id: text("id").primaryKey(),
    bidId: text("bid_id").notNull(),
    decision: text("decision").notNull(),
    actorEmail: text("actor_email").notNull(),
    actorUserId: text("actor_user_id"),
    noteId: text("note_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("operator_audit_log_created_at_idx").on(table.createdAt)],
);

/**
 * Slice 12.8 — brand / trade / amount / art snapshots with timestamps.
 * Intent only — never a charge receipt.
 */
export const intentRevisions = pgTable(
  "intent_revisions",
  {
    id: text("id").primaryKey(),
    bidId: text("bid_id").notNull(),
    brandLabel: text("brand_label").notNull(),
    tradeLabel: text("trade_label").notNull(),
    standingUsd: integer("standing_usd").notNull(),
    artworkUrl: text("artwork_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("intent_revisions_bid_id_idx").on(table.bidId),
    index("intent_revisions_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Slice 12.12 — failed Resend payloads for operator retry.
 * Intent / notify only — never a charge receipt.
 */
export const mailDeadLetters = pgTable(
  "mail_dead_letters",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    fromAddress: text("from_address").notNull(),
    toAddress: text("to_address").notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    error: text("error").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    retriedAt: timestamp("retried_at", { withTimezone: true }),
  },
  (table) => [
    index("mail_dead_letters_status_idx").on(table.status),
    index("mail_dead_letters_created_at_idx").on(table.createdAt),
  ],
);
/**
 * Slice 9.3 — per-panel soft-close extension. Not a campaign CLOSE_AT.
 */
export const panelExtensions = pgTable("panel_extensions", {
  panelId: text("panel_id").primaryKey(),
  extendedUntil: timestamp("extended_until", { withTimezone: true }),
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
export type WaitlistDomainBlocklistRow =
  typeof waitlistDomainBlocklist.$inferSelect;
export type NewWaitlistDomainBlocklistRow =
  typeof waitlistDomainBlocklist.$inferInsert;
export type OperatorAuditLogRow = typeof operatorAuditLog.$inferSelect;
export type NewOperatorAuditLogRow = typeof operatorAuditLog.$inferInsert;
export type IntentRevisionRow = typeof intentRevisions.$inferSelect;
export type NewIntentRevisionRow = typeof intentRevisions.$inferInsert;
export type MailDeadLetterRow = typeof mailDeadLetters.$inferSelect;
export type NewMailDeadLetterRow = typeof mailDeadLetters.$inferInsert;
export type PanelExtensionRow = typeof panelExtensions.$inferSelect;
export type NewPanelExtensionRow = typeof panelExtensions.$inferInsert;
