// scrapers/frn.ts
import type { Page, Browser } from "playwright";
import playwright from "playwright";
import { scrapeFrnTable, type Trip } from "./frn-table";

export type FrnCtx = {
    landing: any;
    url?: string;
    timezone?: string;
    verbose?: boolean;
    page?: Page;
};

export default async function scrapeFrn(ctx: FrnCtx): Promise<Trip[]> {
    const landing = ctx?.landing ?? {};
    let url =
        ctx?.url ??
        landing?.bookingUrl ??
        landing?.scheduleUrl ??
        landing?.website ??
        landing?.websiteUrl;

    if (!url) throw new Error(`FRN: missing schedule url for ${landing?.name ?? "unknown"}`);

    // Canonicalize FRN: /fishing → /sales/, ensure instance pages work
    try {
        const u = new URL(url);
        if (u.hostname.endsWith("fishingreservations.net") && !/user\.php/i.test(u.pathname)) {
            if (!/\/sales/i.test(u.pathname)) {
                const sub = u.hostname.split(".")[0];
                url = `https://${sub}.fishingreservations.net/sales/`;
            }
        }
    } catch { }

    let browser: Browser | undefined;
    let page: Page | undefined = ctx.page;

    try {
        if (!page) {
            browser = await playwright.chromium.launch({ headless: true });
            page = await browser.newPage();
        }
        page.setDefaultTimeout(4000);

        const trips = await scrapeFrnTable(page!, url);
        if (ctx?.verbose) console.log(`[frn] parsed ${trips.length} for ${landing?.name ?? "unknown"}`);
        return trips;
    } finally {
        if (!ctx.page) {
            await page?.close().catch(() => { });
            await browser?.close().catch(() => { });
        }
    }
}
