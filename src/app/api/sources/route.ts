import { NextResponse } from "next/server";
import { z } from "zod";
import { createSource } from "@/server/sources";

const Body = z.object({
    kind: z.enum(["INTAKE_FORM", "OPERATOR_PERMISSION", "PUBLIC_SYNC", "PARTNER_FEED"]),
    operatorName: z.string().min(1),
    contactEmail: z.string().email().optional(),
    operatorSiteUrl: z.string().url().optional(),
    proofText: z.string().optional(),
    proofUrl: z.string().url().optional(),
    permissions: z.object({
        allowFacts: z.boolean().optional(),
        allowPrices: z.boolean().optional(),
        allowPhotos: z.boolean().optional(),
        allowLongCopy: z.boolean().optional(),
        allowSync: z.boolean().optional(),
    }).optional(),
});

export async function POST(req: Request) {
    const json = await req.json();
    const data = Body.parse(json);
    const src = await createSource(data);
    return NextResponse.json(src);
}
