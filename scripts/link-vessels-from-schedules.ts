import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

import xlsx from "xlsx";
import { randomUUID } from "crypto";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";

const XLSX_PATH = process.env.SCHEDULE_XLSX_PATH || "./schedule_pages.xlsx";

/* ---------- utils ---------- */
const slugify = (s: string) =>
    (s ?? "").toString().trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 256);

function pick<T = any>(row: any, names: string[], def: T | null = null): T | null {
    for (const n of names) {
        const v = row[n] ?? row[n.toLowerCase()] ?? row[n.replace(/\s+/g, "_")];
        if (v !== undefined && v !== "") return v as T;
    }
    return def;
}

function domainOf(url?: string | null) {
    try { if (!url) return null; return new URL(url).host?.toLowerCase() ?? null; } catch { return null; }
}
function originOf(url?: string | null) {
    try { if (!url) return null; const u = new URL(url); return `${u.protocol}//${u.host}`; } catch { return null; }
}

/* ---------- DB helpers ---------- */
async function ensureLandingBySlugOrName(slug: string, name: string, website?: string | null) {
    const got: any = await db.execute(sql`SELECT id, slug FROM "landings" WHERE slug = ${slug} LIMIT 1`);
    if (got.rows?.length) return got.rows[0];

    const site = website || "https://example-landing.test";
    const ins: any = await db.execute(sql`
    INSERT INTO "landings" ("id","name","slug","website","created_at","updated_at")
    VALUES (${randomUUID()}, ${name}, ${slug}, ${site}, NOW(), NOW())
    ON CONFLICT ("slug") DO UPDATE SET "updated_at" = NOW()
    RETURNING id, slug
  `);
    return ins.rows[0];
}

type VesselIndex = {
    bySlug: Map<string, string>;
    byName: Map<string, string>;
    byDomain: Map<string, string[]>;
};

async function buildVesselIndex(): Promise<VesselIndex> {
    // Try both possible website columns
    const q: any = await db.execute(sql`SELECT id, slug, name,
    CASE WHEN (SELECT 1 FROM information_schema.columns WHERE table_name = 'vessels' AND column_name = 'website') IS NOT NULL
      THEN website ELSE NULL END AS website,
    CASE WHEN (SELECT 1 FROM information_schema.columns WHERE table_name = 'vessels' AND column_name = 'primary_website') IS NOT NULL
      THEN primary_website ELSE NULL END AS primary_website
    FROM vessels
  `);

    const bySlug = new Map<string, string>();
    const byName = new Map<string, string>();
    const byDomain = new Map<string, string[]>();

    for (const r of q.rows ?? []) {
        const id = r.id as string;
        const slug = String(r.slug || "").toLowerCase();
        const name = String(r.name || "").toLowerCase().replace(/\s+/g, " ").trim();
        const w = r.website || r.primary_website || null;
        const dom = domainOf(w);

        if (slug) bySlug.set(slug, id);
        if (name) byName.set(name, id);
        if (dom) {
            const arr = byDomain.get(dom) || [];
            arr.push(id);
            byDomain.set(dom, arr);
        }
    }
    return { bySlug, byName, byDomain };
}

async function upsertVesselLanding(vesselId: string, landingId: string, url: string) {
    await db.execute(sql`
    INSERT INTO "vessel_landings" ("vessel_id","landing_id","vessel_page_url","created_at","updated_at")
    VALUES (${vesselId}, ${landingId}, ${url}, NOW(), NOW())
    ON CONFLICT ("vessel_id","landing_id") DO UPDATE SET
      "vessel_page_url" = EXCLUDED."vessel_page_url",
      "updated_at" = NOW()
  `);
}

/* ---------- main ---------- */
async function main() {
    const abs = path.resolve(process.cwd(), XLSX_PATH);
    console.log("[linker] reading", abs);

    const wb = xlsx.readFile(abs);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
    if (!rows.length) {
        console.log("[linker] 0 rows found in XLSX");
        return;
    }

    const vIdx = await buildVesselIndex();
    console.log("[linker] vessels in DB:", vIdx.bySlug.size);

    let cUrlMissing = 0, cLinked = 0, cSlug = 0, cName = 0, cDomain = 0;
    const misses: Array<{ reason: string; landing: string; vessel: string; url: string }> = [];

    for (const r of rows) {
        const vesselPageUrl = pick<string>(r, ["vessel_page_url", "booking_url", "source_url", "url"]);
        if (!vesselPageUrl) { cUrlMissing++; continue; }

        const landingName = pick<string>(r, ["landing_name", "landing"]) || "Unknown Landing";
        const landingSlug = slugify(pick<string>(r, ["landing_slug", "landing-slug"]) || landingName);
        const landingWebsite = pick<string>(r, ["landing_website", "landing_url", "landing site"]) || originOf(vesselPageUrl);

        const vesselName = pick<string>(r, ["vessel_name", "boat_name", "vessel", "operator"]) || "Unknown Vessel";
        const vesselSlugFile = slugify(String(pick<string>(r, ["vessel_slug", "boat_slug"]) || ""));
        const vesselSlugGuess = slugify(vesselName);

        // ensure landing exists
        const landing = await ensureLandingBySlugOrName(landingSlug, landingName, landingWebsite || undefined);

        // find vessel by slug → name → website domain
        let vesselId: string | null = null;

        if (vesselSlugFile && vIdx.bySlug.has(vesselSlugFile)) {
            vesselId = vIdx.bySlug.get(vesselSlugFile)!; cSlug++;
        } else if (vesselSlugGuess && vIdx.bySlug.has(vesselSlugGuess)) {
            vesselId = vIdx.bySlug.get(vesselSlugGuess)!; cSlug++;
        } else {
            const nameKey = vesselName.toLowerCase().replace(/\s+/g, " ").trim();
            if (nameKey && vIdx.byName.has(nameKey)) { vesselId = vIdx.byName.get(nameKey)!; cName++; }
        }

        if (!vesselId) {
            const dom = domainOf(pick<string>(r, ["vessel_website", "operator_website", "website"]) || vesselPageUrl);
            if (dom && vIdx.byDomain.has(dom)) {
                vesselId = vIdx.byDomain.get(dom)![0]; cDomain++;
            }
        }

        if (!vesselId) {
            misses.push({ reason: "vessel_not_found", landing: landingSlug, vessel: vesselName, url: vesselPageUrl });
            continue;
        }

        await upsertVesselLanding(vesselId, landing.id, vesselPageUrl);
        cLinked++;
    }

    console.log("[linker] linked:", cLinked);
    console.log("[linker] counters:", { viaSlug: cSlug, viaName: cName, viaDomain: cDomain, urlMissing: cUrlMissing, misses: misses.length });
    if (misses.length) {
        console.log("[linker] first misses:");
        console.table(misses.slice(0, 30));
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
