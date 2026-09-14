import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const waitlistSignups = pgTable("waitlist_signups", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  source: text("source").notNull().default("p1-waitlist"),
});

/**
 * Soft-auction intent ledger. No Stripe / capture columns — P2 only.
 * See P2.md and CAMPAIGN.md.
 */
export const intentBids = pgTable("intent_bids", {
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
});

export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type NewWaitlistSignup = typeof waitlistSignups.$inferInsert;
export type IntentBidRow = typeof intentBids.$inferSelect;
export type NewIntentBidRow = typeof intentBids.$inferInsert;
