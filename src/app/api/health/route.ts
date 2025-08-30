import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // optional: quick connectivity ping
        await prisma.$queryRaw`SELECT 1`;

        // run simple queries sequentially (avoid transaction with PgBouncer)
        const providers = await prisma.provider.count();
        const listings = await prisma.listing.count();
        const variants = await prisma.tripVariant.count();

        // show a redacted view of the DB host
        let info: any = {};
        try {
            const u = new URL(process.env.DATABASE_URL || "");
            info = { host: u.hostname, port: u.port, db: u.pathname.slice(1) };
        } catch { }

        return NextResponse.json({ ok: true, db: info, counts: { providers, listings, variants } });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    }
}
