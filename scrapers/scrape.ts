import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { chromium } from "playwright";
import xlsx from "xlsx";
import { db } from "../lib/db";
import { and, eq } from "drizzle-orm";
import { landings, vessels, vesselLandings } from "../schema";
import { pickScraper } from "../scrapers";
import type { Platform, ExtractedTrip } from "../lib/scrape-types";
import { upsertTripAndTiers } from "../lib/scrape-upsert";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
    const k = process.argv[i];
    const v = process.argv[i + 1];
    if (k?.startsWith("--")) args.set(k.slice(2), v ?? "");
}
const landingSlug = args.get("landing") || "";
const headless = args.get("headless") !== "false";

function loadPlatformHints(): Map<string, Platform> {
    const map = new Map<string, Platform>();
    const file = process.env.SCHEDULE_XLSX_PATH || "./schedule_pages.xlsx";
    try {
        const wb = xlsx.readFile(path.resolve(process.cwd(), file));
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
        for (const r of rows) {
            const url = (r.vessel_page_url || r.url || r.source_url || "").toString().trim();
            if (!url) continue;
            const p = (r.platform || r.source || r.booking_engine || "").toString().trim().toUpperCase();
            let plat: Platform = "UNKNOWN";
            if (p.includes("FARE")) plat = "FAREHARBOR";
            else if (p === "FRN" || p === "FR") plat = "FRN";
            else if (p.includes("XOLA")) plat = "XOLA";
            else if (p.includes("VIRTUAL")) plat = "VIRTUAL";
            map.set(url, plat);
        }
    } catch { }
    return map;
}

async function main() {
    const platformHints = loadPlatformHints();

    const rows = await db
        .select({
            landingId: landings.id,
            landingSlug: landings.slug,
            vesselId: vessels.id,
            vesselSlug: vessels.slug,
            url: vesselLandings.vesselPageUrl,
        })
        .from(vesselLandings)
        .innerJoin(landings, eq(vesselLandings.landingId, landings.id))
        .leftJoin(vessels, eq(vesselLandings.vesselId, vessels.id))
        .where(landingSlug ? and(eq(landings.slug, landingSlug)) : undefined);

    if (!rows.length) {
        console.log(landingSlug ? `No vessel pages for landing ${landingSlug}` : "No vessel pages found.");
        process.exit(0);
    }

    const browser = await chromium.launch({ headless });
    const ctx = await browser.newContext({
        userAgent: "Mozilla/5.0 (compatible; FYNCBot/1.0; +https://example.com/bot)",
    });

    let totalTrips = 0, totalPages = 0;

    for (const r of rows) {
        const url = r.url;
        const hint = platformHints.get(url);
        const scraper = pickScraper(url, hint);
        const page = await ctx.newPage();

        try {
            console.log(`\n[${scraper.name}] ${url}`);
            const extracted: ExtractedTrip[] = await scraper.scrape(page, url);

            if (!extracted.length) {
                console.log("  (no trips found)");
                await page.close();
                totalPages++;
                continue;
            }

            for (const t of extracted) {
                await upsertTripAndTiers({
                    landingId: r.landingId,
                    vesselId: r.vesselId ?? null,
                    platform: scraper.name,
                    trip: t,
                });
                totalTrips++;
                console.log(`  + ${t.title} @ ${t.departLocal.toISOString()} (${t.priceTiers?.[0]?.priceCents ?? "—"}¢)`);
            }
        } catch (e: any) {
            console.warn("  ! scrape failed:", e?.message ?? e);
        } finally {
            await page.close();
            await wait(400);
            totalPages++;
        }
    }

    await ctx.close();
    await browser.close();

    console.log(`\nDone. pages=${totalPages}, trips_upserted=${totalTrips}`);
}

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
main().catch((e) => { console.error(e); process.exit(1); });
