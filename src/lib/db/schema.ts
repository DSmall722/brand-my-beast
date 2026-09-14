import {
  index,
  integer,
  pgTable,
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
  },
  (table) => [
    index("intent_bids_panel_id_idx").on(table.panelId),
    index("intent_bids_status_idx").on(table.status),
    index("intent_bids_trade_label_idx").on(table.tradeLabel),
  ],
);

export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type NewWaitlistSignup = typeof waitlistSignups.$inferInsert;
export type IntentBidRow = typeof intentBids.$inferSelect;
export type NewIntentBidRow = typeof intentBids.$inferInsert;
