// scripts/seed-landing-locations.ts
import "dotenv/config";
import * as fs from "node:fs";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { landings } from "@/schema";
import { eq, sql } from "drizzle-orm";

const XLSX_PATH = process.env.SEED_XLSX_PATH?.trim() || "./landings_vessels.xlsx";
const VERBOSE = process.argv.includes("--verbose");

// Accept either separate columns or a single "Location" like "San Diego, CA"
function splitLocation(loc?: string | null): { city?: string; state?: string } {
    if (!loc) return {};
    const m = String(loc).trim().match(/^(.+?),\s*([A-Za-z]{2})$/);
    if (!m) return {};
    return { city: m[1].trim(), state: m[2].toUpperCase() };
}

// Normalizers / lookups
type Row = Record<string, any>;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function get(row: Row, ...cands: string[]): string | null {
    for (const k of cands) {
        const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
}
function hostFrom(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const u = new URL(url.startsWith("http") ? url : `https://${url}`);
        return u.host.replace(/^www\./, "");
    } catch {
        return null;
    }
}

// --- OVERRIDES ---
// You can add by slug, normalized name, or domain host.
// Keep keys lowercase.
const bySlug: Record<string, { city: string; state: string }> = {
    "seaforth-landing": { city: "San Diego", state: "CA" },
    "dana-wharf-sportfishing": { city: "Dana Point", state: "CA" },
    "daveys-locker": { city: "Newport Beach", state: "CA" },
    "pierpoint-landing": { city: "Long Beach", state: "CA" },
    "long-beach-sportfishing": { city: "Long Beach", state: "CA" },
    "fishermans-landing": { city: "San Diego", state: "CA" },
    "hm-landing": { city: "San Diego", state: "CA" },
    "oceanside-sea-center": { city: "Oceanside", state: "CA" },
    "22nd-street-landing": { city: "San Pedro", state: "CA" },
    "marina-del-rey-sportfishing": { city: "Marina del Rey", state: "CA" },
    // add more slugs if you see them in print-landings output
};

const byName: Record<string, { city: string; state: string }> = {
    "seaforth landing": { city: "San Diego", state: "CA" },
    "dana wharf sportfishing": { city: "Dana Point", state: "CA" },
    "daveys locker": { city: "Newport Beach", state: "CA" },
    "pierpoint landing": { city: "Long Beach", state: "CA" },
    "long beach sportfishing": { city: "Long Beach", state: "CA" },
    "fishermans landing": { city: "San Diego", state: "CA" },
    "hm landing": { city: "San Diego", state: "CA" },
    "oceanside sea center": { city: "Oceanside", state: "CA" },
    "22nd street landing": { city: "San Pedro", state: "CA" },
    "marina del rey sportfishing": { city: "Marina del Rey", state: "CA" },
};

const byHost: Record<string, { city: string; state: string }> = {
    "seaforthlanding.com": { city: "San Diego", state: "CA" },
    "danawharf.com": { city: "Dana Point", state: "CA" },
    "daveyslocker.com": { city: "Newport Beach", state: "CA" },
    "pierpointlanding.com": { city: "Long Beach", state: "CA" },
    "longbeachsportfishing.com": { city: "Long Beach", state: "CA" },
    "fishermanslanding.com": { city: "San Diego", state: "CA" },
    "hmlanding.com": { city: "San Diego", state: "CA" },
    "oceansideseacenter.com": { city: "Oceanside", state: "CA" },
    "22ndstreet.com": { city: "San Pedro", state: "CA" },
    "mdrsf.com": { city: "Marina del Rey", state: "CA" },
    // add hosts you see in print-landings output
};

async function main() {
    console.log(`[seed:landing-locations] reading ${XLSX_PATH}`);
    // read the workbook as a buffer (works in ESM)
    const buf = fs.readFileSync(XLSX_PATH);
    const wb = XLSX.read(buf, { type: "buffer" });

    // pick a sheet — prefer any sheet with "landing" in the name; else first one
    const sheetName = wb.SheetNames.find((n) => /landing/i.test(n)) || wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[sheetName], { defval: "", raw: false });

    // snapshot DB landings
    const dbRows: any = await db.execute(sql`SELECT id, name, slug, website, city, state FROM ${landings}`);
    const bySlugDB = new Map<string, any>();
    const byNormNameDB = new Map<string, any>();

    for (const r of dbRows.rows) {
        bySlugDB.set(String(r.slug || "").toLowerCase(), r);
        byNormNameDB.set(norm(String(r.name || "")), r);
    }

    let updates = 0, fromSheet = 0, fromOverrides = 0, notFound = 0, noData = 0, unchanged = 0;

    for (const row of rows) {
        const name = get(row, "Landing Name", "Landing", "Name") ?? get(row, "landing_name", "name");
        const slug = get(row, "slug", "Slug");
        const ws = get(row, "Website", "Landing Website", "URL");
        const host = hostFrom(ws);

        // Accept City/State or combined "Location"
        let city = get(row, "City", "city", "Landing City");
        let state = get(row, "State", "state", "ST");
        const loc = get(row, "Location", "location", "City/State");
        if ((!city || !state) && loc) {
            const { city: c, state: s } = splitLocation(loc);
            if (c && !city) city = c;
            if (s && !state) state = s;
        }

        if (!name && !slug && !host) {
            noData++;
            if (VERBOSE) console.log("· skip row (no name/slug/host)", row);
            continue;
        }

        // Find target landing in DB
        let target =
            (slug ? bySlugDB.get(slug.toLowerCase()) : null) ||
            byNormNameDB.get(norm(name || "")) ||
            (host ? dbRows.rows.find((r: any) => hostFrom(r.website) === host) : null);

        if (!target) {
            notFound++;
            if (VERBOSE) console.log("· no match in DB for", { name, slug, host });
            continue;
        }

        // If sheet didn’t supply, try overrides: slug → name → host
        if (!city || !state) {
            const sKey = String(target.slug || "").toLowerCase();
            const nKey = norm(String(target.name || ""));
            const hKey = hostFrom(target.website || "");

            const ov =
                bySlug[sKey] ||
                byName[nKey] ||
                (hKey ? byHost[hKey] : undefined);

            if (ov) {
                if (!city) city = ov.city;
                if (!state) state = ov.state;
            }
        }

        if (!city && !state) {
            noData++;
            if (VERBOSE) console.log("· no city/state found for", { slug: target.slug, name: target.name, host: hostFrom(target.website) });
            continue;
        }

        // No change?
        if ((city ?? null) === (target.city ?? null) && (state ?? null) === (target.state ?? null)) {
            unchanged++;
            if (VERBOSE) console.log("· unchanged", { slug: target.slug, city, state });
            continue;
        }

        await db.update(landings)
            .set({ city: city ?? target.city ?? null, state: state ?? target.state ?? null })
            .where(eq(landings.id, target.id));

        updates++;
        if (city && state && (get(row, "City", "city") || get(row, "State", "state") || get(row, "Location", "location"))) {
            fromSheet++;
        } else {
            fromOverrides++;
        }

        if (VERBOSE) console.log("· updated", { slug: target.slug, city, state });
    }

    console.log(`[seed:landing-locations] updates=${updates} (sheet=${fromSheet}, overrides=${fromOverrides}) unchanged=${unchanged} no_data=${noData} not_found=${notFound}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
