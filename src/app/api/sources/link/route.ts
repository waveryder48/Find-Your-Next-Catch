import { NextResponse } from "next/server";
import { z } from "zod";
import { linkListingToSource } from "@/server/sources";

const Body = z.object({
    listingId: z.number().int(),
    sourceId: z.string().cuid(),
    role: z.enum(["PRIMARY", "SECONDARY", "MANUAL"]).optional(),
    notes: z.string().optional(),
});

export async function POST(req: Request) {
    const data = Body.parse(await req.json());
    const ls = await linkListingToSource(data.listingId, data.sourceId, data.role, data.notes);
    return NextResponse.json(ls);
}
