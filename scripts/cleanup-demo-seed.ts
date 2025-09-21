import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function del(label: string, q: any) {
    const res: any = await db.execute(q);
    const count = typeof res.rowCount === "number" ? res.rowCount : (res.rows?.length ?? 0);
    console.log(`- ${label}: ${count}`);
}

async function main() {
    console.log("Cleaning demo seed…");

    // demo promo
    await del("trip_promotions", sql`
    DELETE FROM "trip_promotions"
    WHERE "slug" = 'spring-special' OR "summary" ILIKE '%spring special%'
  `);

    // demo fare tiers (by trips to be removed)
    await del("fare_tiers", sql`
    DELETE FROM "fare_tiers"
    WHERE "trip_id" IN (
      SELECT "id" FROM "trips"
      WHERE "source_trip_id" LIKE 'seed-%'
         OR "title" = 'Half Day (6h) – Reef & Wreck'
         OR "source_url" ILIKE '%example-operator.test%'
    )
  `);

    // demo trips
    await del("trips", sql`
    DELETE FROM "trips"
    WHERE "source_trip_id" LIKE 'seed-%'
       OR "title" = 'Half Day (6h) – Reef & Wreck'
       OR "source_url" ILIKE '%example-operator.test%'
  `);

    // links to demo landing/vessel
    await del("vessel_landings", sql`
    DELETE FROM "vessel_landings"
    WHERE "vessel_id" IN (SELECT "id" FROM "vessels" WHERE "slug" = 'sea-breeze' OR "website" ILIKE '%example-operator.test%')
       OR "landing_id" IN (SELECT "id" FROM "landings" WHERE "slug" = 'key-west-marina' OR "website" ILIKE '%example-landing.test%')
       OR "vessel_page_url" ILIKE '%example-operator.test%'
  `);

    // demo vessel / landing
    await del("vessels", sql`DELETE FROM "vessels" WHERE "slug" = 'sea-breeze' OR "website" ILIKE '%example-operator.test%'`);
    await del("landings", sql`DELETE FROM "landings" WHERE "slug" = 'key-west-marina' OR "website" ILIKE '%example-landing.test%'`);

    console.log("✅ Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
