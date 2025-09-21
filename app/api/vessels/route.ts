import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landings, vessels, vesselLandings } from "@/drizzle/schema";
import { and, eq, ilike, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function toInt(v: string | null, d: number, min = 1, max = 100) { const n = v ? parseInt(v) : NaN; return Number.isNaN(n) ? d : Math.min(Math.max(n, min), max); }

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const landingSlug = searchParams.get("landing");
    const q = searchParams.get("q")?.trim() || "";
    const page = toInt(searchParams.get("page"), 1, 1, 10_000);
    const per = toInt(searchParams.get("per"), 24, 1, 100);
    const offset = (page - 1) * per;

    let landingId: string | undefined;
    if (landingSlug) {
        const l = await db.query.landings.findFirst({ where: (t, { eq }) => eq(t.slug, landingSlug), columns: { id: true } });
        if (!l) return NextResponse.json({ meta: { page, per, total: 0, totalPages: 1 }, vessels: [] });
        landingId = l.id;
    }

    const whereV = and(
        q ? ilike(vessels.name, `%${q}%`) : undefined,
        landingId ? sql`exists (select 1 from ${vesselLandings} vl where vl.vessel_id = ${vessels.id} and vl.landing_id = ${landingId})` : undefined,
    );

    const [totalRow] = await db.select({ c: sql<number>`count(*)` }).from(vessels).where(whereV);
    const total = Number(totalRow?.c ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / per));

    const base = await db.select({
        id: vessels.id, name: vessels.name, slug: vessels.slug, primaryWebsite: vessels.primaryWebsite,
    })
        .from(vessels)
        .where(whereV)
        .orderBy(vessels.name)
        .limit(per)
        .offset(offset);

    const ids = base.map(b => b.id);
    const links = ids.length
        ? await db.select({
            vesselId: vesselLandings.vesselId,
            vesselPageUrl: vesselLandings.vesselPageUrl,
            landingName: landings.name,
            landingSlug: landings.slug,
        })
            .from(vesselLandings)
            .innerJoin(landings, eq(landings.id, vesselLandings.landingId))
            .where(inArray(vesselLandings.vesselId, ids))
        : [];

    const byVessel = new Map<string, any>();
    for (const b of base) byVessel.set(b.id, { name: b.name, slug: b.slug, primaryWebsite: b.primaryWebsite, landings: [] as any[] });
    for (const lnk of links) byVessel.get(lnk.vesselId)?.landings.push({ landing: { name: lnk.landingName, slug: lnk.landingSlug }, vesselPageUrl: lnk.vesselPageUrl });

    return NextResponse.json({
        meta: { page, per, total, totalPages, landing: landingSlug, q },
        vessels: Array.from(byVessel.values()),
    });
}

