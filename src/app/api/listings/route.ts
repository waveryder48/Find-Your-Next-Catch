import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";      // ensure Node runtime (not edge)
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = Number(searchParams.get("limit") ?? "50");

        const rows = await prisma.listing.findMany({
            take: Math.min(limit, 100),
            include: { provider: true, variants: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ ok: true, count: rows.length, value: rows });
    } catch (err) {
        console.error("API /api/listings error:", err);
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
    }
}
