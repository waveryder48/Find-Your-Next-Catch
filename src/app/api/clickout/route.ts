import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const listingId = url.searchParams.get('listingId');
  const target = url.searchParams.get('target');

  if (!listingId || !target) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const prisma = getPrisma();
  if (prisma) {
    await prisma.clickout.create({ data: { listingId, targetUrl: target, ref: url.searchParams.get('ref') || null } as any });
  } else {
    console.log('[CLICKOUT]', { listingId, target });
  }

  const redirectUrl = new URL(target);
  redirectUrl.searchParams.set('ref', 'reelfind');
  return NextResponse.redirect(redirectUrl.toString(), 302);
}
