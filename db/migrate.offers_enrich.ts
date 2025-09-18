import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  // new columns on trip_offers
  await db.execute(sql`
    alter table trip_offers
      add column if not exists length_label varchar(32),
      add column if not exists load_label varchar(32),
      add column if not exists summary text,
      add column if not exists returns_at timestamp,
      add column if not exists spots_open integer,
      add column if not exists capacity integer,
      add column if not exists include_meals boolean,
      add column if not exists include_permits boolean;
  `);

  // add image on vessels
  await db.execute(sql`
    alter table vessels
      add column if not exists image_url text;
  `);

  // strong unique index for stable upserts
  await db.execute(sql`
    do $$
    begin
      if not exists (select 1 from pg_indexes where indexname = 'ux_trip_offers_vessel_date_title') then
        create unique index ux_trip_offers_vessel_date_title
          on trip_offers (vessel_id, departure_date, title);
      end if;
    end $$;
  `);

  console.log("Migration complete.");
}
main().catch(e => { console.error(e); process.exit(1); });
