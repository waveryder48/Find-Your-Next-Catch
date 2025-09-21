// Load .env.local explicitly (before importing db)
// at top of the file:
import { eq, sql } from "drizzle-orm";

import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });
console.log("[ENV]", { hasDB: !!process.env.DATABASE_URL });

import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import {
    landings, vessels, vesselLandings, trips, fareTiers, tripPromotions,
} from "@/schema";
import { eq } from "drizzle-orm";

const now = new Date();
const depart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 30, 0)
);
const ret = new Date(depart.getTime() + 6 * 60 * 60 * 1000); // +6h

async function upsertLanding() {
    const name = "Key West Marina";
    const slug = "key-west-marina";
    const website = "https://example-marina.test";

    const existing = await db
        .select()
        .from(landings)
        .where(eq(landings.slug, slug))
        .limit(1);

    if (existing.length) return existing[0];

    const row = {
        id: randomUUID(),
        name,
        slug,
        website,
    };
    await db.insert(landings).values(row);
    return row;
}

// replace your upsertVessel with this version
async function upsertVessel(landingId: string) {
    const name = "Sea Breeze";
    const slug = "sea-breeze";
    const website = "https://example-operator.test"; // required by your DB
    const primaryWebsite = "https://example-operator.test/sea-breeze";

    const id = randomUUID();

    // Upsert by unique slug; always ensure landing_id + website fields are set
    const res = await db.execute(sql`
    INSERT INTO "vessels"
      ("id","name","slug","website","primary_website","landing_id","created_at","updated_at")
    VALUES
      (${id}, ${name}, ${slug}, ${website}, ${primaryWebsite}, ${landingId}, NOW(), NOW())
    ON CONFLICT ("slug") DO UPDATE
    SET
      "landing_id" = EXCLUDED."landing_id",
      "website" = EXCLUDED."website",
      "primary_website" = EXCLUDED."primary_website",
      "updated_at" = NOW()
    RETURNING "id","name","slug"
  `);

    // @ts-expect-error drizzle execute returns rows
    const row = res?.rows?.[0] ?? { id, name, slug };
    return row as { id: string; name: string; slug: string };
}

async function linkVesselToLanding(vesselId: string, landingId: string) {
    const vesselPageUrl =
        "https://example-operator.test/sea-breeze/trips/half-day";
    try {
        await db.insert(vesselLandings).values({
            vesselId,
            landingId,
            vesselPageUrl,
        });
    } catch {
        // ignore unique violation
    }
}

async function createTrip(landingId: string, vesselId: string) {
    const title = "Half Day (6h) – Reef & Wreck";
    const sourceUrl =
        "https://example-operator.test/sea-breeze/trips/half-day";
    const sourceTripId = "seed-half-day-1";

    const existing = await db
        .select()
        .from(trips)
        .where(eq(trips.sourceTripId, sourceTripId))
        .limit(1);

    if (existing.length) return existing[0];

    const row = {
        id: randomUUID(),
        source: "FR" as const,
        sourceTripId,
        sourceUrl,
        landingId,
        vesselId,
        title,
        notes: "Tackle included. Great for families.",
        passportReq: false,
        mealsIncl: false,
        permitsIncl: true,
        departLocal: depart,
        returnLocal: ret,
        timezone: "America/New_York",
        load: 6,
        spots: 4,
        status: "OPEN",
        priceIncludesFees: true,
        serviceFeePct: 5.0,
    };
    await db.insert(trips).values(row);
    return row;
}

async function seedFares(tripId: string) {
    const base = [
        {
            id: randomUUID(),
            tripId,
            type: "ADULT" as const,
            label: "Adult",
            priceCents: 65000,
            currency: "USD",
        },
        {
            id: randomUUID(),
            tripId,
            type: "JUNIOR" as const,
            label: "Junior (under 12)",
            priceCents: 52000,
            currency: "USD",
        },
    ];
    await db.insert(fareTiers).values(base).onConflictDoNothing();
}

async function seedPromo(tripId: string) {
    await db
        .insert(tripPromotions)
        .values({
            id: randomUUID(),
            tripId,
            slug: "spring-special",
            summary: "Spring special – save 10%",
            details: "Automatic at checkout for trips through June.",
            appliesWhen: "SPRING",
        })
        .onConflictDoNothing();
}

async function main() {
    const landing = await upsertLanding();
    const vessel = await upsertVessel(landing.id); // <— pass landingId here
    await linkVesselToLanding(vessel.id, landing.id);


    const trip = await createTrip(landing.id, vessel.id);
    await seedFares(trip.id);
    await seedPromo(trip.id);

    console.log("Seeded:");
    console.table({
        landing: landing.slug,
        vessel: vessel.slug,
        trip: trip.title,
        depart: depart.toISOString(),
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

