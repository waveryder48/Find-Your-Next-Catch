// scrapers/index.ts
// Unified scraper index that tolerates default or named exports for each engine.

export type ScraperCtx = {
    landing: any;
    url?: string;
    timezone?: string;
    verbose?: boolean;
    page?: any;
};
export type ScraperFn = (ctx: ScraperCtx) => Promise<any[]>;

// Import modules as namespaces so we can normalize their exports
import * as frnMod from "./frn";
import * as xolaMod from "./xola";
import * as virtualMod from "./virtual";
import * as fhMod from "./fareharbor";

// Optional re-export for callers that expect this symbol
export { scrapeFrnTable as frnTableScraper } from "./frn-table";

// Normalize each engine to a callable
export const scrapeFrn: ScraperFn =
    (frnMod as any).default ??
    (frnMod as any).scrapeFrn ??
    (frnMod as any).frnScraper;

export const scrapeXola: ScraperFn =
    (xolaMod as any).default ??
    (xolaMod as any).scrapeXola ??
    (xolaMod as any).xolaScraper;

export const scrapeVirtual: ScraperFn =
    (virtualMod as any).default ??
    (virtualMod as any).scrapeVirtual ??
    (virtualMod as any).virtualScraper;

export const scrapeFareHarbor: ScraperFn =
    (fhMod as any).default ??
    (fhMod as any).scrapeFareHarbor ??
    (fhMod as any).fareHarborScraper;

// Map hostnames to an engine
export function detectScraper(hostname: string): ScraperFn | null {
    const h = (hostname || "").toLowerCase();

    // FRN (FishingReservations.net) + FRN-backed sites
    if (
        h.includes("fishingreservations.net") ||
        h.includes("22ndstreet") ||
        h.includes("longbeach") ||
        h.includes("seaforth") ||
        h.includes("fishermanslanding") ||
        h.includes("pointlomasportfishing") ||
        h.includes("ciscos") ||
        h.includes("hooks.fishingreservations.net")
    ) return scrapeFrn;

    // FareHarbor
    if (h.includes("fareharbor") || h.includes("danawharf") || h.includes("daveyslocker"))
        return scrapeFareHarbor;

    // Xola
    if (h.includes("xola") || h.includes("hmlanding"))
        return scrapeXola;

    // Virtual Landing
    // scrapers/index.ts
    if (h.includes("virtuallanding") || h.includes("pierpoint") || h.includes("redondo"))
        return scrapeVirtual;


    return null;
}

// Also provide a default export (handy for some import styles)
const api = { detectScraper, scrapeFrn, scrapeXola, scrapeVirtual, scrapeFareHarbor };
export default api;
