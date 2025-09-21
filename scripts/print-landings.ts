// scripts/print-landings.ts
import "dotenv/config";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function main() {
    const res: any = await db.execute(sql`
    SELECT id, name, slug, website, city, state
    FROM landings
    ORDER BY name
  `);
    console.table(res.rows);
}

main().catch((e) => { console.error(e); process.exit(1); });
