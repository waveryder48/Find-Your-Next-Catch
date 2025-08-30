// src/app/api/scrape/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { load } from "cheerio";

export const runtime = "nodejs";           // required for cheerio
export const dynamic = "force-dynamic";    // don't cache

const Body = z.object({ url: z.string().url() });

export async function GET() {
    return NextResponse.json({ ok: true, hint: 'POST {"url":"https://example.com"}' });
}

export async function POST(req: Request) {
    const { url } = Body.parse(await req.json());

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

    const title = $("title").first().text().trim() || null;
    const links = Array.from(
        new Set(
            $("a[href]")
                .map((_, a) => {
                    const href = $(a).attr("href");
                    try { return href ? new URL(href, url).href : null; } catch { return null; }
                })
                .get()
        )
    )
        .filter(Boolean)
        .slice(0, 50);

    return NextResponse.json({ ok: true, url, title, links });
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
        },
    });
}
