// scripts/import-schedule.ts
// Imports schedule rows into trips + fare_tiers (+ optional promotions).
// Idempotent on (source, source_trip_id). Replaces fare tiers each run.

import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

import xlsx from "xlsx";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import {
    landings, vessels, trips, fareTiers, tripPromotions,
} from "@/schema";
// add to both scripts (above main)
import fs from "node:fs";

function resolveFirstExisting(paths: string[]) {
    for (const p of paths) {
        if (p && fs.existsSync(p)) return p;
    }
    return "";
}


const toBool = (v: any) => {
    const s = (v ?? "").toString().trim().toLowerCase();
    return ["1", "y", "yes", "true", "t"].includes(s);
};
const toInt = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
};
const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};
const parseDate = (v: any) => {
    // XLSX may provide excel date numbers or ISO-like strings
    if (typeof v === "number") {
        // Excel epoch (days since 1899-12-30)
        const ms = Math.round((v - 25569) * 86400 * 1000);
        return new Date(ms);
    }
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
};
const slugify = (s: string) =>
    s?.toString()?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 256) || "";

// find by slug helper
async function findLandingBySlug(slug: string) {
    const res = await db.select().from(landings).where(eq(landings.slug, slug)).limit(1);
    return res[0];
}
async function findVesselBySlug(slug: string) {
    const res = await db.select().from(vessels).where(eq(vessels.slug, slug)).limit(1);
    return res[0];
}

