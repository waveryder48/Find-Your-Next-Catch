// src/lib/scrape.ts
import * as cheerio from "cheerio";

export async function fetchHtml(url: string) {
    const res = await fetch(url, { headers: { "user-agent": "FYNCbot/0.1 (+contact@example.com)" } });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
    return await res.text();
}

export async function parseCharterPage(html: string) {
    const $ = cheerio.load(html);
    const name = $("h1").first().text().trim() || $("meta[property='og:site_name']").attr("content");
    const description = $('meta[name="description"]').attr("content") || "";
    // Example heuristics—adjust per site:
    const variants = $(".trip, .product-card, .package").map((_i, el) => {
        const text = $(el).text();
        const duration = /(\d+)\s*h/.exec(text)?.[1];
        const price = /(\$|USD)\s?(\d+[.,]?\d*)/i.exec(text)?.[2];
        return {
            durationHours: duration ? parseInt(duration) : 8,
            isPrivate: /private/i.test(text),
            priceFrom: price ? Math.round(parseFloat(price.replace(",", "")) * 100) : 0,
            priceUnit: /per\s*person|pp/i.test(text) ? "person" : "trip",
        };
    }).get();

    return { name, description, variants };
}
