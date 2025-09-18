import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landings, vesselLandings } from "@/drizzle/schema";
import { sql, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
    const rows = await db.select({
        name: landings.name,
        slug: landings.slug,
        website: landings.website,
        vesselCount: sql<number>`count(${vesselLandings.vesselId})`,
    })
        .from(landings)
        .leftJoin(vesselLandings, eq(landings.id, vesselLandings.landingId))
        .groupBy(landings.id)
        .orderBy(landings.name);

    return NextResponse.json({ landings: rows });
}
