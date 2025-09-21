// scrapers/frn.ts
import type { Page } from "playwright";
import { scrapeFrnTableToDB } from "./frn-table";

type LandingRow = {
    id: string;
    slug: string;
    name: string;
    website?: string | null;
    timezone?: string | null;
    city?: string | null;
    state?: string | null;
};

export type FrnScrapeOpts = {
    timezone?: string;
    headless?: boolean;
    verbose?: boolean;
};

export async function scrapeFrn(
    page: Page,
    landing: LandingRow,
    scheduleUrl: string,
    opts: FrnScrapeOpts = {}
) {
    const res = await scrapeFrnTableToDB(page, landing, scheduleUrl, {
        timezone: opts.timezone || landing.timezone || "America/Los_Angeles",
        verbose: opts.verbose ?? true,
    });

    console.log(`[frn] table parsed=${res.rowsParsed} upserted=${res.tripsUpserted}`);
    return res;
}

export default scrapeFrn;
