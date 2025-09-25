// scripts/syncAllTrips.mts — use your exact booking URLs per landing
import { db } from "../db";
import { landings } from "../db/schema";
import * as scrapers from "../scrapers";
import { upsertTripAndTiers, cleanupExpiredTrips } from "../lib/scrape-upsert";

// === hard overrides from schedules_pages.xlsx / your list ===
const EXACT: Record<string, { url: string; platform: "FRN" | "FAREHARBOR" | "XOLA" | "VIRTUAL" | "OTHER" }> = {
    "Marina Del Rey Sportfishing": { url: "https://fareharbor.com/mdrsf/items/", platform: "FAREHARBOR" },
    "Morro Bay Landing": { url: "https://morrobaylanding.fishingreservations.net/sales/", platform: "FRN" },
    "Redondo Beach Sportfishing": { url: "https://redondo.virtuallanding.com/", platform: "VIRTUAL" },
    "Pierpoint Landing": { url: "https://pierpoint.virtuallanding.com/", platform: "VIRTUAL" },
    "Santa Barbara Landing": { url: "https://sblanding.fishingreservations.net/sales/", platform: "FRN" }, // canonicalized from /fishing
    "Ventura Harbor Sportfishing": { url: "https://ventura.virtuallanding.com/", platform: "VIRTUAL" },
    "Dana Wharf Sportfishing": { url: "https://fareharbor.com/danawharf/items/", platform: "FAREHARBOR" },
    "H&M Landing": { url: "https://www.hmlanding.com/trip-calendar", platform: "XOLA" },
    "Davey's Locker": { url: "https://fareharbor.com/daveyslocker/items/", platform: "FAREHARBOR" },
};

function engineFor(platform: string) {
    const p = platform.toUpperCase();
    if (p === "FRN") return import("../scrapers/frn").then(m => m.default);
    if (p === "FAREHARBOR") return import("../scrapers/fareharbor").then(m => m.default);
    if (p === "XOLA") return import("../scrapers/xola").then(m => m.default);
    if (p === "VIRTUAL") return import("../scrapers/virtual").then(m => m.default);
    return null;
}

async function runOne(landing: any) {
    const name = (landing?.name ?? "").toString().trim();

    // exact override first
    const exact = EXACT[name];
    const urlStr =
        exact?.url ??
        landing?.bookingUrl ??
        landing?.scheduleUrl ??
        landing?.website ??
        landing?.websiteUrl ??
        null;

    if (!urlStr) { console.log(`🚫 Skipping (no URL): ${name}`); return; }

    // prefer platform from override, else from hostname
    let platform = exact?.platform ?? "OTHER";
    if (platform === "OTHER") {
        try {
            const h = new URL(urlStr).hostname.toLowerCase();
            if (h.includes("fishingreservations")) platform = "FRN";
            else if (h.includes("fareharbor") || h.includes("fh-sites")) platform = "FAREHARBOR";
            else if (h.includes("virtuallanding")) platform = "VIRTUAL";
            else if (h.includes("hmlanding") || h.includes("xola")) platform = "XOLA";
        } catch { }
    }

    const engine = await engineFor(platform);
    if (!engine) { console.log(`🚫 No engine for ${name} (${platform})`); return; }

    console.log(`🔍 Scraping: ${name} (${platform}) → ${urlStr}`);
    let offers: any[] = [];
    try {
        offers = (await engine({
            landing,
            url: urlStr,
            timezone: landing?.timezone ?? "America/Los_Angeles",
            verbose: false,
        })) ?? [];
    } catch (err) {
        console.error(`❌ Failed to scrape ${name}:`, err);
    }

    if (!offers || offers.length === 0) {
        console.log(`ℹ️  ${name}: 0 trips (check selectors / calendar URL)`);
    }

    let count = 0;
    for (const trip of offers) {
        await upsertTripAndTiers({
            landingId: landing.id,
            vesselId: trip?.vesselId ?? null,
            platform,
            trip: {
                title: (trip?.title ?? "").toString(),
                sourceUrl: (trip?.sourceUrl ?? urlStr).toString(),
                departLocal: new Date(trip?.departLocal),
                returnLocal: trip?.returnLocal ? new Date(trip?.returnLocal) : null,
                status: trip?.status ?? undefined,
                price: trip?.price ?? undefined,
                type: trip?.type ?? undefined,
            },
        });
        count++;
    }
    console.log(`✅ ${name}: upserted ${count} trips`);
}

async function main() {
    const allLandings = await db.select().from(landings);
    for (const landing of allLandings) await runOne(landing);
    await cleanupExpiredTrips();
    console.log("✅ Trip sync complete");
}

main().catch((err) => { console.error("🔥 Fatal error:", err); process.exit(1); });
