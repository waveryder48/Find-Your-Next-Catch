import type { Page } from "playwright";
import type { ExtractedTrip } from "../lib/scrape-types";

export const name = "FAREHARBOR" as const;

export function detect(url: string) {
    return /fareharbor\.com|fh-sites\.com/i.test(url);
}

export async function scrape(page: Page, url: string): Promise<ExtractedTrip[]> {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const cards = await page.$$("[data-item], .item, .fh-item, [data-fh-item]");
    if (!cards.length) return [];

    const trips: ExtractedTrip[] = [];
    for (const el of cards) {
        const title = (await el.$eval("h2, .title, [data-title]", n => n.textContent?.trim() || "").catch(() => "")) || "Trip";
        const priceText = await el.$eval(".price, [data-price]", n => n.textContent || "").catch(() => "");
        const cents = parsePriceToCents(priceText);
        const departLocal = new Date(); // TODO: refine per site

        trips.push({
            sourceUrl: url,
            sourceItemId: null,
            title,
            departLocal,
            returnLocal: null,
            timezone: "America/Los_Angeles",
            status: "OPEN",
            load: null,
            spots: null,
            notes: null,
            priceIncludesFees: false,
            serviceFeePct: null,
            priceTiers: cents != null ? [{ type: "ADULT", label: "Adult", priceCents: cents, currency: "USD" }] : [],
            promoSummary: null,
            flags: [],
        });
    }
    return trips;
}

function parsePriceToCents(text: string): number | null {
    const m = text?.replace(/[, ]/g, "").match(/(\d+)(?:\.(\d{1,2}))?/);
    if (!m) return null;
    const dollars = parseInt(m[1] || "0", 10);
    const cents = parseInt((m[2] || "0").padEnd(2, "0"), 10);
    return dollars * 100 + cents;
}
