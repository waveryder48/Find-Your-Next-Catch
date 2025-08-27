import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/lib/db';

const IngestSchema = z.object({
  provider: z.object({
    name: z.string(),
    website: z.string().url(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    locationText: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  listing: z.object({
    title: z.string(),
    description: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    boatType: z.string().optional(),
    boatLengthFt: z.number().int().optional(),
    capacity: z.number().int().optional(),
    amenities: z.array(z.string()).optional(),
    species: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    sourceUrl: z.string().url(),
    canonicalUrl: z.string().url().optional(),
  }),
  variants: z
    .array(
      z.object({
        durationHours: z.number().int(),
        isPrivate: z.boolean().default(true),
        priceFrom: z.number().int(),
        priceUnit: z.enum(['trip', 'person']).default('trip'),
      })
    )
    .default([]),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = IngestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const prisma = getPrisma();

  // No DB yet? Log and succeed so the build doesn’t break.
  if (!prisma) {
    console.log('[INGEST]', parsed.data);
    return NextResponse.json({ ok: true, mode: 'mock' });
  }

  const { provider, listing, variants } = parsed.data;

  const prov = await prisma.provider.upsert({
    where: { website: provider.website },
    update: { ...provider },
    create: { ...provider },
  });

  const lst = await prisma.listing.upsert({
    where: { sourceUrl: listing.sourceUrl },
    update: { ...listing, providerId: prov.id },
    create: { ...listing, providerId: prov.id },
  });

  if (variants && variants.length) {
    await prisma.tripVariant.deleteMany({ where: { listingId: lst.id } });
    await prisma.tripVariant.createMany({
      data: variants.map((v) => ({ listingId: lst.id, ...v })),
    });
  }

  return NextResponse.json({ ok: true, providerId: prov.id, listingId: lst.id });
}
