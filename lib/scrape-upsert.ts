// lib/scrape-upsert.ts — SQL UPsert on (source, source_trip_id)
import { randomUUID, createHash } from "node:crypto";
import { db } from "../db";
import { sql, lt } from "drizzle-orm";
import { trips as tripsTable } from "../db/schema"; // for cleanup only

// ---- helpers ----
function canonicalSourceTripId(
  source: string,
  sourceUrl: string,
  title: string,
  depart: Date
) {
  try {
    const u = new URL(sourceUrl);
    if (source === "FRN" || u.hostname.includes("fishingreservations")) {
      const id =
        u.searchParams.get("trip_id") ||
        u.searchParams.get("id") ||
        u.searchParams.get("tripId");
      if (id) return `frn:${id}`;
    }
  } catch { }
  return createHash("sha1")
    .update(`${source}|${sourceUrl}|${title}|${depart.toISOString()}`)
    .digest("hex")
    .slice(0, 32);
}

export type TripInput = {
  title: string;
  sourceUrl: string;
  departLocal: Date;
  returnLocal?: Date | null;
  vesselId?: string | null;
  status?: string | null;
  price?: number | null;
  type?: string | null;
};

// ---- UPSERT ----
export async function upsertTripAndTiers(opts: {
  landingId: string;
  vesselId: string | null;
  platform?: string; // FRN | FAREHARBOR | XOLA | VIRTUAL | OTHER
  trip: TripInput;
}) {
  const { landingId, vesselId, trip } = opts;
  if (!trip?.title || !trip?.sourceUrl || !trip?.departLocal) return;
  if (trip.type?.toLowerCase().includes("whale") || /whale\s*watch/i.test(trip.title)) return;

  // derive source from platform/url
  let source = "OTHER";
  const raw = (opts.platform ?? "").toLowerCase();
  if (raw.includes("frn") || raw.includes("fishingreservations")) source = "FRN";
  else if (raw.includes("fareharbor")) source = "FAREHARBOR";
  else if (raw.includes("xola") || raw.includes("hm")) source = "XOLA";
  else if (raw.includes("virtual")) source = "VIRTUAL";
  if (source === "OTHER") {
    try {
      const h = new URL(trip.sourceUrl).hostname.toLowerCase();
      if (h.includes("fishingreservations")) source = "FRN";
      else if (h.includes("fareharbor")) source = "FAREHARBOR";
      else if (h.includes("xola")) source = "XOLA";
      else if (h.includes("virtuallanding")) source = "VIRTUAL";
    } catch { }
  }

  const sourceTripId = canonicalSourceTripId(source, trip.sourceUrl, trip.title, trip.departLocal);
  const now = new Date();
  const statusVal = trip.status ?? "OPEN";
  const tzVal = "America/Los_Angeles";

  // explicit SQL upsert to guarantee ON CONFLICT behavior
  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO trips
      (id, landing_id, vessel_id, source, source_trip_id, source_url,
       title, status, timezone, depart_local, return_local, created_at, updated_at)
    VALUES
      (${id}, ${landingId}, ${vesselId}, ${source}, ${sourceTripId}, ${trip.sourceUrl},
       ${trip.title}, ${statusVal}, ${tzVal}, ${trip.departLocal}, ${trip.returnLocal ?? null},
       ${now}, ${now})
    ON CONFLICT (source, source_trip_id)
    DO UPDATE SET
      title        = EXCLUDED.title,
      return_local = EXCLUDED.return_local,
      status       = EXCLUDED.status,
      timezone     = EXCLUDED.timezone,
      updated_at   = EXCLUDED.updated_at;
  `);
}

// ---- cleanup (Drizzle) ----
export async function cleanupExpiredTrips() {
  const tAny = tripsTable as any;
  const departCol =
    tAny.departLocal ?? tAny.depart_local ?? tAny.departsAt ?? tAny.departs_at;
  if (!departCol) {
    console.warn("🧹 Skipping cleanup: no depart column found on trips table");
    return;
  }
  await db.delete(tripsTable).where(lt(departCol, new Date()));
  console.log("🧹 Expired trips removed");
}
