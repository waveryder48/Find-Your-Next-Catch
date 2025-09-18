import "dotenv/config";
import { db } from "../db/index";
import { tripOffers } from "../db/schema.offers";
import { sql, lt, or } from "drizzle-orm";

async function main() {
  const now = new Date();
  // delete where returns_at < now OR (returns_at is null AND departure_date < now)
  const res = await db.execute(sql`
    delete from trip_offers
    where (returns_at is not null and returns_at < now())
       or (returns_at is null and departure_date is not null and departure_date < now());
  `);
  console.log("Pruned past trips.");
}
main().catch(e => { console.error(e); process.exit(1); });
