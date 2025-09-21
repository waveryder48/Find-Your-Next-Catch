// scripts/admin-purge-trips.ts
import "dotenv/config";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Usage:
// pnpm tsx scripts/admin-purge-trips.ts -- --landing seaforth --source FR
// (source: FR | HM | OTHER; landing: partial slug match ok)

function arg(flag: string): string | null {
    const i = process.argv.indexOf(flag);
    return i >= 0 && process.argv[i + 1] ? String(process.argv[i + 1]) : null;
}

async function main() {
    const landingPart = arg("--landing");
    const source = (arg("--source") || "FR").toUpperCase();

    if (!landingPart) throw new Error(`Provide --landing <slug-fragment>, e.g. --landing seaforth`);

    const landings: any = await db.execute(sql`
    SELECT id, name, slug FROM landings
    WHERE slug ILIKE ${"%" + landingPart + "%"}
  `);
    if (!landings.rows.length) {
        console.log("No landing matched", landingPart);
        return;
    }

    for (const L of landings.rows) {
        const res: any = await db.execute(sql`
      WITH del AS (
        DELETE FROM trips t
        WHERE t.landing_id = ${L.id} AND t.source = ${source}
        RETURNING t.id
      ), ft AS (
        DELETE FROM fare_tiers f USING del
        WHERE f.trip_id = del.id
      ), tp AS (
        DELETE FROM trip_promotions p USING del
        WHERE p.trip_id = del.id
      )
      SELECT count(*) AS deleted FROM del
    `);
        console.log(`Purged ${res.rows?.[0]?.deleted || 0} trips for ${L.slug} (source=${source})`);
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
