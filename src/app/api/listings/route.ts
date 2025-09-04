// src/app/api/listings/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function isProbablyUrl(raw?: string | null) {
    if (!raw) return false;
    const s = String(raw).trim();
    if (!/^https?:\/\//i.test(s) && /\s/.test(s)) return false;
    if (/\.[a-z]{2,}($|[\/?#])/i.test(s)) return true;
    return /^https?:\/\//i.test(s);
}
function toExternalUrlOrNull(raw?: string | null) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!isProbablyUrl(s)) return null;
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");

    const rows = await prisma.listing.findMany({
        take: Math.min(limit, 100),
        include: { provider: true, variants: true },
        orderBy: { createdAt: "desc" },
    });

    const value = rows.map((l) => ({
        ...l,
        sourceUrl: toExternalUrlOrNull(l.sourceUrl),
        provider: l.provider ? { ...l.provider, website: toExternalUrlOrNull(l.provider.website) } : null,
    }));

    return NextResponse.json({ ok: true, count: value.length, value });
}
