// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // No $queryRaw (prepared statements can trip PgBouncer)
        const providers = await prisma.provider.count();
        const listings = await prisma.listing.count();
        const variants = await prisma.tripVariant.count();

        let info: any = {};
        try {
            const u = new URL(process.env.DATABASE_URL || "");
            info = { host: u.hostname, port: u.port, db: u.pathname.slice(1) };
        } catch { }

        return NextResponse.json({ ok: true, db: info, counts: { providers, listings, variants } });
    } catch (e: any) {
        console.error("/api/health failed:", e);
        return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
    }
}
