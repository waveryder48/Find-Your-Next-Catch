// app/api/trips/route.ts
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
    try {
        const result: any = await db.execute(sql`
      SELECT
        t.id,
        t.title,
        t.depart_local,
        t.return_local,
        t.load,
        t.spots,
        t.price_includes_fees,
        t.notes,
        t.passport_req,
        v.name AS vessel_name,
        l.name AS landing_name,
        l.city AS landing_city,
        l.state AS landing_state
      FROM trips t
      LEFT JOIN vessels v ON v.id = t.vessel_id
      LEFT JOIN landings l ON l.id = t.landing_id
      WHERE t.depart_local >= NOW()
      ORDER BY t.depart_local ASC
      LIMIT 50
    `);

        const rows = result.rows ?? result;

        const data = rows.map((r: any) => ({
            id: r.id,
            title: r.title ?? "Trip",
            depart_local: r.depart_local,
            return_local: r.return_local,
            load: r.load ?? null,
            spots: r.spots ?? null,
            notes: r.notes ?? null,
            passport_req: r.passport_req ?? false,
            priceIncludesFees: r.price_includes_fees ?? false,
            vesselName: r.vessel_name ?? null,
            landing: {
                name: r.landing_name ?? null,
                city: r.landing_city ?? null,
                state: r.landing_state ?? null,
            }
        }));

        return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
    } catch (err: any) {
        console.error("[/api/trips] error:", err);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}
