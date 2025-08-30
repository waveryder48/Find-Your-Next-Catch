// src/app/api/scrape/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { load } from "cheerio";

export const runtime = "nodejs";           // Cheerio needs Node runtime
export const dynamic = "force-dynamic";    // never cache scrape results

const Body = z.object({ url: z.string().url() });

export async function GET() {
    // Handy ping so you can hit this in the browser
    return NextResponse.json({ ok: true, hint: 'POST {"url":"https://example.com"}' });
}

export async function POST(req: Request) {
    try {
        const { url } = Body.parse(await req.json());

        // Fetch the page
        const res = await fetch(url, {
            redirect: "follow",
            headers: {
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });
        if (!res.ok) {
            return NextResponse.json(
                { ok: false, status: res.status, statusText: res.statusText },
                { status: res.status }
            );
        }

        const html = await res.text();
        const $ = load(html);

        // Simple demo parse: page title + first 50 absolute links
        const title = $("title").first().text().trim() || null;
        const links = Array.from(
            new Set(
                $("a[href]")
                    .map((_, a) => {
                        const href = $(a).attr("href");
                        if (!href) return null;
                        try { return new URL(href, url).href; } catch { return null; }
                    })
                    .get()
            )
        )
            .filter(Boolean)
            .slice(0, 50);

        return NextResponse.json({ ok: true, url, title, links });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: String(e?.message || e) },
            { status: 400 }
        );
    }
}

// (Optional) allow browser preflight if you’ll call from the client
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204
