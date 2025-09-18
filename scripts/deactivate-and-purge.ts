import "dotenv/config";
import { db } from "../db";
import { scrapeTargets } from "../db/schema.scrape";
import { tripOffers } from "../db/schema.offers";
import { sql, inArray } from "drizzle-orm";

async function main() {
  await db.update(scrapeTargets)
    .set({ active: false })
    .where(inArray(scrapeTargets.parser, ["fishermans_schedule","hmlanding_trips"]));
  console.log("Deactivated legacy targets (Fisherman’s/H&M tables).");

  // drop obviously-bad legacy rows
  await db.execute(sql`
    delete from ${tripOffers}
    where ${tripOffers.sourceUrl} ~ 'fishermanslanding\\.com|hmlanding\\.com'
       or coalesce(${tripOffers.priceCents},0) < 5000
  `);
  console.log("Purged legacy/low-price offers.");
}
main().catch(e=>{console.error(e);process.exit(1);});
