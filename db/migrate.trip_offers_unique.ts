import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`
    do $$
    begin
      if not exists (
        select 1 from pg_indexes where indexname = 'ux_trip_offers_vessel_title_date_price'
      ) then
        create unique index ux_trip_offers_vessel_title_date_price
          on trip_offers (vessel_id, title, departure_date, price_cents);
      end if;
    end $$;
  `);
  console.log("Unique index created (or already exists).");
}
main().catch(e => { console.error(e); process.exit(1); });

