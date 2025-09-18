import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trips, landings, vessels, fareTiers, tripPromotions } from "@/drizzle/schema";
import { and, eq, gte, lte, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const landingSlug = searchParams.get("landing") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    let landingId: string | undefined;
    if (landingSlug) {
        const l = await db.query.landings.findFirst({ where: (t, { eq }) => eq(t.slug, landingSlug), columns: { id: true } });
        if (!l) return NextResponse.json({ trips: [] });
        landingId = l.id;
    }

    const now = new Date();
    const where = and(
        landingId ? eq(trips.landingId, landingId) : undefined,
        from ? gte(trips.departLocal, new Date(`${from}T00:00:00`)) : gte(trips.departLocal, now),
        to ? lte(trips.departLocal, new Date(`${to}T23:59:59`)) : undefined
    );

    const base = await db.select({
        id: trips.id, title: trips.title, status: trips.status,
        departLocal: trips.departLocal, returnLocal: trips.returnLocal,
        source: trips.source, sourceUrl: trips.sourceUrl,
        priceIncludesFees: trips.priceIncludesFees, serviceFeePct: trips.serviceFeePct,
        load: trips.load, spots: trips.spots, notes: trips.notes,
        lastScrapedAt: trips.lastScrapedAt,
        landingName: landings.name, landingSlug: landings.slug,
        vesselName: vessels.name, vesselSlug: vessels.slug,
    })
        .from(trips)
        .innerJoin(landings, eq(landings.id, trips.landingId))
        .leftJoin(vessels, eq(vessels.id, trips.vesselId))
        .where(where)
        .orderBy(trips.departLocal)
        .limit(200);

    const tripIds = base.map(b => b.id);
    const [tiers, promos] = await Promise.all([
        tripIds.length ? db.select().from(fareTiers).where(inArray(fareTiers.tripId, tripIds)) : Promise.resolve([]),
        tripIds.length ? db.select().from(tripPromotions).where(inArray(tripPromotions.tripId, tripIds)) : Promise.resolve([]),
    ]);

    const tiersByTrip = new Map<string, any[]>(); for (const t of tiers) (tiersByTrip.get(t.tripId) ?? tiersByTrip.set(t.tripId, []).get(t.tripId)!).push(t);
    const promosByTrip = new Map<string, any[]>(); for (const p of promos) (promosByTrip.get(p.tripId) ?? promosByTrip.set(p.tripId, []).get(p.tripId)!).push(p);

    const tripsDto = base.map(b => ({
        id: b.id,
        title: b.title,
        status: b.status,
        departLocal: b.departLocal,
        returnLocal: b.returnLocal,
        sourceUrl: b.sourceUrl,
        priceIncludesFees: b.priceIncludesFees,
        serviceFeePct: b.serviceFeePct as any,
        load: b.load,
        spots: b.spots,
        notes: b.notes,
        lastScrapedAt: b.lastScrapedAt,
        landing: { name: b.landingName, slug: b.landingSlug },
        vessel: b.vesselName ? { name: b.vesselName, slug: b.vesselSlug! } : null,
        fareTiers: (tiersByTrip.get(b.id) ?? []).map(t => ({
            type: t.type, label: t.label, priceCents: t.priceCents, minAge: t.minAge, maxAge: t.maxAge, conditions: t.conditions
        })),
        promotions: (promosByTrip.get(b.id) ?? []).map(p => ({ slug: p.slug, summary: p.summary, appliesWhen: p.appliesWhen })),
    }));

    return NextResponse.json({ trips: tripsDto });
}
