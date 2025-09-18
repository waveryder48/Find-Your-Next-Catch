import "dotenv/config";
import { db } from "./index";
import { sql, ilike } from "drizzle-orm";
import { landings } from "./schema";
import { scrapeTargets } from "./schema.scrape";
import crypto from "node:crypto";

async function ensureTable() {
  await db.execute(sql`
    create table if not exists scrape_targets (
      id varchar(64) primary key,
      landing_id varchar(64) not null,
      vessel_id varchar(64),
      url text not null,
      domain varchar(128) not null,
      parser varchar(64) not null,
      active boolean not null default true,
      last_run_at timestamp,
      last_success_at timestamp,
      last_status text
    );
  `);
}

async function getLandingId(nameLike: string, siteLabel: string) {
  const [l] = await db.select().from(landings).where(ilike(landings.name, nameLike)).limit(1);
  if (l) return l.id;
  const id = `landing_${crypto.randomUUID().slice(0,8)}`;
  await db.insert(landings).values({ id, name: siteLabel, website: `https://${siteLabel}/` }).onConflictDoNothing();
  return id;
}

async function seedTargets() {
  const fid = await getLandingId("%Fisherman%", "fishermanslanding.com");
  const hid = await getLandingId("%H&M%", "hmlanding.com");

  const rows = [
    { id: "target_fl_schedule", landingId: fid, url: "https://www.fishermanslanding.com/schedule/", domain: "fishermanslanding.com", parser: "fishermans_schedule" },
    { id: "target_hm_trips_overnight", landingId: hid, url: "https://www.hmlanding.com/trip/overnight-fishing", domain: "hmlanding.com", parser: "hmlanding_trips" },
    { id: "target_hm_trips_multi", landingId: hid, url: "https://www.hmlanding.com/trip/multi-day-fishing", domain: "hmlanding.com", parser: "hmlanding_trips" },
    { id: "target_hm_trips_full", landingId: hid, url: "https://www.hmlanding.com/trip/full-day-fishing", domain: "hmlanding.com", parser: "hmlanding_trips" },
  ];

  for (const r of rows) {
    await db.insert(scrapeTargets).values(r).onConflictDoNothing();
  }
}

async function main() {
  await ensureTable();
  await seedTargets();
  console.log("scrape_targets table ready & seeded.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
