import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

import xlsx from "xlsx";
import { randomUUID } from "crypto";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";

const XLSX_PATH = process.env.SCHEDULE_XLSX_PATH || "./schedule_pages.xlsx";

// utilities
const slugify = (s: string) =>
    (s ?? "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 256);

function pick<T = any>(row: any, names: string[], def: T | null = null): T | null {
    for (const n of names) {
        const v = row[n] ?? row[n.toLowerCase()] ?? row[n.replace(/\s+/g, "_")];
        if (v !== undefined && v !== "") return v as T;
    }
    return def;
}

function originFrom(url?: string | null) {
    try {
        if (!url) return null;
        const u = new URL(url);
        return `${u.protocol}//${u.host}`;
    } catch {
        return null;
    }
}

async function ensureLandingBySlugOrName({
    slug,
    name,
    website,
}: {
    slug: string;
    name: string;
    website?: string | null;
}): Promise<{ id: string; slug: string }> {
    // try get by slug
    const got = await db.execute(sql`
    SELECT id, slug FROM "landings" WHERE slug = ${slug} LIMIT 1
  `);
    if ((got as any).rows?.length) return (got as any).rows[0];

    const site = website || "https://example-landing.test";
    // upsert by slug
    const ins = await db.execute(sql`
    INSERT INTO "landings" ("id","name","slug","website","created_at","updated_at")
    VALUES (${randomUUID()}, ${name}, ${slug}, ${site}, NOW(), NOW())
    ON CONFLICT ("slug") DO UPDATE SET "updated_at" = NOW()
    RETURNING "id","slug"
  `);
    return (ins as any).rows[0];
}

async function findVesselId({
    slugCandidates,
    name,
}: {
    slugCandidates: string[];
    name?: string | null;
}): Promise<string | null> {
    // try exact slug match
    for (const s of slugCandidates) {
        if (!s) continue;
        const r = await db.execute(sql`SELECT id FROM "vessels" WHERE slug = ${s} LIMIT 1`);
        const id = (r as any).rows?.[0]?.id;
        if (id) return id;
    }
    // fallback: name ILIKE
    if (name && name.trim()) {
        const r = await db.execute(sql`SELECT id FROM "vessels" WHERE name ILIKE ${name} LIMIT 1`);
        const id = (r as any).rows?.[0]?.id;
        if (id) return id;
    }
    return null;
}

async function upsertVesselLanding({
    vesselId,
    landingId,
    url,
}: {
    vesselId: string;
    landingId: string;
    url: string;
}) {
    await db.execute(sql`
    INSERT INTO "vessel_landings" ("vessel_id","landing_id","vessel_page_url","created_at","updated_at")
    VALUES (${vesselId}, ${landingId}, ${url}, NOW(), NOW())
    ON CONFLICT ("vessel_id","landing_id") DO UPDATE SET
      "vessel_page_url" = EXCLUDED."vessel_page_url",
      "updated_at" = NOW()
  `);
}

async function main() {
    const abs = path.resolve(process.cwd(), XLSX_PATH);
    console.log("[linker] reading", abs);

    const wb = xlsx.readFile(abs);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    let linked = 0;
    const misses: Array<{ reason: string; landing: string; vessel: string; url: string }> = [];

    for (const r of rows) {
        const vesselPageUrl = pick<string>(r, ["vessel_page_url", "booking_url", "source_url", "url"]);
        if (!vesselPageUrl) continue;

        const landingName = pick<string>(r, ["landing_name", "landing"]) || "Unknown Landing";
        const landingSlug = slugify(pick<string>(r, ["landing_slug", "landing-slug"]) || landingName);
        const landingWebsite =
            pick<string>(r, ["landing_website", "landing_url", "landing site"]) || originFrom(vesselPageUrl);

        const vesselName = pick<string>(r, ["vessel_name", "boat_name", "vessel", "operator"]) || "Unknown Vessel";
        const vesselSlugFile = pick<string>(r, ["vessel_slug", "boat_slug"]);
        const vesselSlugGuess = slugify(vesselName);
        const vesselSlugCandidates = [vesselSlugFile, vesselSlugGuess].filter(Boolean) as string[];

        try {
            const landing = await ensureLandingBySlugOrName({
                slug: landingSlug,
                name: landingName,
                website: landingWebsite || undefined,
            });

            const vesselId = await findVesselId({ slugCandidates: vesselSlugCandidates, name: vesselName });
            if (!vesselId) {
                misses.push({ reason: "vessel_not_found", landing: landingSlug, vessel: vesselName, url: vesselPageUrl });
                continue;
            }

            await upsertVesselLanding({ vesselId, landingId: landing.id, url: vesselPageUrl });
            linked++;
        } catch (e: any) {
            misses.push({
                reason: `error:${e?.code || e?.message || "unknown"}`,
                landing: landingSlug,
                vessel: vesselName,
                url: vesselPageUrl,
            });
        }
    }

    console.log("[linker] linked", linked);
    if (misses.length) {
        console.log("[linker] misses:", misses.length);
        console.table(misses.slice(0, 20));
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
