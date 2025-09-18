import "dotenv/config";
import { db } from "../db";
import { scrapeTargets } from "../db/schema.scrape";
import { sql } from "drizzle-orm";
async function main(){
  const rows = await db.select().from(scrapeTargets).where(sql`${scrapeTargets.active} = true`);
  const byParser = rows.reduce((m:any,r)=> (m[r.parser]=(m[r.parser]||0)+1,m),{});
  const byDomain = rows.reduce((m:any,r)=> (m[r.domain]=(m[r.domain]||0)+1,m),{});
  console.log("Active targets by parser:", byParser);
  console.log("Active targets by domain:", byDomain);
}
main();
