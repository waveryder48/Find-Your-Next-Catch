// src/app/api/listings/[id]/variants/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const variants = await prisma.tripVariant.findMany({
        where: { listingId: params.id },
        orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ variants });
}