async function upsertTrip(row: any) {
    const source = (row.source ?? "OTHER").toString().toUpperCase() as "FR" | "HM" | "OTHER";
    const sourceTripId = (row.source_trip_id ?? row.source_id ?? row.trip_id ?? "").toString().trim();
    if (!sourceTripId) throw new Error("Missing source_trip_id");

    // landing
    let landing = null as any;
    if (row.landing_slug) landing = await findLandingBySlug(String(row.landing_slug));
    if (!landing && row.landing_name) {
        // create landing if not exists (fallback)
        landing = await (async () => {
            const name = String(row.landing_name);
            const slug = slugify(row.landing_slug || name);
            const website = String(row.landing_website || "https://example-landing.test");
            const found = await db.select().from(landings).where(eq(landings.slug, slug)).limit(1);
            if (found[0]) return found[0];
            const obj = { id: randomUUID(), name, slug, website };
            await db.insert(landings).values(obj);
            return obj;
        })();
    }
    if (!landing) throw new Error(`Landing not found for row ${source}:${sourceTripId}`);

    // vessel (optional)
    let vesselId: string | null = null;
    if (row.vessel_slug) {
        const v = await findVesselBySlug(String(row.vessel_slug));
        if (v) vesselId = v.id;
    }

    const title = String(row.title ?? "Trip");
    const departLocal = parseDate(row.depart_local ?? row.depart);
    const returnLocal = parseDate(row.return_local ?? row.return);
    const timezone = String(row.timezone || "America/Los_Angeles");
    const status = String(row.status || "OPEN");
    const load = toInt(row.load);
    const spots = toInt(row.spots);
    const priceIncludesFees = toBool(row.price_includes_fees);
    const serviceFeePct = toNum(row.service_fee_pct);

    const notes = row.notes ? String(row.notes) : null;
    const mealsIncl = toBool(row.meals_incl);
    const permitsIncl = toBool(row.permits_incl);
    const passportReq = toBool(row.passport_req);

    const sourceUrl = String(row.source_url || row.url || "https://example-source.test");

    if (!departLocal) throw new Error(`Invalid depart_local for ${source}:${sourceTripId}`);

    // UPSERT on (source, source_trip_id)
    const tripId = randomUUID();
    await db.execute(sql`
    INSERT INTO "trips" (
      "id","source","source_trip_id","source_url",
      "landing_id","vessel_id",
      "title","notes",
      "passport_req","meals_incl","permits_incl",
      "depart_local","return_local","timezone",
      "load","spots","status",
      "price_includes_fees","service_fee_pct",
      "created_at","updated_at"
    ) VALUES (
      ${tripId}, ${source}, ${sourceTripId}, ${sourceUrl},
      ${landing.id}, ${vesselId},
      ${title}, ${notes},
      ${mealsIncl}, ${mealsIncl}, ${permitsIncl},
      ${departLocal}, ${returnLocal}, ${timezone},
      ${load}, ${spots}, ${status},
      ${priceIncludesFees}, ${serviceFeePct},
      NOW(), NOW()
    )
    ON CONFLICT ("source","source_trip_id") DO UPDATE SET
      "source_url" = EXCLUDED."source_url",
      "landing_id" = EXCLUDED."landing_id",
      "vessel_id" = EXCLUDED."vessel_id",
      "title" = EXCLUDED."title",
      "notes" = EXCLUDED."notes",
      "passport_req" = EXCLUDED."passport_req",
      "meals_incl" = EXCLUDED."meals_incl",
      "permits_incl" = EXCLUDED."permits_incl",
      "depart_local" = EXCLUDED."depart_local",
      "return_local" = EXCLUDED."return_local",
      "timezone" = EXCLUDED."timezone",
      "load" = EXCLUDED."load",
      "spots" = EXCLUDED."spots",
      "status" = EXCLUDED."status",
      "price_includes_fees" = EXCLUDED."price_includes_fees",
      "service_fee_pct" = EXCLUDED."service_fee_pct",
      "updated_at" = NOW()
    RETURNING "id"
  `).then((res: any) => {
        // @ts-expect-error pg rows
        if (res.rows?.[0]?.id) (row as any).__trip_id = res.rows[0].id as string;
    });

    const id: string = (row as any).__trip_id ?? tripId;

    // Replace fare tiers for this trip (idempotent)
    await db.execute(sql`DELETE FROM "fare_tiers" WHERE "trip_id" = ${id}`);

    const adultCents = toInt(row.price_adult_cents ?? row.adult_cents ?? row.price_cents);
    const juniorCents = toInt(row.price_junior_cents ?? row.child_cents);

    const tiers: Array<{ type: "ADULT" | "JUNIOR"; label: string; priceCents: number }> = [];
    if (adultCents != null) tiers.push({ type: "ADULT", label: "Adult", priceCents: adultCents });
    if (juniorCents != null) tiers.push({ type: "JUNIOR", label: "Junior", priceCents: juniorCents });

    if (tiers.length) {
        await db.insert(fareTiers).values(
            tiers.map(t => ({
                id: randomUUID(),
                tripId: id,
                type: t.type,
                label: t.label,
                priceCents: t.priceCents,
                currency: "USD",
            }))
        );
    }

    // Optional promo
    const promoSummary = (row.promo_summary ?? row.promotion ?? "").toString().trim();
    if (promoSummary) {
        await db.execute(sql`
      INSERT INTO "trip_promotions" ("id","trip_id","slug","summary","details","applies_when")
      VALUES (${randomUUID()}, ${id}, ${slugify(promoSummary).slice(0, 80)}, ${promoSummary}, NULL, NULL)
      ON CONFLICT DO NOTHING
    `);
    }

    return id;
}

async function main() {
    const file = resolveFirstExisting([
        process.env.SCHEDULE_XLSX_PATH ?? "",
        "./schedule_pages.xlsx",        // singular
        "./schedules_pages.xlsx",       // plural
        "./data/schedule_pages.xlsx",
        "C:/Users/kwleo/FYNC/schedules_pages.xlsx",
    ]);
    if (!file) { console.error("[import:schedule] file not found"); process.exit(1); }
    const filePath = path.resolve(process.cwd(), file);

    console.log("[import:schedule] reading", filePath);

    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    let ok = 0, fail = 0;
    for (const r of rows) {
        try {
            await upsertTrip(r);
            ok++;
        } catch (e: any) {
            fail++;
            console.warn("[row error]", e?.message ?? e, "row:", r);
        }
    }
    console.log("[import:schedule] done", { ok, fail });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

