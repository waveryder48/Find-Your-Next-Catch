import { chromium } from "playwright";
import * as cheerio from "cheerio";
import crypto from "node:crypto";
import { db } from "../lib/db";
import { landings, vessels, vesselLandings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { loadScheduleSites } from "./sources";


const id = () => crypto.randomUUID();
const TZ = "America/Los_Angeles";

const toCents = (s: string) => Math.round(parseFloat(s.replace(/[^\d.]/g, "")) * 100);
const norm = (s?: string) => s?.trim().replace(/\s+/g, " ") ?? "";

type TripRow = {
    title: string; depart: string; ret?: string; load?: number; spots?: number | "Chartered" | "Full" | "Waitlist";
    price?: number; status: string; promoText?: string; rawHtml: string;
};

async function extractTripRows(pageHtml: string): Promise<TripRow[]> {
    const $ = cheerio.load(pageHtml);
    const text = $("body").text();
    const blocks = text.split(/(?:Book Now|Make your reservation|Trip Details)/i);
    const rows: TripRow[] = [];
    for (const block of blocks) {
        const b = block.replace(/\s+/g, " ").trim();
        const mDepart = b.match(/(?:Departs:)?\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s*\d{1,2}:\d{2}\s*[AP]M/i);
        const mPrice = b.match(/\$[\d,.]+/);
        if (!mDepart || !mPrice) continue;
        const mReturn = b.match(/(?:Returns:)\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s*\d{1,2}:\d{2}\s*[AP]M/i);
        const mLoad = b.match(/\bLoad:\s*(\d{1,3})/i);
        const mSpots = b.match(/\bSpots:\s*(\d{1,3}|Full|Waitlist|Chartered)/i);
        const status =
            (mSpots?.[1]?.toString().toLowerCase().includes("full")) ? "Full" :
                (mSpots?.[1]?.toString().toLowerCase().includes("waitlist")) ? "Waitlist" :
                    (mSpots?.[1]?.toString().toLowerCase().includes("chartered")) ? "Chartered" : "Available";

        const promo = b.match(/kids? fish free.*?|jr rates.*?|senior.*?over.*?|weekday special.*?/i)?.[0];

        rows.push({
            title: "Trip",
            depart: mDepart[0], ret: mReturn?.[0],
            load: mLoad ? parseInt(mLoad[1], 10) : undefined,
            spots: mSpots ? (isNaN(+mSpots[1]) ? mSpots[1] as any : parseInt(mSpots[1], 10)) : undefined,
            price: toCents(mPrice[0]),
            status, promoText: promo ? promo.trim() : undefined, rawHtml: block,
        });
    }
    return rows;
}

function parseLocal(dateText: string): Date {
    const d = dateText.replace(/(Departs:|Returns:|Mon\.|Tue\.|Wed\.|Thu\.|Fri\.|Sat\.|Sun\.)/g, "").trim();
    const [mdy, time, ampm] = d.split(/\s+/);
    const [m, day, y] = mdy.split(/[-/]/).map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const hour = (ampm?.toUpperCase() === "PM" && hh < 12) ? hh + 12 : (ampm?.toUpperCase() === "AM" && hh === 12 ? 0 : hh);
    return new Date(`${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00-07:00`);
}

async function upsertTrip(landingSlug: string, row: TripRow, baseUrl: string) {
    const l = await db.query.landings.findFirst({ where: (t, { eq }) => eq(t.slug, landingSlug), columns: { id: true } });
    if (!l) return;
    const depart = parseLocal(row.depart);
    const ret = row.ret ? parseLocal(row.ret.replace(/^Returns:\s*/i, "")) : null;

    const uniqueKey = `FR#${baseUrl}#${depart.getTime()}#${row.title}`;

    // upsert trip
    const [existing] = await db.select({ id: trips.id }).from(trips)
        .where(and(eq(trips.source, "FR"), eq(trips.sourceTripId, uniqueKey)));
    const tripId = existing?.id ?? id();

    const includesFee = /includes 3\.5%/i.test(row.rawHtml);
    if (existing) {
        await db.update(trips).set({
            title: row.title, notes: row.promoText ?? null,
            departLocal: depart, returnLocal: ret ?? null,
            load: row.load ?? null, spots: typeof row.spots === "number" ? row.spots : null,
            status: row.status, priceIncludesFees: includesFee, serviceFeePct: includesFee ? 3.5 as any : null,
            lastScrapedAt: new Date(), sourceUrl: baseUrl, updatedAt: new Date(),
        }).where(eq(trips.id, tripId));
    } else {
        await db.insert(trips).values({
            id: tripId, source: "FR", sourceTripId: uniqueKey, sourceUrl: baseUrl,
            landingId: l.id, title: row.title, notes: row.promoText ?? null,
            departLocal: depart, returnLocal: ret ?? null,
            load: row.load ?? null, spots: typeof row.spots === "number" ? row.spots : null,
            status: row.status, priceIncludesFees: includesFee, serviceFeePct: includesFee ? 3.5 as any : null,
            lastScrapedAt: new Date(),
        });
    }

    // tiers (reset each scrape)
    await db.delete(fareTiers).where(eq(fareTiers.tripId, tripId));
    await db.insert(fareTiers).values([
        { id: id(), tripId, type: "ADULT", label: "Adult", priceCents: row.price ?? 0, currency: "USD" },
    ]);

    // promos
    await db.delete(tripPromotions).where(eq(tripPromotions.tripId, tripId));
    if (row.promoText && /kids? fish free/i.test(row.promoText)) {
        await db.insert(tripPromotions).values({
            id: id(), tripId, slug: "kids-fish-free",
            summary: "Kids fish free with paid adult",
            details: row.promoText, appliesWhen: /weekday/i.test(row.promoText) ? "weekdays" : null,
        });
    }
}

export async function scrapeFrSites({ days = 21 }: { days?: number } = {}) {
    const browser = await chromium.launch({ headless: true });
    try {
        for (const site of FR_SITES) {
            const sites = (await loadScheduleSites()).filter(s => s.source === "FR");
            if (sites.length === 0) {
                console.warn("[fr] no FR sites from schedule_pages.xlsx; nothing to scrape");
                return;
            }
            for (const site of sites) {
                console.log(`[fr] ${site.landingName}: ${rows.length} trips`);
                await page.close();
                await new Promise(r => setTimeout(r, 1200));
            }
        } finally {
            await browser.close();
        }
    }

