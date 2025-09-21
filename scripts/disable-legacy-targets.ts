import "dotenv/config";
import { db } from "../db";
import { scrapeTargets } from "../db/schema.scrape";
import { inArray, eq } from "drizzle-orm";

async function main() {
  const off = await db.update(scrapeTargets)
    .set({ active: false })
    .where(inArray(scrapeTargets.parser, ["fishermans_schedule","hmlanding_trips"]));
  console.log("Deactivated legacy targets.");
}
main().catch(e=>{console.error(e);process.exit(1);});

