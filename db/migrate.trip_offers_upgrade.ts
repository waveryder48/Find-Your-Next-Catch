import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function addCol(table: string, col: string, ddl: string) {
  await db.execute(sql`
    do $$
    begin
      if not exists (
        select 1 from information_schema.columns
        where table_name = ${table} and column_name = ${col}
      ) then
        execute ${ddl};
      end if;
    end $$;
  `);
}

async function main() {
  await addCol("trip_offers","return_date",       "alter table trip_offers add column return_date timestamp");
  await addCol("trip_offers","trip_length_label", "alter table trip_offers add column trip_length_label varchar(32)");
  await addCol("trip_offers","load_type",         "alter table trip_offers add column load_type varchar(32)");
  await addCol("trip_offers","summary",           "alter table trip_offers add column summary text");
  await addCol("trip_offers","open_spots",        "alter table trip_offers add column open_spots integer");
  await addCol("trip_offers","capacity",          "alter table trip_offers add column capacity integer");
  await addCol("trip_offers","includes_meals",    "alter table trip_offers add column includes_meals boolean");
  await addCol("trip_offers","includes_permits",  "alter table trip_offers add column includes_permits boolean");
  -- ensure unique index for upsert
  await db.execute(sql`
    do $$
    begin
      if not exists (select 1 from pg_indexes where indexname = 'ux_trip_offers_vessel_title_date_price') then
        create unique index ux_trip_offers_vessel_title_date_price
        on trip_offers (vessel_id, title, departure_date, price_cents);
      end if;
    end $$;
  `);
  console.log("trip_offers upgraded.");
}
main().catch(e => { console.error(e); process.exit(1); });
