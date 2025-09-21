import "dotenv/config";
import { db } from "../db/index";
import { landings, vessels } from "../db/schema";
import { eq, ilike } from "drizzle-orm";

async function main() {
  // find H&M Landing
  const [hm] = await db.select().from(landings).where(ilike(landings.name, "%H&M%")).limit(1);
  let landingId = hm?.id;
  if (!landingId) {
    landingId = "landing_hm";
    await db.insert(landings).values({
      id: landingId,
      name: "H&M Landing",
      website: "https://www.hmlanding.com/",
    }).onConflictDoNothing();
  }

  // upsert a schedules vessel
  await db.insert(vessels).values({
    id: "vessel_hm_schedules",
    name: "H&M Schedules",
    website: "https://www.hmlanding.com/schedules",
    landingId,
  }).onConflictDoNothing();

  console.log("Inserted/ensured H&M Landing + schedules vessel.");
}
main();

