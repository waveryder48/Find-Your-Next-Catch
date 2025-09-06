import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePreviewToken } from "@/server/sources";

const Body = z.object({
    sourceId: z.string().cuid(),
    listingId: z.number().int().optional(),
    ttlHours: z.number().int().min(1).max(168).optional(),
});

export async function POST(req: Request) {
    const data = Body.parse(await req.json());
    const pt = await generatePreviewToken(data.sourceId, data.listingId, data.ttlHours);
    return NextResponse.json({ token: pt.token, expiresAt: pt.expiresAt });
}
