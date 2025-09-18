import { pgTable, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
export const scrapeTargets = pgTable("scrape_targets", {
  id: varchar("id", { length: 64 }).primaryKey(),
  landingId: varchar("landing_id", { length: 64 }).notNull(),
  vesselId: varchar("vessel_id", { length: 64 }).default(null),
  url: text("url").notNull(),
  domain: varchar("domain", { length: 128 }).notNull(),
  parser: varchar("parser", { length: 64 }).notNull(), // e.g. 'fishermans_schedule', 'hmlanding_trips'
  active: boolean("active").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: false }).default(null),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: false }).default(null),
  lastStatus: text("last_status").default(null),
});
