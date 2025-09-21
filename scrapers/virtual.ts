import type { Page } from "playwright";
import type { ExtractedTrip } from "../lib/scrape-types";
export const name = "VIRTUAL" as const;

export function detect(url: string) {
    return /(\.pages\.|wix|squarespace|wordpress|webflow)/i.test(url);
}

export async function scrape(page: Page, url: string): Promise<ExtractedTrip[]> {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    return [];
}
