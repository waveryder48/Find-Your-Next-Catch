import "dotenv/config";
import { db } from "../db/index";
import { vessels } from "../db/schema";

async function main() {
  const domain = "hmlanding.com";
  const all = await db.select().from(vessels);
  const targets = all.filter(v => {
    try { return new URL(v.website).hostname.includes(domain); } catch { return false; }
  });
  console.log(`${targets.length} vessels for ${domain}`);
  for (const v of targets) console.log("-", v.name, v.website);
}
main();

