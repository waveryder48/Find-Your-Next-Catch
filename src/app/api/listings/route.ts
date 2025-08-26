import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function GET() {
  const prisma = getPrisma();
  if (prisma) {
    const listings = await prisma.listing.findMany({
      include: { provider: true, variants: true },
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(listings);
  } else {
    const data = await import('@/lib/mockListings.json');
    return NextResponse.json(data.default);
  }
}
