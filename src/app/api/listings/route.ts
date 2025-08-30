// src/app/api/listings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const CreateListing = z.object({
  title: z.string().min(1),
  sourceUrl: z.string().url(),
  city: z.string().default(""),
  state: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const listings = await prisma.listing.findMany({
      include: { provider: true, variants: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ listings });
  } catch (e: any) {
    // expose details only when debug=1
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug");
    if (debug) {
      return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateListing.parse(body);

    const origin = new URL(parsed.sourceUrl).origin;
    const provider = await prisma.provider.upsert({
      where: { website: origin },
      update: { name: parsed.title },
      create: { name: parsed.title, website: origin },
    });

    const listing = await prisma.listing.upsert({
      where: { sourceUrl: parsed.sourceUrl },
      update: {
        title: parsed.title,
        description: parsed.description ?? null,
        city: parsed.city,
        state: parsed.state ?? null,
        providerId: provider.id,
      },
      create: {
        title: parsed.title,
        description: parsed.description ?? null,
        city: parsed.city,
        state: parsed.state ?? null,
        sourceUrl: parsed.sourceUrl,
        providerId: provider.id,
      },
    });

    return NextResponse.json({ ok: true, listing }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
