// scripts/import-landings-vessels.ts
// Imports landing + vessel rows from XLSX into Postgres.
// Uses raw SQL for vessel UPSERT so we can set NOT NULL columns (website, landing_id).

import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

import xlsx from "xlsx";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { landings, vessels, vesselLandings } from "@/schema";
// add to both scripts (above main)
import fs from "node:fs";

function resolveFirstExisting(paths: string[]) {
    for (const p of paths) {
        if (p && fs.existsSync(p)) return p;
    }
    return "";
}


// ---- helpers ----
const slugify = (s: string) =>
    s?.toString()?.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 256) || "";

function pick<T = any>(row: any, names: string[], def: T | null = null): T | null {
    for (const n of names) {
        const v = row[n] ?? row[n.toLowerCase()] ?? row[n.replace(/\s+/g, "_")];
        if (v !== undefined && v !== "") return v as T;
    }
    return def;
}

function requireStr(label: string, v: any) {
    const s = (v ?? "").toString().trim();
    if (!s) throw new Error(`Missing required ${label}`);
    return s;
}

// ---- import logic ----
async function ensureLanding(input: {
    name?: string | null; slug?: string | null; website?: string | null;
}) {
    const name = requireStr("landing name", input.name);
    const slug = slugify(input.slug || name);
    const website = requireStr("landing website", input.website ?? "https://example-landing.test");

    const existing = await db.select().from(landings).where(eq(landings.slug, slug)).limit(1);
    if (existing.length) return existing[0];

    const row = { id: randomUUID(), name, slug, website };
    await db.insert(landings).values(row);
    return row;
}

async function upsertVesselWithLanding(params: {
    name: string; slug: string; website: string; primaryWebsite?: string | null; landingId: string;
}) {
    const id = randomUUID();
    const { name, slug, website, primaryWebsite, landingId } = params;

    // Note: DB has NOT NULL "website" and "landing_id" on vessels.
    const res = await db.execute(sql`
    INSERT INTO "vessels"
      ("id","name","slug","website","primary_website","landing_id","created_at","updated_at")
    VALUES
      (${id}, ${name}, ${slug}, ${website}, ${primaryWebsite ?? null}, ${landingId}, NOW(), NOW())
    ON CONFLICT ("slug") DO UPDATE
    SET "landing_id" = EXCLUDED."landing_id",
        "website" = EXCLUDED."website",
        "primary_website" = EXCLUDED."primary_website",
        "updated_at" = NOW()
    RETURNING "id","name","slug"
  `);
    // @ts-expect-error drizzle execute returns rows (pg)
    return res.rows[0] as { id: string; name: string; slug: string };
}

async function ensureVesselLandingLink(vesselId: string, landingId: string, url?: string | null) {
    try {
        await db.insert(vesselLandings).values({
            vesselId, landingId, vesselPageUrl: url || "https://example-operator.test",
        });
    } catch { /* ignore duplicate PK */ }
}

async function main() {
    const file = resolveFirstExisting([
        process.env.SEED_XLSX_PATH ?? "",
        "./landings_vessels.xlsx",
        "./data/landings_vessels.xlsx",
        "C:/Users/kwleo/FYNC/landings_vessels.xlsx",
    ]);
    if (!file) { console.error("[import:lv] file not found"); process.exit(1); }
    const filePath = path.resolve(process.cwd(), file);

    console.log("[import:lv] reading", filePath);

    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    let createdLandings = 0, upsertedVessels = 0, linked = 0;

    for (const r of rows) {
        // Flexible headers
        const landingName = pick<string>(r, ["landing_name", "landing", "marina", "port"]);
        const landingSlug = pick<string>(r, ["landing_slug", "landing-slug"]);
        const landingSite = pick<string>(r, ["landing_website", "landing_site", "landing url", "landing_url"]);

        const vesselName = pick<string>(r, ["vessel_name", "boat_name", "vessel"]);
        const vesselSlug = pick<string>(r, ["vessel_slug", "boat_slug"]);
        const vesselSite = pick<string>(r, ["vessel_website", "website", "operator_website"]);
        const vesselPrimary = pick<string>(r, ["vessel_primary_website", "primary_website", "page"]);
        const vesselPageUrl = pick<string>(r, ["vessel_page_url", "booking_url", "source_url"]);

        if (!landingName && !vesselName) continue; // empty row

        const landing = await ensureLanding({
            name: landingName,
            slug: landingSlug,
            website: landingSite ?? "https://example-landing.test",
        });
        if (!landingSlug) createdLandings++;

        const vessel = await upsertVesselWithLanding({
            name: requireStr("vessel name", vesselName || "Unnamed Vessel"),
            slug: slugify(vesselSlug || vesselName || randomUUID()),
            website: requireStr("vessel website", vesselSite || "https://example-operator.test"),
            primaryWebsite: vesselPrimary ?? null,
            landingId: landing.id,
        });
        upsertedVessels++;

        await ensureVesselLandingLink(vessel.id, landing.id, vesselPageUrl ?? vesselPrimary ?? vesselSite);
        linked++;
    }

    console.log("[import:lv] done", { createdLandings, upsertedVessels, linked });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

