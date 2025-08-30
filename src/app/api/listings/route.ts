// src/app/api/listings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   GET /api/listings
   ========================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

    const data = await prisma.listing.findMany({
      include: { provider: true, variants: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ ok: true, count: data.length, data });
  } catch (e: any) {
    console.error("GET /api/listings failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

/* =========================
   POST /api/listings
   (upsert by sourceUrl; optional providerWebsite; optional variants)
   ========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Minimal required fields
    const title: string = body.title;
    const sourceUrl: string = body.sourceUrl;
    const city: string = body.city;

    if (!title || !sourceUrl || !city) {
      return NextResponse.json(
        { ok: false, error: "title, sourceUrl, and city are required" },
        { status: 400 }
      );
    }

    // Optional provider resolution
    const providerWebsite: string | undefined = body.providerWebsite || body?.provider?.website;
    if (providerWebsite) {
      // upsert provider with website as unique
      await prisma.provider.upsert({
        where: { website: providerWebsite },
        create: {
          name: body?.provider?.name || providerWebsite,
          website: providerWebsite,
          phone: body?.provider?.phone,
          email: body?.provider?.email,
          locationText: body?.provider?.locationText,
        },
        update: {
          name: body?.provider?.name || undefined,
          phone: body?.provider?.phone,
          email: body?.provider?.email,
          locationText: body?.provider?.locationText,
        },
      });
    }

    // Upsert the listing by unique sourceUrl
    const upserted = await prisma.listing.upsert({
      where: { sourceUrl },
      create: {
        title,
        description: body.description,
        city,
        state: body.state,
        lat: body.lat,
        lng: body.lng,
        amenities: Array.isArray(body.amenities) ? body.amenities : [],
        species: Array.isArray(body.species) ? body.species : [],
        images: Array.isArray(body.images) ? body.images : [],
        sourceUrl,
        canonicalUrl: body.canonicalUrl,
        ...(providerWebsite
          ? { provider: { connect: { website: providerWebsite } } }
          : {}),
      },
      update: {
        title,
        description: body.description,
        city,
        state: body.state,
        lat: body.lat,
        lng: body.lng,
        amenities: Array.isArray(body.amenities) ? body.amenities : [],
        species: Array.isArray(body.species) ? body.species : [],
        images: Array.isArray(body.images) ? body.images : [],
        canonicalUrl: body.canonicalUrl,
        ...(providerWebsite
          ? { provider: { connect: { website: providerWebsite } } }
          : {}),
      },
      include: { provider: true, variants: true },
    });

    // Replace variants if provided
    if (Array.isArray(body.variants)) {
      await prisma.tripVariant.deleteMany({ where: { listingId: upserted.id } });

      if (body.variants.length > 0) {
        // Expect fields: durationHours (int), isPrivate (bool), priceFrom (int), priceUnit ("trip" | "person")
        await prisma.tripVariant.createMany({
          data: body.variants.map((v: any) => ({
            listingId: upserted.id,
            durationHours: Number(v.durationHours) || 0,
            isPrivate: Boolean(v.isPrivate),
            priceFrom: Number(v.priceFrom) || 0,
            priceUnit: v.priceUnit === "person" ? "person" : "trip",
          })),
        });
      }
    }

    const fresh = await prisma.listing.findUnique({
      where: { id: upserted.id },
      include: { provider: true, variants: true },
    });

    return NextResponse.json({ ok: true, data: fresh });
  } catch (e: any) {
    console.error("POST /api/listings failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
