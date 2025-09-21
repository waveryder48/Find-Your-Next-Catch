import { randomUUID, createHash } from "crypto";
import { db } from "./db";
import { sql } from "drizzle-orm";
import type { ExtractedTrip } from "./scrape-types";

export function platformToTripSource(platform: string): "FR" | "HM" | "OTHER" {
    const p = platform.toUpperCase();
    if (p === "FRN" || p === "FR") return "FR";
    if (p === "FAREHARBOR" || p === "FH" || p === "FARE HARBOR") return "HM";
    return "OTHER"; // XOLA, VIRTUAL, UNKNOWN → OTHER
}

export function synthesizeSourceTripId(t: Pick<ExtractedTrip, "sourceUrl" | "title" | "departLocal">) {
    const key = `${t.sourceUrl}|${t.title}|${t.departLocal.toISOString()}`;
    return createHash("sha1").update(key).digest("hex").slice(0, 20);
}

export async function upsertTripAndTiers(opts: {
    landingId: string;
    vesselId: string | null;
    platform: string;
    trip: ExtractedTrip;
}) {
    const { landingId, vesselId, platform, trip } = opts;
    const id = randomUUID();
    const source = platformToTripSource(platform);
    const sourceTripId = trip.sourceItemId ?? synthesizeSourceTripId(trip);

    const res: any = await db.execute(sql`
    INSERT INTO "trips" (
      "id","source","source_trip_id","source_url",
      "landing_id","vessel_id",
      "title","notes",
      "passport_req","meals_incl","permits_incl",
      "depart_local","return_local","timezone",
      "load","spots","status",
      "price_includes_fees","service_fee_pct",
      "created_at","updated_at"
    ) VALUES (
      ${id}, ${source}, ${sourceTripId}, ${trip.sourceUrl},
      ${landingId}, ${vesselId},
      ${trip.title}, ${trip.notes ?? null},
      ${false}, ${trip.flags?.includes("Meals included") ?? false}, ${trip.flags?.includes("Permits included") ?? false},
      ${trip.departLocal}, ${trip.returnLocal ?? null}, ${trip.timezone ?? "America/Los_Angeles"},
      ${trip.load ?? null}, ${trip.spots ?? null}, ${trip.status ?? "OPEN"},
      ${trip.priceIncludesFees ?? false}, ${trip.serviceFeePct ?? null},
      NOW(), NOW()
    )
    ON CONFLICT ("source","source_trip_id") DO UPDATE SET
      "source_url" = EXCLUDED."source_url",
      "landing_id" = EXCLUDED."landing_id",
      "vessel_id" = EXCLUDED."vessel_id",
      "title" = EXCLUDED."title",
      "notes" = EXCLUDED."notes",
      "depart_local" = EXCLUDED."depart_local",
      "return_local" = EXCLUDED."return_local",
      "timezone" = EXCLUDED."timezone",
      "load" = EXCLUDED."load",
      "spots" = EXCLUDED."spots",
      "status" = EXCLUDED."status",
      "price_includes_fees" = EXCLUDED."price_includes_fees",
      "service_fee_pct" = EXCLUDED."service_fee_pct",
      "updated_at" = NOW()
    RETURNING "id"
  `);

    const tripId: string = res?.rows?.[0]?.id ?? id;

    await db.execute(sql`DELETE FROM "fare_tiers" WHERE "trip_id" = ${tripId}`);

    if (trip.priceTiers?.length) {
        const vals = trip.priceTiers.map(t => ({
            id: randomUUID(),
            trip_id: tripId,
            type: t.type,
            label: t.label,
            price_cents: t.priceCents,
            currency: t.currency ?? "USD",
        }));
        await db.execute(sql`
      INSERT INTO "fare_tiers" ("id","trip_id","type","label","price_cents","currency")
      VALUES ${sql.join(vals.map(v => sql`(${v.id},${v.trip_id},${v.type},${v.label},${v.price_cents},${v.currency})`), sql`, `)}
    `);
    }

    if (trip.promoSummary && trip.promoSummary.trim()) {
        await db.execute(sql`
      INSERT INTO "trip_promotions" ("id","trip_id","slug","summary","details","applies_when")
      VALUES (${randomUUID()}, ${tripId}, ${trip.promoSummary.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80)}, ${trip.promoSummary}, NULL, NULL)
      ON CONFLICT DO NOTHING
    `);
    }

    return tripId;
}
