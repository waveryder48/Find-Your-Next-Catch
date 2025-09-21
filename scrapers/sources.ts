import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";
import { db } from "../lib/db";
import { landings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export type Site = { landingSlug: string; landingName: string; baseUrl: string; source: "FR" | "HM" | "OTHER" };

function slugify(input: string) {
    return input.toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function loadScheduleSites(): Promise<Site[]> {
    const candidates = [
        process.env.SCHEDULE_XLSX_PATH,
        path.join(process.cwd(), "schedule_pages.xlsx"),
        path.join(process.cwd(), "data", "schedule_pages.xlsx"),
    ].filter(Boolean) as string[];

    const xlPath = candidates.find((p) => fs.existsSync(p));
    if (!xlPath) {
        console.warn("[sources] schedule_pages.xlsx not found; falling back to built-in FR list");
        return [];
    }

    const wb = XLSX.readFile(xlPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

    const out: Site[] = [];
    for (const r of rows) {
        // Accept a few column name variants
        const landingName: string = (r.Landing || r["Landing Name"] || "").trim();
        const landingSlug: string = (r["Landing Slug"] || "").trim() || slugify(landingName);
        const url: string = (r.URL || r["Schedule URL"] || r["Base URL"] || "").trim();
        const srcRaw: string = (r.Source || r["Trip Source"] || "").trim().toUpperCase();
        if (!landingName || !url) continue;

        const source = (srcRaw === "FR" || srcRaw === "HM") ? (srcRaw as "FR" | "HM") :
            /fishingreservations\.net/i.test(url) ? "FR" :
                /hmlanding\.com/i.test(url) ? "HM" : "OTHER";

        // verify slug exists; if not, try to resolve by name
        let slug = landingSlug;
        if (slug) {
            const l = await db.query.landings.findFirst({ where: (t, { eq }) => eq(t.slug, slug), columns: { slug: true, name: true } });
            if (!l) {
                const byName = await db.query.landings.findFirst({ where: (t, { eq }) => eq(t.name, landingName), columns: { slug: true, name: true } });
                if (byName) slug = byName.slug;
            }
        }

        out.push({ landingSlug: slug, landingName, baseUrl: url, source });
    }
    return out.filter(s => !!s.landingSlug && !!s.baseUrl);
}

