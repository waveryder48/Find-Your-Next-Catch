// src/app/api/scrape/route.ts
import { NextResponse } from "next/server";
import { fetchHtml, parseCharterPage } from "@/lib/scrape";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { url, canonicalUrl } = await req.json();
        if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

        // robots.txt check (very light)
        const robots = new URL("/robots.txt", url).toString();
        try {
            const r = await fetch(robots);
            if (r.ok) {
                const txt = await r.text();
                if (/Disallow:\s*\/\s*$/i.test(txt)) {
                    return NextResponse.json({ error: "Blocked by robots.txt" }, { status: 403 });
                }
            }
        } catch { /* ignore if missing */ }

        const html = await fetchHtml(url);
        const parsed = await parseCharterPage(html);

        // forward to ingest (or call directly if you prefer)
        const ingestRes = await fetch(`${process.env.NEXTAUTH_URL}/api/ingest`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": process.env.INGEST_API_KEY ?? "" },
            body: JSON.stringify({ ...parsed, sourceUrl: url, canonicalUrl }),
        });
        const data = await ingestRes.json();
        return NextResponse.json({ ok: true, data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message ?? "scrape failed" }, { status: 500 });
    }
}
