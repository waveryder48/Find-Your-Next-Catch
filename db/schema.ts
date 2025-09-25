import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const landings = pgTable("landings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  website: text("website").notNull(),
});

export const vessels = pgTable("vessels", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  website: text("website").notNull(),
  landingId: varchar("landing_id", { length: 64 })
    .notNull()
    .references(() => landings.id, { onDelete: "cascade" }),
  imageUrl: text("image_url"), // optional; migration already added this column
});


export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),

  // REQUIRED by DB
  source: text("source").notNull(),
  sourceTripId: text("source_trip_id").notNull(),

  // FKs
  landingId: varchar("landing_id", { length: 64 }).notNull(),
  vesselId: varchar("vessel_id", { length: 64 }),

  // Content
  title: text("title").notNull(),
  sourceUrl: text("source_url").notNull(),

  // Times
  departLocal: timestamp("depart_local", { withTimezone: false }).notNull(),
  returnLocal: timestamp("return_local", { withTimezone: false }),

  // Audit
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});
