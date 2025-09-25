// scrapers/frn-table.ts
import type { Page } from "playwright";

export type Trip = {
    title: string;
    departLocal: Date;
    returnLocal?: Date | null;
    load?: number | null;
    spots?: number | null;
    status?: string | null;
    price?: number | null;     // dollars
    type?: string | null;
    vesselId?: string | null;
    sourceUrl: string;         // booking URL (used for View Trip + sourceTripId)
};

function clean(s?: string | null) { return (s ?? "").replace(/\s+/g, " ").trim(); }
function parsePriceDollars(s?: string | null): number | null {
    if (!s) return null;
    const m = s.replace(/[, ]/g, "").match(/\$?\s*([\d]+(?:\.\d{2})?)/);
    if (!m) return null;
    const dollars = Number(m[1]);
    return Number.isFinite(dollars) ? dollars : null;
}
function parseDateTimes(text: string): { depart?: Date; ret?: Date } {
    const rx = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const hits: Date[] = [];
    let m: RegExpExecArray | null;
    while ((m = rx.exec(text))) {
        const mm = Number(m[1]), dd = Number(m[2]);
        let yyyy = Number(m[3]); if (yyyy < 100) yyyy += 2000;
        let hh = Number(m[4]); const min = Number(m[5]); const ap = m[6].toUpperCase();
        if (ap === "PM" && hh < 12) hh += 12;
        if (ap === "AM" && hh === 12) hh = 0;
        hits.push(new Date(yyyy, mm - 1, dd, hh, min));
    }
    return { depart: hits[0], ret: hits[1] };
}

export async function scrapeFrnTable(page: Page, scheduleUrl: string): Promise<Trip[]> {
    await page.goto(scheduleUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector("tr", { timeout: 10_000 }).catch(() => { });

    const tr = page.locator("tr");
    const n = await tr.count();
    const trips: Trip[] = [];
    const seenTripIds = new Set<string>(); // ⬅️ dedup by FRN trip_id

    for (let i = 0; i < n; i++) {
        const row = tr.nth(i);
        const text = clean(await row.textContent().catch(() => ""));
        if (!text) continue;
        if (/whale\s*watch/i.test(text)) continue;

        // Prefer FRN's booking URL with trip_id; then /book/; then sales; then any link
        let href: string | null = null;
        const pref = row.locator("a[href*='user.php?trip_id=']");
        const book = row.locator("a[href*='/book/']");
        const sales = row.locator("a[href*='sales']");
        const any = row.locator("a[href]");

        if (await pref.count()) href = await pref.first().getAttribute("href");
        else if (await book.count()) href = await book.first().getAttribute("href");
        else if (await sales.count()) href = await sales.first().getAttribute("href");
        else if (await any.count()) href = await any.first().getAttribute("href");

        const absHref = href ? (href.startsWith("http") ? href : new URL(href, scheduleUrl).toString()) : null;

        // 🔒 scrape-level dedup: skip if we’ve already seen this trip_id
        if (absHref) {
            try {
                const u = new URL(absHref);
                if (u.hostname.includes("fishingreservations")) {
                    const tid = u.searchParams.get("trip_id");
                    if (tid) {
                        const key = `frn:${tid}`;
                        if (seenTripIds.has(key)) continue;
                        seenTripIds.add(key);
                    }
                }
            } catch { }
        }

        // Price from any cell
        const cells = row.locator("td,th");
        const c = await cells.count();
        const cellTexts: string[] = [];
        for (let j = 0; j < c; j++) cellTexts.push(clean(await cells.nth(j).textContent().catch(() => "")));
        const priceText = cellTexts.find((t) => /\$\s*\d/.test(t)) ?? "";

        const { depart, ret } = parseDateTimes(text);
        if (!depart) continue;

        const price = parsePriceDollars(priceText);

        trips.push({
            title: text,
            departLocal: depart,
            returnLocal: ret ?? null,
            price: price ?? null,
            sourceUrl: absHref ?? scheduleUrl,
        });
    }

    return trips;
}
