import "dotenv/config";
import { db } from "../db/index";
import { landings, vessels } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const hm = await db.query.landings.findFirst({ where: eq(landings.name, "H&M Landing") });
  if (!hm) { console.log("H&M Landing row not found"); return; }
  const vs = await db.select().from(vessels).where(eq(vessels.landingId, hm.id));
  console.log("H&M landing id:", hm.id, "| vessel count:", vs.length);
  for (const v of vs) console.log("-", v.name);
}
main();
