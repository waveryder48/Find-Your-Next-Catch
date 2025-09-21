import type { Page } from "playwright";
import type { ExtractedTrip } from "../lib/scrape-types";

export const name = "XOLA" as const;

export function detect(url: string) {
    return /xola\.com|book\.xola\.com/i.test(url);
}

export async function scrape(page: Page, url: string): Promise<ExtractedTrip[]> {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const items = await page.$$("[data-xola-product], .xola-product, .product-card");
    if (!items.length) return [];

    const out: ExtractedTrip[] = [];
    for (const el of items) {
        const title = (await el.$eval("h2, .title", n => n.textContent?.trim() || "").catch(() => "")) || "Trip";
        const priceText = await el.$eval(".price", n => n.textContent || "").catch(() => "");
        const cents = priceText ? roughCents(priceText) : null;

        out.push({
            sourceUrl: url,
            sourceItemId: null,
            title,
            departLocal: new Date(), // TODO
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
    return out;
}

function roughCents(text: string): number | null {
    const m = text.replace(/[, ]/g, "").match(/(\d+)(?:\.(\d{1,2}))?/);
    if (!m) return null;
    return parseInt(m[1], 10) * 100 + parseInt((m[2] || "0").padEnd(2, "0"), 10);
}
