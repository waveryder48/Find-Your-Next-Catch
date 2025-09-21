import path from "node:path";
import urlMod from "node:url";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

import xlsx from "xlsx";
import { randomUUID } from "crypto";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";
import { landings, vessels, vesselLandings } from "../schema";

const FILE = process.env.SCHEDULE_XLSX_PATH || "./schedule_pages.xlsx";

const slugify = (s: string) =>
  (s ?? "").toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 256);

function pick<T=any>(r: any, names: string[], def: T|null=null): T|null {
  for (const n of names) {
    const v = r[n] ?? r[n.toLowerCase()] ?? r[n.replace(/\s+/g,"_")];
    if (v !== undefined && v !== "") return v as T;
  }
  return def;
}

function originFromUrl(u?: string|null) {
  try { if (!u) return null; const o = new urlMod.URL(u); return `${o.protocol}//${o.host}`; } catch { return null; }
}

async function ensureLanding({ name, slug, website }: { name: string; slug?: string|null; website?: string|null; }) {
  const s = slugify(slug || name);
  const site = website || originFromUrl(website || "") || "https://example-landing.test";
  const res: any = await db.execute(sql`
    INSERT INTO "landings" ("id","name","slug","website","created_at","updated_at")
    VALUES (${randomUUID()}, ${name}, ${s}, ${site}, NOW(), NOW())
    ON CONFLICT ("slug") DO UPDATE SET "updated_at" = NOW()
    RETURNING "id","slug"
  `);
  return res.rows[0];
}

async function ensureVessel({ name, slug, website, landingId }:{
  name: string; slug?: string|null; website?: string|null; landingId: string;
}) {
  const s = slugify(slug || name);
  const site = website || originFromUrl(website || "") || "https://example-operator.test";
  const res: any = await db.execute(sql`
    INSERT INTO "vessels" ("id","name","slug","website","landing_id","created_at","updated_at")
    VALUES (${randomUUID()}, ${name}, ${s}, ${site}, ${landingId}, NOW(), NOW())
    ON CONFLICT ("slug") DO UPDATE SET
      "landing_id" = EXCLUDED."landing_id",
      "website" = COALESCE(EXCLUDED."website","vessels"."website"),
      "updated_at" = NOW()
    RETURNING "id","slug"
  `);
  return res.rows[0];
}

async function linkVesselLanding(vesselId: string, landingId: string, vesselPageUrl: string) {
  await db.execute(sql`
    INSERT INTO "vessel_landings" ("vessel_id","landing_id","vessel_page_url","created_at","updated_at")
    VALUES (${vesselId}, ${landingId}, ${vesselPageUrl}, NOW(), NOW())
    ON CONFLICT ("vessel_id","landing_id") DO UPDATE SET
      "vessel_page_url" = EXCLUDED."vessel_page_url",
      "updated_at" = NOW()
  `);
}

async function main() {
  const abs = path.resolve(process.cwd(), FILE);
  console.log("[seed-links] reading", abs);

  const wb = xlsx.readFile(abs);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

  let created = 0, linked = 0;
  for (const r of rows) {
    const landingName = pick<string>(r, ["landing_name","landing"]);
    const landingSlug = pick<string>(r, ["landing_slug","landing-slug"]);
    const landingSite = pick<string>(r, ["landing_website","landing_url","landing site"]);

    const vesselName = pick<string>(r, ["vessel_name","boat_name","vessel","operator"]);
    const vesselSlug = pick<string>(r, ["vessel_slug","boat_slug"]);
    const vesselSite = pick<string>(r, ["vessel_website","operator_website","website"]);

    const vesselPageUrl = pick<string>(r, ["vessel_page_url","booking_url","source_url","url"]);
    if (!vesselPageUrl) continue;

    const lName = (landingName || "Unknown Landing").toString();
    const landing = await ensureLanding({
      name: lName,
      slug: landingSlug || lName,
      website: landingSite || originFromUrl(vesselPageUrl) || undefined
    });

    const vName = (vesselName || "Unknown Vessel").toString();
    const vessel = await ensureVessel({
      name: vName,
      slug: vesselSlug || vName,
      website: vesselSite || originFromUrl(vesselPageUrl) || undefined,
      landingId: landing.id
    });

    await linkVesselLanding(vessel.id, landing.id, vesselPageUrl);
    created++; linked++;
  }

  console.log("[seed-links] done", { created, linked });
}

main().catch(e => { console.error(e); process.exit(1); });
