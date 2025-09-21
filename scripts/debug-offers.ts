import "dotenv/config";
import { db } from "../db";
import { tripOffers } from "../db/schema.Trips";
import { sql, desc } from "drizzle-orm";
function domain(u:string){ try{ return new URL(u).hostname.replace(/^www\./,""); } catch { return ""; } }
async function main(){
  const rows = await db.select().from(tripOffers).orderBy(desc(tripOffers.updatedAt??tripOffers.lastSeenAt)).limit(20);
  for(const r of rows){
    console.log(`${r.title} | $${(r.priceCents??0)/100} | dep=${r.departureDate?.toISOString()?.slice(0,10)} | ${domain(r.sourceUrl)}`);
  }
}
main();

