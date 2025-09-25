// scrapers/discovery.ts
import type { Page, Browser } from "playwright";
import playwright from "playwright";

export type Discovered = { platform: "FRN" | "FAREHARBOR" | "XOLA" | "VIRTUAL" | "OTHER"; url: string };

const isHttp = (s: string) => /^https?:\/\//i.test(s);
const abs = (base: string, maybe: string) => (isHttp(maybe) ? maybe : new URL(maybe, base).toString());

// known landing→slug fixes
const FH_KNOWN: Record<string, string> = {
    "Marina Del Rey Sportfishing": "mdrsf",
    "Davey's Locker": "daveyslocker",
    "Dana Wharf Sportfishing": "danawharf",
};

export async function discover(landingName: string, startUrl: string, verbose = false): Promise<Discovered | null> {
    let browser: Browser | undefined;
    let page: Page | undefined;
    try {
        browser = await playwright.chromium.launch({ headless: true });
        page = await browser.newPage();
        page.setDefaultTimeout(3500);

        // If it's clearly one of the booking domains, canonicalize directly
        if (/fishingreservations\.net/i.test(startUrl)) {
            const u = new URL(startUrl);
            if (!/\/sales/i.test(u.pathname) && !/user\.php/i.test(u.pathname)) {
                const sub = u.hostname.split(".")[0];
                return { platform: "FRN", url: `https://${sub}.fishingreservations.net/sales/` };
            }
            return { platform: "FRN", url: startUrl };
        }
        if (/virtuallanding\.com/i.test(startUrl)) {
            return { platform: "VIRTUAL", url: startUrl };
        }
        if (/fareharbor\.com|fh-sites\.com/i.test(startUrl)) {
            const slug = startUrl.match(/(?:fareharbor\.com|fh-sites\.com)\/([^\/]+)/i)?.[1];
            return { platform: "FAREHARBOR", url: slug ? `https://fareharbor.com/${slug}/items/` : startUrl };
        }

        // Marketing page: scan for anchors/scripts
        await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await page.waitForTimeout(500);

        // FRN
        const frnA = await page.$("a[href*='fishingreservations.net/']");
        if (frnA) {
            const href = await frnA.getAttribute("href");
            if (href) {
                const u = new URL(abs(startUrl, href));
                const sub = u.hostname.split(".")[0];
                return { platform: "FRN", url: `https://${sub}.fishingreservations.net/sales/` };
            }
        }

        // FareHarbor: (1) known landing → slug
        const knownSlug = FH_KNOWN[landingName];
        if (knownSlug) {
            return { platform: "FAREHARBOR", url: `https://fareharbor.com/${knownSlug}/items/` };
        }

        // FareHarbor: (2) anchors with explicit slug
        const fhAs = await page.$$eval("a[href*='fareharbor.com/'], a[href*='fh-sites.com/']", els =>
            els.map(a => (a as HTMLAnchorElement).href)
        ).catch(() => []);
        for (const href of fhAs ?? []) {
            const m = href.match(/(?:fareharbor\.com|fh-sites\.com)\/([^\/]+)/i);
            if (m?.[1]) return { platform: "FAREHARBOR", url: `https://fareharbor.com/${m[1]}/items/` };
        }

        // FareHarbor: (3) embed script
        const embSrc = await page.$eval("script[src*='fareharbor.com/embeds']", s => s.getAttribute("src")).catch(() => null);
        if (embSrc) {
            const m = embSrc.match(/fareharbor\.com\/([^\/]+)\/embeds/i);
            if (m?.[1]) return { platform: "FAREHARBOR", url: `https://fareharbor.com/${m[1]}/items/` };
        }

        // Xola
        const xolaA = await page.$("a[href*='xola']");
        if (xolaA) {
            const href = await xolaA.getAttribute("href");
            if (href) return { platform: "XOLA", url: abs(startUrl, href) };
        }

        // Virtual Landing
        const vlA = await page.$("a[href*='virtuallanding.com/']");
        if (vlA) {
            const href = await vlA.getAttribute("href");
            if (href) return { platform: "VIRTUAL", url: abs(startUrl, href) };
        }

        // Heuristic by name (Virtual)
        const nm = landingName.toLowerCase();
        if (nm.includes("pierpoint")) return { platform: "VIRTUAL", url: "https://pierpoint.virtuallanding.com/" };
        if (nm.includes("redondo")) return { platform: "VIRTUAL", url: "https://redondo.virtuallanding.com/" };
        if (nm.includes("ventura")) return { platform: "VIRTUAL", url: "https://ventura.virtuallanding.com/" };

        return null;
    } catch {
        return null;
    } finally {
        await page?.close().catch(() => { });
        await browser?.close().catch(() => { });
    }
}
