import { pgTable, text, varchar } from "drizzle-orm/pg-core";

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

