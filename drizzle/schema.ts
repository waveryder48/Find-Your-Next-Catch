import { pgTable, text, varchar, timestamp, integer, boolean, index, uniqueIndex, primaryKey, pgEnum, numeric } from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";

export const tripSource = pgEnum("trip_source", ["FR", "HM", "OTHER"]);
export const fareTierType = pgEnum("fare_tier_type", ["ADULT", "JUNIOR", "SENIOR", "MILITARY", "STUDENT", "OTHER"]);

export const landings = pgTable("landings", {
    id: text("id").primaryKey(),             // use crypto.randomUUID()
    name: varchar("name", { length: 256 }).notNull(),
    slug: varchar("slug", { length: 256 }).notNull().unique(),
    website: varchar("website", { length: 512 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
}, (t) => ({
    nameIdx: index("landings_name_idx").on(t.name),
}));

export const vessels = pgTable("vessels", {
    id: text("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    slug: varchar("slug", { length: 256 }).notNull().unique(),
    primaryWebsite: varchar("primary_website", { length: 512 }),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
}, (t) => ({
    nameIdx: index("vessels_name_idx").on(t.name),
}));

export const vesselLandings = pgTable("vessel_landings", {
    vesselId: text("vessel_id").notNull().references(() => vessels.id, { onDelete: "cascade" }),
    landingId: text("landing_id").notNull().references(() => landings.id, { onDelete: "cascade" }),
    vesselPageUrl: varchar("vessel_page_url", { length: 1024 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.vesselId, t.landingId], name: "vessel_landings_pk" }),
    landingIdx: index("vessel_landings_landing_idx").on(t.landingId),
    urlIdx: index("vessel_landings_url_idx").on(t.vesselPageUrl),
}));

export const trips = pgTable("trips", {
    id: text("id").primaryKey(),
    source: tripSource("source").notNull(),
    sourceTripId: text("source_trip_id").notNull(),
    sourceUrl: varchar("source_url", { length: 1024 }).notNull(),
    landingId: text("landing_id").notNull().references(() => landings.id, { onDelete: "cascade" }),
    vesselId: text("vessel_id").references(() => vessels.id, { onDelete: "set null" }),

    title: varchar("title", { length: 256 }).notNull(),
    notes: text("notes"),
    passportReq: boolean("passport_req").notNull().default(false),
    mealsIncl: boolean("meals_incl").notNull().default(false),
    permitsIncl: boolean("permits_incl").notNull().default(false),

    departLocal: timestamp("depart_local", { withTimezone: false }).notNull(),
    returnLocal: timestamp("return_local", { withTimezone: false }),

    timezone: varchar("timezone", { length: 64 }).notNull().default("America/Los_Angeles"),

    load: integer("load"),
    spots: integer("spots"),
    status: varchar("status", { length: 32 }).notNull(),

    priceIncludesFees: boolean("price_includes_fees").notNull().default(false),
    serviceFeePct: numeric("service_fee_pct", { precision: 4, scale: 1 }),

    lastScrapedAt: timestamp("last_scraped_at", { withTimezone: false }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
}, (t) => ({
    // ✅ use t.*, not trips.*
    uniq: uniqueIndex("trips_source_tripid_idx").on(t.source, t.sourceTripId),
    depIdx: index("trips_depart_idx").on(t.landingId, t.departLocal),
    vesselIdx: index("trips_vessel_idx").on(t.vesselId),
}));

export const fareTiers = pgTable("fare_tiers", {
    id: text("id").primaryKey(),
    tripId: text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    type: fareTierType("type").notNull(),
    label: varchar("label", { length: 80 }).notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    conditions: varchar("conditions", { length: 256 }),
}, (t) => ({
    tripIdx: index("fare_tiers_trip_idx").on(t.tripId),
}));

export const tripPromotions = pgTable("trip_promotions", {
    id: text("id").primaryKey(),
    tripId: text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 80 }).notNull(),
    summary: varchar("summary", { length: 256 }).notNull(),
    details: text("details"),
    appliesWhen: varchar("applies_when", { length: 80 }),
}, (t) => ({
    tripIdx: index("trip_promotions_trip_idx").on(t.tripId),
}));

export const landingRelations = relations(landings, ({ many }) => ({
    vesselLinks: many(vesselLandings),
    trips: many(trips),
}));

export const vesselRelations = relations(vessels, ({ many }) => ({
    landingLinks: many(vesselLandings),
    trips: many(trips),
}));

export const tripRelations = relations(trips, ({ many }) => ({
    fareTiers: many(fareTiers),
    promotions: many(tripPromotions),
}));
