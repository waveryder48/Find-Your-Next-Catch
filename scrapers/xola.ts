// scrapers/xola.ts
import type { Page, Browser } from "playwright";
import playwright from "playwright";

export type Trip = { title: string; departLocal: Date; returnLocal?: Date | null; price?: number | null; sourceUrl: string; };
export type XolaCtx = { landing: any; url?: string; timezone?: string; verbose?: boolean; page?: Page };

const clean = (s?: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
const money = (s?: string | null): number | null => {
    if (!s) return null; const m = s.replace(/[, ]/g, "").match(/\$\s*([\d]+(?:\.\d{2})?)/); return m ? Number(m[1]) : null;
};
const times = (s: string) => {
    const rx = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const H: Date[] = []; let m: RegExpExecArray | null;
    while ((m = rx.exec(s))) {
        const mm = +m[1], dd = +m[2]; let yy = +m[3]; if (yy < 100) yy += 2000;
        let hh = +m[4]; const mn = +m[5]; const ap = m[6].toUpperCase();
        if (ap === "PM" && hh < 12) hh += 12; if (ap === "AM" && hh === 12) hh = 0; H.push(new Date(yy, mm - 1, dd, hh, mn));
    }
    return { depart: H[0], ret: H[1] };
};

export default async function xolaScraper(ctx: XolaCtx): Promise<Trip[]> {
    const landing = ctx?.landing ?? {};
    const url = ctx?.url ?? landing?.bookingUrl ?? landing?.scheduleUrl ?? landing?.website ?? landing?.websiteUrl;
    if (!url) throw new Error(`Xola: missing url for ${landing?.name ?? landing?.id ?? "unknown"}`);

    let browser: Browser | undefined; let page: Page | undefined = ctx.page;
    try {
        if (!page) { browser = await playwright.chromium.launch({ headless: true }); page = await browser.newPage(); }
        page.setDefaultTimeout(4000);

        await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
        await page.waitForTimeout(700);

        const parseScope = async (scope: Page): Promise<Trip[]> => {
            const trips: Trip[] = [];

            // H&M style blocks
            const blocks = scope.locator(".trip, .activity, .event, .listing, [class*='calendar'], section:has(a), li:has(a)");
            const n = await blocks.count();
            for (let i = 0; i < n; i++) {
                try {
                    const blk = blocks.nth(i);
                    const text = clean(await blk.textContent().catch(() => ""));
                    if (!text) continue;
                    const { depart, ret } = times(text);
                    if (!depart) continue;
                    const a = blk.locator("a[href*='xola'], a:has-text('Book'), a:has-text('Reserve')");
                    const href = (await a.count()) ? await a.first().getAttribute("href") : null;
                    const sourceUrl = href ? (href.startsWith("http") ? href : new URL(href, scope.url()).toString()) : scope.url();
                    const title = clean(text.split(/\n| - | \| /)[0] || "Trip");
                    const price = money(text);
                    trips.push({ title, departLocal: depart, returnLocal: ret ?? null, price: price ?? null, sourceUrl });
                } catch { }
            }
            if (trips.length) return trips;

            // Generic anchors/buttons
            const links = scope.locator("a[href*='xola'], a:has-text('Book'), a:has-text('Reserve'), button:has-text('Book'), button:has-text('Reserve')");
            const count = await links.count();
            for (let i = 0; i < count; i++) {
                try {
                    const link = links.nth(i);
                    const href = await link.getAttribute("href");
                    const sourceUrl = href ? (href.startsWith("http") ? href : new URL(href, scope.url()).toString()) : scope.url();
                    let text = (await link.textContent({ timeout: 800 }).catch(() => "")) ?? "";
                    if (!text) {
                        const card = link.locator("xpath=ancestor-or-self::*[self::li or self::article or contains(@class,'card') or contains(@class,'trip') or contains(@class,'event') or contains(@class,'calendar') or contains(@class,'activity')][1]");
                        text = (await card.first().textContent({ timeout: 1200 }).catch(() => "")) ?? "";
                    }
                    text = clean(text);
                    if (!text) continue;
                    const { depart, ret } = times(text);
                    if (!depart) continue;
                    const title = clean(text.split(/\n| - | \| /)[0] || "Trip");
                    const price = money(text);
                    trips.push({ title, departLocal: depart, returnLocal: ret ?? null, price: price ?? null, sourceUrl });
                } catch { }
            }
            if (trips.length) return trips;

            // JSON-LD events
            const scripts = scope.locator("script[type='application/ld+json']");
            const sc = await scripts.count();
            for (let i = 0; i < sc; i++) {
                try {
                    const raw = await scripts.nth(i).textContent();
                    if (!raw) continue;
                    const data = JSON.parse(raw);
                    const arr = Array.isArray(data) ? data : [data];
                    for (const node of arr) {
                        if (!node || node["@type"] !== "Event" || !node.startDate) continue;
                        const d = new Date(node.startDate); if (!isFinite(+d)) continue;
                        const r = node.endDate ? new Date(node.endDate) : null;
                        const title = clean(node.name || node.description || "Trip");
                        const price = node.offers?.price ? Number(node.offers.price) : null;
                        const href = node.url || scope.url();
                        trips.push({ title, departLocal: d, returnLocal: r, price: price ?? null, sourceUrl: href });
                    }
                } catch { }
            }
            return trips;
        };

        // main doc
        let out = await parseScope(page);
        // iframes (embedded Xola)
        if (!out.length) {
            for (const f of page.frames()) {
                if (f === page.mainFrame()) continue;
                try { const more = await parseScope(f as unknown as Page); if (more.length) { out = more; break; } } catch { }
            }
        }
        return out;
    } finally {
        if (!ctx.page) { await page?.close().catch(() => { }); await browser?.close().catch(() => { }); }
    }
}
