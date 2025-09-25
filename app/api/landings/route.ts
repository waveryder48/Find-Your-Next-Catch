// app/api/landings/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { landings } from "@/db/schema";

export async function GET() {
    const rows = await db.select().from(landings).orderBy(landings.name);
    const data = rows.map(r => ({ id: (r as any).id, name: (r as any).name }));
    return NextResponse.json({ data });
}
