import { db } from "../db";
import { landings } from "../db/schema";
import * as scrapers from "../scrapers";
import { upsertTripOffers } from "../lib/scrape-upsert";

async function main() {
    const allLandings = await db.select().from(landings);

    for (const landing of allLandings) {
        const url = landing.websiteUrl;
        const hostname = new URL(url).hostname;
        const scraper = scrapers.detectScraper(hostname);

        if (!scraper) {
            console.warn(`No scraper for: ${hostname}`);
            continue;
        }

        console.log(`Scraping: ${hostname}`);
        try {
            const offers = await scraper({ landing });
            await upsertTripOffers(offers);
        } catch (err) {
            console.error(`Failed to scrape ${hostname}:`, err);
        }
    }

    console.log("✅ Sync complete");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
