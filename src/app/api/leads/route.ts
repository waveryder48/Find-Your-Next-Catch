
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';


import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/lib/db';

const LeadSchema = z.object({
  listingId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  partySize: z.number().int().optional(),
  date: z.string().optional(), // ISO
  utm: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const prisma = getPrisma();
  const payload: any = {
    listingId: parsed.data.listingId,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    partySize: parsed.data.partySize || null,
    date: parsed.data.date ? new Date(parsed.data.date) : null,
    utm: parsed.data.utm || null,
  };

  if (prisma) {
    const lead = await prisma.lead.create({ data: payload });
    return NextResponse.json({ ok: true, leadId: lead.id });
  } else {
    console.log('[LEAD]', payload);
    return NextResponse.json({ ok: true, leadId: 'mock' });
  }
}
