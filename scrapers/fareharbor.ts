// scrapers/fareharbor.ts
import type { Page, Browser } from "playwright";
import playwright from "playwright";

export type Trip = {
    title: string;
    departLocal: Date;
    returnLocal?: Date | null;
    load?: number | null;
    spots?: number | null;
    status?: string | null;
    price?: number | null;
    type?: string | null;
    vesselId?: string | null;
    sourceUrl: string;
};

export type FareHarborCtx = { landing: any; url?: string; timezone?: string; verbose?: boolean; page?: Page };

const clean = (s?: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
const parseMoney = (s?: string | null): number | null => {
    if (!s) return null;
    const m = s.replace(/[, ]/g, "").match(/\$\s*([\d]+(?:\.\d{2})?)/);
    if (!m) return null;
    const v = Number(m[1]);
    return Number.isFinite(v) ? v : null;
};
const parseDates = (s: string): { depart?: Date; ret?: Date } => {
    const rx = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const hits: Date[] = []; let m: RegExpExecArray | null;
    while ((m = rx.exec(s))) {
        const mm = +m[1], dd = +m[2]; let yy = +m[3]; if (yy < 100) yy += 2000;
        let hh = +m[4]; const min = +m[5]; const ap = m[6].toUpperCase();
        if (ap === "PM" && hh < 12) hh += 12; if (ap === "AM" && hh === 12) hh = 0;
        hits.push(new Date(yy, mm - 1, dd, hh, min));
    }
    return { depart: hits[0], ret: hits[1] };
};

export default async function fareHarborScraper(ctx: FareHarborCtx): Promise<Trip[]> {
    const landing = ctx?.landing ?? {};
    const url0 =
        ctx?.url ?? landing?.bookingUrl ?? landing?.scheduleUrl ?? landing?.website ?? landing?.websiteUrl;
    if (!url0) throw new Error(`FareHarbor: missing url for ${landing?.name ?? landing?.id ?? "unknown"}`);

    let browser: Browser | undefined;
    let page: Page | undefined = ctx.page;

    try {
        if (!page) { browser = await playwright.chromium.launch({ headless: true }); page = await browser.newPage(); }
        page.setDefaultTimeout(4000);

        // Normalize to company /items/
        let target = url0;
        if (!/(fareharbor\.com|fh-sites\.com)/i.test(target)) {
            await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45_000 });
            await page.waitForTimeout(400);
            const fhA = await page.$("a[href*='fareharbor.com/'], a[href*='fh-sites.com/']");
            if (fhA) {
                const href = await fhA.getAttribute("href");
                if (href) target = href.startsWith("http") ? href : new URL(href, target).toString();
            }
            if (!/(fareharbor\.com|fh-sites\.com)/i.test(target)) {
                const emb = await page.$("script[src*='fareharbor.com/embeds']");
                if (emb) {
                    const src = await emb.getAttribute("src");
                    const slug = src?.match(/fareharbor\.com\/([^\/]+)\/embeds/i)?.[1];
                    if (slug) target = `https://fareharbor.com/${slug}/items/`;
                }
            }
        }
        const slug = target.match(/(?:fareharbor\.com|fh-sites\.com)\/([^\/]+)/i)?.[1];
        if (slug && !/\/items\//i.test(target)) target = `https://fareharbor.com/${slug}/items/`;

        await page.goto(target, { waitUntil: "networkidle", timeout: 60_000 });

        const parseScope = async (scope: Page): Promise<Trip[]> => {
            // wait for any sign of items/cards
            await Promise.race([
                scope.waitForSelector("a[href*='/book/'], .fh-card a[href], .activity-card a[href]", { timeout: 5000 }).catch(() => { }),
                scope.waitForSelector("script[type='application/ld+json']", { timeout: 5000 }).catch(() => { }),
            ]);

            const trips: Trip[] = [];

            // Anchor/card based
            const links = scope.locator([
                "a[href*='/book/']",
                ".fh-card a[href], .fh-item a[href], .tour-card a[href], .activity-card a[href]",
                "a[href*='/items/'][href*='/?']",
                "a[href*='/?full-items=']",
                "a:has-text('Book')",
                "a:has-text('Reserve')",
            ].join(", "));
            const count = await links.count();
            for (let i = 0; i < count; i++) {
                try {
                    const a = links.nth(i);
                    const href = await a.getAttribute("href");
                    if (!href) continue;
                    const sourceUrl = href.startsWith("http") ? href : new URL(href, scope.url()).toString();

                    const card = a.locator(
                        "xpath=ancestor-or-self::*[" +
                        "self::li or self::article or contains(@class,'card') or contains(@class,'item') or contains(@class,'listing') or contains(@class,'activity')" +
                        "][1]"
                    );

                    let text = "";
                    if (await card.count()) text = (await card.first().textContent({ timeout: 1200 }).catch(() => "")) ?? "";
                    if (!text) text = (await a.textContent({ timeout: 800 }).catch(() => "")) ?? "";
                    text = clean(text);
                    if (!text) continue;

                    const { depart, ret } = parseDates(text);
                    if (!depart) continue;
                    const title = clean(text.split(/[\n\.\–\|]/)[0] || "Trip");
                    const price = parseMoney(text);

                    trips.push({ title, departLocal: depart, returnLocal: ret ?? null, price: price ?? null, sourceUrl });
                } catch { }
            }

            // JSON-LD fallback
            if (trips.length === 0) {
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
            }

            return trips;
        };

        // main doc
        let out = await parseScope(page);
        // iframes
        if (!out.length) {
            for (const f of page.frames()) {
                if (f === page.mainFrame()) continue;
                try { out = await parseScope(f as unknown as Page); if (out.length) break; } catch { }
            }
        }

        if (ctx?.verbose) console.log(`[fareharbor] parsed ${out.length} at ${target}`);
        return out;
    } finally {
        if (!ctx.page) { await page?.close().catch(() => { }); await browser?.close().catch(() => { }); }
    }
}
