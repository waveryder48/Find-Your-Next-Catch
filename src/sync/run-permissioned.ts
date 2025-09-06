import { chromium } from "playwright";
import { load } from "cheerio";
import { PrismaClient } from "@prisma/client";
import type { PermissionedConfig } from "./permissioned-config";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function runPermissionedSync(cfg: PermissionedConfig) {
    // Verify permissions
    const src = await prisma.source.findUnique({ where: { id: cfg.sourceId } });
    if (!src) throw new Error("Source not found");
    if (!src.allowSync || src.status !== "ACTIVE") {
        throw new Error("Sync not allowed by this source.");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const detailUrls = new Set<string>();

    for (const path of cfg.listPaths) {
        const listUrl = new URL(path, cfg.baseUrl).toString();
        await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
        const links = await page.$$eval(cfg.listItemSelector, (els) =>
            els.map((el) => (el as HTMLAnchorElement).href).filter(Boolean)
        );
        const more = await page.$$eval(cfg.detailLinkSelector, (els) =>
            els.map((el) => (el as HTMLAnchorElement).href).filter(Boolean)
        );
        for (const href of [...links, ...more]) {
            const abs = new URL(href, listUrl).toString();
            detailUrls.add(abs);
        }
        if (cfg.throttleMs) await sleep(cfg.throttleMs);
    }

    let upserts = 0;

    for (const url of detailUrls) {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        const html = await page.content();
        const $ = load(html);

        // Extract *facts only*. Adjust selectors per operator approval.
        const boatName = $("h1").first().text().trim() || "Unknown Boat";
        const phone = $('[href^="tel:"]').first().attr("href")?.replace("tel:", "");
        const locationText = $('[data-location]').first().text().trim() || undefined;

        // Prices & durations are factual; confirm they allowedPrices=true before taking them (fallback to undefined)
        const allowPrices = src.allowPrices;
        const priceMatch = allowPrices ? (html.match(/(\$|USD)\s?(\d+(?:,\d{3})*(?:\.\d{2})?)/) || [])[2] : undefined;
        const priceUSD = priceMatch ? Number(priceMatch.replace(/,/g, "")) : undefined;

        const durationHours = (() => {
            const txt = $("body").text().toLowerCase();
            const m = txt.match(/(\d+(?:\.\d+)?)\s*hour/);
            return m ? Number(m[1]) : undefined;
        })();

        const bookingUrl =
            $('a:contains("Book"), a[href*="book"]').first().attr("href") ||
            $('a[href*="checkout"]').first().attr("href") ||
            url;

        const record = await prisma.listing.upsert({
            where: { bookingUrl: new URL(bookingUrl, url).toString() },
            update: {
                boatName,
                phone,
                locationText,
                durationHours,
                priceUSD,
                sourceDomain: new URL(cfg.baseUrl).origin,
                // DO NOT write photos/long descriptions unless allowed
            },
            create: {
                boatName,
                phone,
                locationText,
                durationHours,
                priceUSD,
                bookingUrl: new URL(bookingUrl, url).toString(),
                detailUrl: url,
                sourceDomain: new URL(cfg.baseUrl).origin,
                imageUrls: [],         // left empty unless allowPhotos = true and permitted
                description: undefined // left empty unless allowLongCopy = true and permitted
            },
        });

        // Link listing↔source
        await prisma.listingSource.upsert({
            where: { listingId_sourceId: { listingId: record.id, sourceId: cfg.sourceId } },
            create: { listingId: record.id, sourceId: cfg.sourceId, role: "PRIMARY" },
            update: { lastSeenAt: new Date() },
        });

        upserts++;
        if (cfg.throttleMs) await sleep(cfg.throttleMs);
    }

    // Stamp lastSyncAt
    await prisma.source.update({
        where: { id: cfg.sourceId },
        data: { lastSyncAt: new Date() },
    });

    await browser.close();
    return { upserts };
}
