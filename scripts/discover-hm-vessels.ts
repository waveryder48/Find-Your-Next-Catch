import "dotenv/config";
import { db } from "../db/index";
import { landings, vessels } from "../db/schema";
import { eq } from "drizzle-orm";
import { chromium } from "playwright";

const PAGES = [
  "https://www.hmlanding.com/trip/overnight-fishing",
  "https://www.hmlanding.com/trip/multi-day-fishing",
  "https://www.hmlanding.com/trip/full-day-fishing",
];

function* extractNames(text: string): Generator<string> {
  // Heuristics seen on trip pages
  for (const m of text.matchAll(/\b(Boat|Vessel)\s*:\s*([A-Z][A-Za-z0-9 '&-]{2,40})\b/g)) yield m[2].trim();
  for (const m of text.matchAll(/\bon the\s+([A-Z][A-Za-z0-9 '&-]{2,40})\b/g)) yield m[1].trim();
  for (const m of text.matchAll(/\b([A-Z][A-Za-z0-9 '&-]{2,40})\s*[-–]\s*(?:\d+(?:\.\d+)?\s*Day|Overnight|Full|Half|3\/4)/g)) yield m[1].trim();
}

async function main() {
  const hm = await db.query.landings.findFirst({ where: eq(landings.name, "H&M Landing") });
  if (!hm) throw new Error("H&M Landing not found");

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const found = new Set<string>();
  for (const url of PAGES) {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    const text = await page.evaluate(() => document.body.innerText);
    for (const n of extractNames(text)) {
      if (n.length >= 3 && n.length <= 32) found.add(n);
    }
  }
  await browser.close();

  const existing = await db.select().from(vessels).where(eq(vessels.landingId, hm.id));
  const have = new Set(existing.map(v => v.name.toLowerCase()));
  let inserted = 0;

  for (const name of found) {
    if (have.has(name.toLowerCase())) continue;
    await db.insert(vessels).values({
      id: `hm_${name.toLowerCase().replace(/[^a-z0-9]+/g,"_")}`,
      name,
      website: `https://www.hmlanding.com/boats/${name.toLowerCase().replace(/[^a-z0-9]+/g,"")}`,
      landingId: hm.id,
      imageUrl: null,
    }).onConflictDoNothing();
    inserted++;
  }

  console.log("Discovered vessels:", [...found].join(", "));
  console.log("Inserted:", inserted);
}
main();
