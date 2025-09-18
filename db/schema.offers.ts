import { pgTable, varchar, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const tripOffers = pgTable("trip_offers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  vesselId: varchar("vessel_id", { length: 64 }).notNull(),
  title: text("title").notNull(),
  priceCents: integer("price_cents"),
  currency: varchar("currency", { length: 8 }).default("USD"),
  sourceUrl: text("source_url").notNull(),
  departureDate: timestamp("departure_date", { withTimezone: false }),
  // NEW
  returnsAt: timestamp("returns_at", { withTimezone: false }),
  lengthLabel: varchar("length_label", { length: 32 }),
  loadLabel: varchar("load_label", { length: 32 }),
  summary: text("summary"),
  spotsOpen: integer("spots_open"),
  capacity: integer("capacity"),
  includeMeals: boolean("include_meals"),
  includePermits: boolean("include_permits"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: false }).defaultNow(),
});
