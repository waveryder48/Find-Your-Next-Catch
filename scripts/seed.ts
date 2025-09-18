// scripts/seed.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../lib/db";
import { landings, vessels, vesselLandings } from "../drizzle/schema";
import { sql } from "drizzle-orm";

// IMPORTANT: use ESM build of xlsx and inject fs so readFile works
import * as XLSX from "xlsx/xlsx.mjs";
import * as fs from "node:fs";
XLSX.set_fs(fs as any);

import path from "node:path";
import crypto from "node:crypto";

// --- utils ------------------------------------------------------------
const id = () => crypto.randomUUID();

function slugify(input: string) {
    return input
        .toLowerCase()
        .normalize("NFKD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

type Row = {
    Landing: string;
    "Landing Website": string;
    Vessel: string;
    "Vessel Website": string;
};

// --- resolve XLSX path ------------------------------------------------
function resolveXlsxPath() {
    const candidates = [
        process.env.SEED_XLSX_PATH,
        path.join(process.cwd(), "landings_vessels.xlsx"),
        path.join(process.cwd(), "data", "landings_vessels.xlsx"),
    ].filter(Boolean) as string[];

    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
        const msg =
            "XLSX not found.\nTried:\n" +
            candidates.map((p) => ` - ${p}`).join("\n") +
            "\nSet SEED_XLSX_PATH or place landings_vessels.xlsx at repo root.";
        throw new Error(msg);
    }
    return found;
}

// --- upserts ----------------------------------------------------------
async function upsertLanding(name: string, website: string): Promise<string> {
    const slug = slugify(name);
    const now = new Date();

    const res = await db
        .insert(landings)
        .values({ id: id(), name, slug, website, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
            target: landings.slug,
            set: { name, website, updatedAt: now },
        })
        .returning({ id: landings.id });

    return res[0]!.id;
}

async function upsertVessel(name: string): Promise<string> {
    const slug = slugify(name);
    const now = new Date();

    const res = await db
        .insert(vessels)
        .values({ id: id(), name, slug, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
            target: vessels.slug,
            set: { name, updatedAt: now },
        })
        .returning({ id: vessels.id });

    return res[0]!.id;
}

async function upsertVesselLanding(vesselId: string, landingId: string, vesselPageUrl: string) {
    const now = new Date();
    await db
        .insert(vesselLandings)
        .values({ vesselId, landingId, vesselPageUrl, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
            target: [vesselLandings.vesselId, vesselLandings.landingId],
            set: { vesselPageUrl, updatedAt: now },
        });
}

// --- main -------------------------------------------------------------
async function main() {
    const xlPath = resolveXlsxPath();
    console.log(`[seed] using ${xlPath}`);

    // With ESM build + set_fs, readFile works:
    const wb = XLSX.readFile(xlPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });

    let processed = 0;
    let skipped = 0;

    const landingIdBySlug = new Map<string, string>();
    const vesselIdBySlug = new Map<string, string>();

    for (const r of rows) {
        const landingName = r.Landing?.trim();
        const landingUrl = r["Landing Website"]?.trim();
        const vesselName = r.Vessel?.trim();
        const vesselUrl = r["Vessel Website"]?.trim();

        if (!landingName || !landingUrl || !vesselName || !vesselUrl) {
            skipped++;
            continue;
        }

        const landingSlug = slugify(landingName);
        let landingId = landingIdBySlug.get(landingSlug);
        if (!landingId) {
            landingId = await upsertLanding(landingName, landingUrl);
            landingIdBySlug.set(landingSlug, landingId);
        }

        const vesselSlug = slugify(vesselName);
        let vesselId = vesselIdBySlug.get(vesselSlug);
        if (!vesselId) {
            vesselId = await upsertVessel(vesselName);
            vesselIdBySlug.set(vesselSlug, vesselId);
        }

        await upsertVesselLanding(vesselId, landingId, vesselUrl);

        processed++;
        if (processed % 50 === 0) console.log(`[seed] processed ${processed} rows…`);
    }

    const [{ lc }] = await db.select({ lc: sql<number>`count(*)` }).from(landings);
    const [{ vc }] = await db.select({ vc: sql<number>`count(*)` }).from(vessels);
    const [{ vlc }] = await db.select({ vlc: sql<number>`count(*)` }).from(vesselLandings);

    console.log(`[seed] complete → rows processed: ${processed}, skipped: ${skipped} | landings: ${lc} | vessels: ${vc} | links: ${vlc}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
