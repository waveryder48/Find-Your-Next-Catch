import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function main() {
    const res: any = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM landings) AS landings,
      (SELECT COUNT(*) FROM vessels) AS vessels,
      (SELECT COUNT(*) FROM vessel_landings) AS links,
      (SELECT COUNT(*) FROM trips) AS trips
  `);
    console.log(res.rows?.[0] ?? res);

    const rows: any = await db.execute(sql`
    SELECT vl.vessel_page_url, l.slug AS landing, v.slug AS vessel
    FROM vessel_landings vl
    JOIN landings l ON l.id = vl.landing_id
    LEFT JOIN vessels v ON v.id = vl.vessel_id
    ORDER BY vl.updated_at DESC NULLS LAST
    LIMIT 5
  `);
    console.table(rows.rows ?? []);
}
main().catch(e => { console.error(e); process.exit(1); });
