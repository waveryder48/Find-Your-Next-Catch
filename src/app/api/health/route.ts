// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET() {
    try {
        const [providers, listings, variants] = await Promise.all([
            prisma.provider.count(),
            prisma.listing.count(),
            prisma.tripVariant.count(),
        ]);
        return NextResponse.json({ ok: true, counts: { providers, listings, variants } });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    }
}
