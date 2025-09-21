import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`
    do $$
    begin
      if not exists (
        select 1 from information_schema.columns
        where table_name = 'vessels' and column_name = 'image_url'
      ) then
        alter table vessels add column image_url text;
      end if;
    end $$;
  `);
  console.log("vessels.image_url ready.");
}
main().catch(e => { console.error(e); process.exit(1); });

