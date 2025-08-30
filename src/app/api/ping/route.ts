// src/app/api/ping/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
    return NextResponse.json({ ok: true, pong: true, time: new Date().toISOString() });
}
