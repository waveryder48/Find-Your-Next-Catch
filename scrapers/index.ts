// scrapers/index.ts
import type { Page } from "playwright";
import { frnTableScraper } from "./frn-table";

export type ScheduleRow = {
    landingName: string;
    bookingUrl: string;
    notes?: string;
    source?: string;
};

const SCRAPERS = [frnTableScraper];

export function pickScraper(row: ScheduleRow) {
    return SCRAPERS.find((s: any) => typeof s.detect === "function" && s.detect(row)) ?? null;
}

export type LandingRef = { id: string; slug: string; name: string };
export type RunFn = (
    page: Page,
    landing: LandingRef,
    scheduleUrl: string,
    opts?: { headless?: boolean }
) => Promise<{ tripsUpserted: number }>;

export { frnTableScraper };
