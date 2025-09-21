import { NextRequest, NextResponse } from "next/server";
import { and, ilike, or, eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";              // <- adjust if your client lives elsewhere
import {
    trips, landings, vessels, fareTiers, tripPromotions,
} from "@/schema";                          // <- your pasted schema
import { TripCardDTO } from "@/lib/dto";

// utils
function hoursBetween(a: Date, b?: Date | null) {
    if (!b) return undefined;
    const ms = b.getTime() - a.getTime();
    return Math.max(1, Math.round(ms / (1000 * 60 * 60)));
}
function parseDateOnly(s?: string | null) {
    if (!s) return undefined;
    // Expect "YYYY-MM-DD"
    const date = new Date(s + "T00:00:00");
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") ?? "").trim();        // text: landing/vessel
    const date = parseDateOnly(searchParams.get("date"));  // YYYY-MM-DD
    const sort = (searchParams.get("sort") ?? "depart").toLowerCase(); // 'depart' | 'price'
    const status = (searchParams.get("status") ?? "").trim(); // optional
    const limit = Math.min(50, Number(searchParams.get("limit") ?? 30));
    const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

    const filters = [
        q ? or(ilike(landings.name, `%${q}%`), ilike(vessels.name, `%${q}%`)) : undefined,
        date ? eq(sql`date(${trips.departLocal})`, date.toISOString().slice(0, 10)) : undefined,
        status ? eq(trips.status, status) : undefined,
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
            returnLocal: trips.returnLocal,
            status: trips.status,
            load: trips.load,
            spotsLeft: trips.spots,

            priceIncludesFees: trips.priceIncludesFees,
            serviceFeePct: trips.serviceFeePct,
            source: trips.source,
            sourceUrl: trips.sourceUrl,

            // Prefer ADULT min, fallback to any min
            priceAdultMin: sql<number | null>`(
        SELECT MIN(${fareTiers.priceCents})
        FROM ${fareTiers}
        WHERE ${fareTiers.tripId} = ${trips.id}
          AND ${fareTiers.type} = 'ADULT'
      )`,
            priceAnyMin: sql<number | null>`(
        SELECT MIN(${fareTiers.priceCents})
        FROM ${fareTiers}
        WHERE ${fareTiers.tripId} = ${trips.id}
      )`,

            promoLabel: sql<string | null>`(
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
        .orderBy(
            sort === "price"
                ? asc(sql`COALESCE(
            (SELECT MIN(${fareTiers.priceCents}) FROM ${fareTiers} ft WHERE ft.trip_id = ${trips.id} AND ft.type = 'ADULT'),
            (SELECT MIN(${fareTiers.priceCents}) FROM ${fareTiers} ft WHERE ft.trip_id = ${trips.id}),
            2147483647
          )`)
                : asc(trips.departLocal)
        )
        .limit(limit)
        .offset(offset);

    const data = rows.map((r) => {
        const depart = r.departLocal instanceof Date ? r.departLocal : new Date(String(r.departLocal));
        const ret = r.returnLocal ? (r.returnLocal instanceof Date ? r.returnLocal : new Date(String(r.returnLocal))) : null;
        const durationHours = hoursBetween(depart, ret);
        const priceFromCents = r.priceAdultMin ?? r.priceAnyMin ?? null;

        // 👇 Coerce numeric(4,1) coming back as string -> number
        const serviceFeePctNum = r.serviceFeePct == null ? null : Number(r.serviceFeePct);

        const flags: string[] = [];
        if (r.mealsIncl) flags.push("Meals included");
        if (r.permitsIncl) flags.push("Permits included");
        if (r.passportReq) flags.push("Passport required");

        const badges: string[] = [];
        if (r.promoLabel) badges.push(r.promoLabel);

        return TripCardDTO.parse({
            tripId: r.tripId,
            title: r.title,
            landingName: r.landingName,
            landingSlug: r.landingSlug,
            vesselName: r.vesselName ?? undefined,
            vesselSlug: r.vesselSlug ?? undefined,

            departIso: depart.toISOString(),
            durationHours,

            status: r.status,
            spotsLeft: r.spotsLeft ?? null,
            load: r.load ?? null,

            priceFromCents,
            currency: "USD",
            priceIncludesFees: r.priceIncludesFees,
            serviceFeePct: serviceFeePctNum,     // ← use the coerced number

            badges,
            flags,
            source: r.source,
            sourceUrl: r.sourceUrl,
        });
    });


    return NextResponse.json({ data });
}

