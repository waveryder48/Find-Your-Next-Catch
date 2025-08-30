// src/app/api/ingest/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const IngestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sourceUrl: z.string().url(),
  canonicalUrl: z.string().url().optional(),
  variants: z
    .array(
      z.object({
        durationHours: z.number().int().positive(),
        isPrivate: z.boolean().default(false),
        priceFrom: z.number().int().nonnegative(),
        priceUnit: z.enum(['trip', 'person']).default('trip'),
      })
    )
    .default([]),
});

export async function POST(req: Request) {
  try {
    // Optional auth for your crawler/ingester
    const apiKey = req.headers.get('x-api-key');
    if (process.env.INGEST_API_KEY && apiKey !== process.env.INGEST_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = IngestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // TODO: persist parsed.data to DB if desired
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error('Ingest error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
