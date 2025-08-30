// src/app/api/listings/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const UpdateListing = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const listing = await prisma.listing.findUnique({
        where: { id: params.id },
        include: { provider: true, variants: true },
    });
    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ listing });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        const data = UpdateListing.parse(body);
        const listing = await prisma.listing.update({
            where: { id: params.id },
            data,
        });
        return NextResponse.json({ ok: true, listing });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    await prisma.listing.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
}
