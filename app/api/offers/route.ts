import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { trips, landings, vessels, fareTiers, tripPromotions } from "@/schema";
import { OfferCardDTO } from "@/lib/trips-dto";

const todayIso = () => new Date().toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(60, Number(searchParams.get("limit") ?? 30));
    const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

    const filters = [
        sql`date(${trips.departLocal}) >= ${todayIso()}`,
        // keep “Trips” scoped to trips with at least one promotion
        sql`EXISTS (SELECT 1 FROM ${tripPromotions} tp WHERE tp.trip_id = ${trips.id})`,
        q ? or(ilike(landings.name, `%${q}%`), ilike(vessels.name, `%${q}%`)) : undefined,
    ].filter(Boolean) as any[];

    const rows = await db
        .select({
            tripId: trips.id,
            title: trips.title,
            landingName: landings.name,
            landingSlug: landings.slug,
            vesselName: vessels.name,
            vesselSlug: vessels.slug,

            departLocal: trips.departLocal,
            timezone: trips.timezone,
            status: trips.status,
            load: trips.load,
            spotsLeft: trips.spots,

            priceIncludesFees: trips.priceIncludesFees,
            serviceFeePctRaw: trips.serviceFeePct, // numeric -> comes back as string

            priceAdultMin: sql<number | null>`(
        SELECT MIN(${fareTiers.priceCents})
        FROM ${fareTiers}
        WHERE ${fareTiers.tripId} = ${trips.id} AND ${fareTiers.type} = 'ADULT'
      )`,
            priceAnyMin: sql<number | null>`(
        SELECT MIN(${fareTiers.priceCents})
        FROM ${fareTiers}
        WHERE ${fareTiers.tripId} = ${trips.id}
      )`,

            promoSummary: sql<string | null>`(
        SELECT ${tripPromotions.summary}
        FROM ${tripPromotions}
        WHERE ${tripPromotions.tripId} = ${trips.id}
        ORDER BY ${tripPromotions.id} ASC
        LIMIT 1
      )`,

            mealsIncl: trips.mealsIncl,
            permitsIncl: trips.permitsIncl,
            passportReq: trips.passportReq,
        })
        .from(trips)
        .innerJoin(landings, eq(trips.landingId, landings.id))
        .leftJoin(vessels, eq(trips.vesselId, vessels.id))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(asc(trips.departLocal))
        .limit(limit)
        .offset(offset);

    const data = rows.map((r) => {
        const depart =
            r.departLocal instanceof Date ? r.departLocal : new Date(String(r.departLocal));
        const priceFromCents = r.priceAdultMin ?? r.priceAnyMin ?? null;
        const serviceFeePct = r.serviceFeePctRaw == null ? null : Number(r.serviceFeePctRaw);

        const flags: string[] = [];
        if (r.mealsIncl) flags.push("Meals included");
        if (r.permitsIncl) flags.push("Permits included");
        if (r.passportReq) flags.push("Passport required");

        return OfferCardDTO.parse({
            tripId: r.tripId,
            title: r.title,
            landingName: r.landingName,
            landingSlug: r.landingSlug,
            vesselName: r.vesselName ?? undefined,
            vesselSlug: r.vesselSlug ?? undefined,

            departIso: depart.toISOString(),
            timezone: r.timezone || "America/Los_Angeles",
            status: r.status,
            spotsLeft: r.spotsLeft ?? null,
            load: r.load ?? null,

            priceFromCents,
            currency: "USD",
            priceIncludesFees: r.priceIncludesFees,
            serviceFeePct,

            promoSummary: r.promoSummary ?? undefined,
            flags,
        });
    });

    return NextResponse.json({ data });
}

