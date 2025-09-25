// app/api/trips/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { trips, landings } from "@/db/schema";
import { and, gte, lte, like, eq, asc } from "drizzle-orm";

type Row = {
    id: string;
    title: string;
    source: string | null;
    sourceTripId: string | null;
    sourceUrl: string | null;
    departLocal: string;
    returnLocal: string | null;
    landingId: string;
    landingName: string | null;
};

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const landingId = searchParams.get("landingId")?.trim() || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? "100")));
    const offset = (page - 1) * limit;

    const whereParts: any[] = [gte(trips.departLocal, new Date())];
    if (q) whereParts.push(like(trips.title, `%${q}%`));
    if (landingId) whereParts.push(eq(trips.landingId, landingId));
    if (dateFrom) whereParts.push(gte(trips.departLocal, new Date(dateFrom)));
    if (dateTo) whereParts.push(lte(trips.departLocal, new Date(dateTo)));

    const rows = await db
        .select({
            id: trips.id,
            title: trips.title,
            source: (trips as any).source ?? null,
            sourceTripId: (trips as any).sourceTripId ?? (trips as any).source_trip_id ?? null,
            sourceUrl: (trips as any).sourceUrl ?? (trips as any).url ?? null,
            departLocal: trips.departLocal,
            returnLocal: trips.returnLocal,
            landingId: trips.landingId,
            landingName: landings.name,
        })
        .from(trips)
        .leftJoin(landings, eq(trips.landingId, landings.id))
        .where(whereParts.length ? (and as any)(...whereParts) : undefined)
        .groupBy(
            trips.id,
            trips.title,
            ((trips as any).source ?? trips.id),
            (((trips as any).sourceTripId ?? (trips as any).source_trip_id) ?? trips.id),
            (((trips as any).sourceUrl ?? (trips as any).url) ?? trips.id),
            trips.departLocal,
            trips.returnLocal,
            trips.landingId,
            landings.name
        )
        .orderBy(asc(trips.departLocal))
        .limit(limit)
        .offset(offset) as unknown as Row[];

    // In-memory dedup keyed by (source|source_trip_id); fall back to id if missing
    const seen = new Set<string>();
    const data = rows.filter((r) => {
        const key = (r.source && r.sourceTripId) ? `${r.source}|${r.sourceTripId}` : `id|${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).map((r) => ({
        id: r.id,
        title: r.title,
        sourceUrl: r.sourceUrl,
        depart_local: r.departLocal,
        return_local: r.returnLocal,
        landing: { id: r.landingId, name: r.landingName ?? "" },
    }));

    return NextResponse.json({ data, page, limit });
}
