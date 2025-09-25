// scrapers/virtual.ts — robust Virtual Landing (no freezes)
import type { Page, Browser } from "playwright";
import playwright from "playwright";

export type Trip = { title: string; departLocal: Date; returnLocal?: Date | null; price?: number | null; sourceUrl: string; };
export type VirtualCtx = { landing: any; url?: string; timezone?: string; verbose?: boolean; page?: Page };

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
const withTimeout = async <T>(p: Promise<T>, ms: number): Promise<T | null> =>
    (await Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), ms))])) as any;

export default async function virtualScraper(ctx: VirtualCtx): Promise<Trip[]> {
    const landing = ctx?.landing ?? {};
    let startUrl =
        ctx?.url ?? landing?.bookingUrl ?? landing?.scheduleUrl ?? landing?.website ?? landing?.websiteUrl ?? null;

    if (!startUrl) {
        const nm = (landing?.name ?? "").toLowerCase();
        if (nm.includes("pierpoint")) startUrl = "https://pierpoint.virtuallanding.com/";
        if (nm.includes("redondo")) startUrl = "https://redondo.virtuallanding.com/";
        if (nm.includes("ventura")) startUrl = "https://ventura.virtuallanding.com/";
    }
    if (!startUrl) throw new Error(`Virtual: missing url for ${landing?.name ?? landing?.id ?? "unknown"}`);

    let browser: Browser | undefined;
    let page: Page | undefined = ctx.page;

    try {
        if (!page) {
            browser = await playwright.chromium.launch({ headless: true });
            page = await browser.newPage();
            // avoid heavy assets that cause hangs
            await page.route("**/*", (route) => {
                const t = route.request().resourceType();
                if (t === "image" || t === "media" || t === "font" || t === "stylesheet") return route.abort();
                return route.continue();
            });
        }
        page.setDefaultTimeout(4000);

        const collect = async (scope: Page): Promise<Trip[]> => {
            // A) tables
            const table = scope.locator("table#schedule, table.schedule, table");
            let rows = table.locator("tr");
            let n = await rows.count();

            // B) list-style
            if (n === 0) { rows = scope.locator(".schedule-row, .trip-row, .event-row, li:has(a), .event, .trip, .schedule-item, .row"); n = await rows.count(); }

            // C) expanders
            if (n === 0) {
                const btn = scope.locator("a:has-text('Schedule'), button:has-text('Schedule'), a:has-text('Trips'), button:has-text('Trips')");
                if (await btn.count()) await btn.first().click({ timeout: 1000 }).catch(() => { });
                rows = scope.locator("table tr, .schedule-row, .trip-row, .event-row, li:has(a)");
                n = await rows.count();
            }

            const out: Trip[] = [];
            for (let i = 0; i < n; i++) {
                try {
                    const row = rows.nth(i);
                    const text = clean(await row.textContent().catch(() => ""));
                    if (!text) continue;
                    if (/whale\s*watch/i.test(text)) continue;

                    // link
                    let href: string | null = null;
                    const a1 = row.locator("a[href*='book']");
                    const a2 = row.locator("a[href]");
                    if (await a1.count()) href = await a1.first().getAttribute("href");
                    else if (await a2.count()) href = await a2.first().getAttribute("href");
                    const sourceUrl = href ? (href.startsWith("http") ? href : new URL(href, scope.url()).toString()) : scope.url();

                    // title + price
                    const cells = row.locator("td, th, .cell, .col, > *");
                    const c = await cells.count();
                    let title = ""; let price: number | null = null;
                    for (let j = 0; j < c; j++) {
                        const t = clean(await cells.nth(j).textContent().catch(() => ""));
                        if (!t) continue;
                        if (!title && !/\d{1,2}[/-]\d{1,2}/.test(t)) title = t;
                        if (price == null) {
                            const m = t.replace(/[, ]/g, "").match(/\$\s*([\d]+(?:\.\d{2})?)/);
                            if (m) price = Number(m[1]);
                        }
                    }
                    title ||= text.split(" - ")[0] || "Trip";

                    const { depart, ret } = times(text);
                    if (!depart) continue;

                    out.push({ title, departLocal: depart, returnLocal: ret ?? null, price, sourceUrl });
                } catch { }
            }
            return out;
        };

        const parsePageWithFrames = async (url: string): Promise<Trip[]> => {
            await withTimeout(page!.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }), 22000);
            await page!.waitForTimeout(500);
            let trips = (await withTimeout(collect(page!), 4000)) ?? [];
            if (!trips.length) {
                for (const f of page!.frames()) {
                    if (f === page!.mainFrame()) continue;
                    const sub = await withTimeout(collect(f as unknown as Page), 3500);
                    if (sub && sub.length) { trips = sub; break; }
                }
            }
            return trips;
        };

        // 1) main page
        let trips = await parsePageWithFrames(startUrl);
        if (trips.length) return trips;

        // 2) depth-1 same-host likely links
        const anchors = page.locator("a[href]");
        const nA = await anchors.count();
        const host = new URL(startUrl).host;
        const found: string[] = [];
        for (let i = 0; i < nA && found.length < 50; i++) {
            const href = await anchors.nth(i).getAttribute("href");
            if (!href) continue;
            const abs = href.startsWith("http") ? href : new URL(href, startUrl).toString();
            try {
                const u = new URL(abs);
                if (u.host === host && /schedule|trip|calendar|book|reserve/i.test(abs)) found.push(abs);
            } catch { }
        }
        const origin = new URL(startUrl).origin;
        const candidates = Array.from(new Set([`${origin}/schedule`, `${origin}/schedules`, `${origin}/trips`, `${origin}/calendar`, ...found])).slice(0, 10);

        for (const u of candidates) {
            const got = await withTimeout(parsePageWithFrames(u), 12000);
            if (got && got.length) return got;
        }

        if (ctx?.verbose) console.log(`[virtual] parsed 0 for ${landing?.name ?? "unknown"} at ${startUrl}`);
        return [];
    } finally {
        if (!ctx.page) { await page?.close().catch(() => { }); await browser?.close().catch(() => { }); }
    }
}
