// scripts/scrape-from-schedules.ts
import "dotenv/config";
import * as XLSX from "xlsx/xlsx.mjs";
import * as fs from "node:fs";
// required for Node.js ESM so readFile/writeFile work
// (types don't expose set_fs, so cast)
(XLSX as any).set_fs(fs);

import path from "node:path";
import { chromium } from "playwright";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";
import { pickScraper, type ScheduleRow } from "../scrapers";

function getArg(flag: string): string | null {
    const i = process.argv.indexOf(flag);
    return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}
function hasFlag(flag: string) {
    return process.argv.includes(flag);
}
function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function resolveLanding(
    query: string | undefined,
    landingNameFromRow?: string
): Promise<{ id: string; slug: string; name: string } | null> {
    const candidate = (query || landingNameFromRow || "").trim();
    if (!candidate) return null;

    const wanted = slugify(candidate).replace(/-landing$/, "");
    const trySlugs = [wanted, `${wanted}-landing`];

    const q = sql`
    SELECT id, slug, name
    FROM landings
    WHERE slug = ${trySlugs[0]}
       OR slug = ${trySlugs[1]}
       OR slug ILIKE ${"%" + wanted + "%"}
       OR name ILIKE ${"%" + candidate + "%"}
    ORDER BY
      CASE
        WHEN slug = ${trySlugs[0]} THEN 0
        WHEN slug = ${trySlugs[1]} THEN 1
        WHEN slug ILIKE ${"%" + wanted + "%"} THEN 2
        ELSE 3
      END
    LIMIT 1
  `;
    const res: any = await db.execute(q);
    const row = Array.isArray(res) ? res[0] : res?.rows?.[0];
    return row ?? null;
}

function readSheetRows(): any[] {
    // prefer env; fall back to common filenames
    const envPath = process.env.SCHEDULE_XLSX_PATH || process.env.SCHEDULES_XLSX_PATH;
    const guessA = envPath || path.resolve(process.cwd(), "schedule_pages.xlsx");
    const guessB = path.resolve(process.cwd(), "schedules_pages.xlsx");

    const tryPaths = [guessA, guessB];
    let loadedPath: string | null = null;
    let wb: XLSX.WorkBook | null = null;

    for (const p of tryPaths) {
        try {
            // In ESM, readFile may not exist until set_fs is called (we did above),
            // but we still guard and fallback to manual read.
            if (typeof (XLSX as any).readFile === "function") {
                wb = (XLSX as any).readFile(p);
            } else {
                const buf = fs.readFileSync(p);
                wb = XLSX.read(buf, { type: "buffer" });
            }
            loadedPath = p;
            break;
        } catch {
            // try next
        }
    }

    if (!wb || !loadedPath) {
        throw new Error(
            `Could not open schedule workbook. Tried: ${tryPaths.join(", ")}. ` +
            `Set SCHEDULE_XLSX_PATH in .env.local if your file is elsewhere.`
        );
    }

    console.log(`[scrape:xlsx] reading ${loadedPath}`);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
}


function normalizeRow(r: any): ScheduleRow {
    return {
        landingName: String(r["Landing Name"] ?? r["Landing"] ?? "").trim(),
        bookingUrl: String(r["Booking URL"] ?? r["URL"] ?? r["Link"] ?? "").trim(),
        notes: String(r["Notes"] ?? r["Provider"] ?? r["Source"] ?? "").trim(),
        source: String(r["Source"] ?? r["notes_source"] ?? "").trim().toUpperCase(),
    };
}

async function main() {
    const landingArg = getArg("--landing") ?? undefined;
    const headless = (getArg("--headless") ?? "true").toLowerCase() !== "false";
    const dryRun = hasFlag("--dry-run") || !!getArg("--dry-run");

    const sheetRows = readSheetRows().map(normalizeRow);

    // Filter rows to the requested landing (if provided)
    const filtered = landingArg
        ? sheetRows.filter((r) => {
            const slug = slugify(r.landingName || "");
            const host = (() => {
                try {
                    return new URL(r.bookingUrl || "").host;
                } catch {
                    return "";
                }
            })();
            const q = landingArg.toLowerCase();
            return slug.includes(q) || (r.landingName || "").toLowerCase().includes(q) || host.includes(q);
        })
        : sheetRows;

    if (filtered.length === 0) {
        console.error(`[scrape:xlsx] No rows matched for --landing ${landingArg ?? "(none)"}.`);
        const examples = Array.from(new Set(sheetRows.map((r) => r.landingName))).slice(0, 20);
        console.error("Examples:", examples);
        process.exit(1);
    }

    // We process one row at a time for now
    const row = filtered[0];
    const scheduleUrl = row.bookingUrl || (row as any).url || "";
    const scraper = pickScraper(row);
    const landing = await resolveLanding(landingArg, row.landingName);

    if (dryRun) {
        console.log("[dry-run] row =", row);
        console.log("[dry-run] landing =", landing ?? null);
        console.log("[dry-run] scraper =", scraper?.id ?? null);
        console.log("[dry-run] url =", scheduleUrl);
        return;
    }

    if (!scraper) {
        console.error("[scrape:xlsx] No scraper matched this row. notes/source/url:", {
            notes: row.notes,
            source: row.source,
            url: scheduleUrl,
        });
        process.exit(1);
    }
    if (!landing) {
        console.error(
            "[scrape:xlsx] Could not resolve landing in DB. " +
            "Ensure the landing exists and the slug/name roughly matches the --landing value and XLSX row."
        );
        process.exit(1);
    }

    const browser = await chromium.launch({ headless });
    const page = await browser.newPage();
    try {
        const result = await scraper.run(page, landing, scheduleUrl, { headless });
        console.log(`[scrape:xlsx] done rows=1, trips_upserted=${result.tripsUpserted}`);
    } finally {
        await page.close().catch(() => { });
        await browser.close().catch(() => { });
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
