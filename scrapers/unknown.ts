import type { Page } from "playwright";
import type { ExtractedTrip } from "../lib/scrape-types";
export const name = "UNKNOWN" as const;
export function detect(_url: string) { return true; }
export async function scrape(_page: Page, _url: string): Promise<ExtractedTrip[]> { return []; }

export const unknownScraper = async ({ landing }: { landing: any }) => {
    console.warn(`No scraper implemented for landing: ${landing.name}`);
    return [];
};

