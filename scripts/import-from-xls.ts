/* eslint-disable no-console */
import path from "node:path";
import fs from "node:fs";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---- helpers ----
function isProbablyUrl(raw?: string | null) {
    if (!raw) return false;
    const s = String(raw).trim();
    if (!/^https?:\/\//i.test(s) && /\s/.test(s)) return false;
    if (/\.[a-z]{2,}($|[\/?#])/i.test(s)) return true;
    return /^https?:\/\//i.test(s);
}
function normalizeUrlOrNull(raw?: string | null) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!isProbablyUrl(s)) return null;
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
function norm(s?: string | null) {
    return (s ?? "").toString().trim();
}
// -------- city/state inference --------
type CityState = { city: string; state: string };
const CA = (city: string): CityState => ({ city, state: "CA" });

const LANDING_CITY_STATE: Record<string, CityState> = {
    // San Diego area
    "Fisherman's Landing": CA("San Diego"),
    "H&M Landing": CA("San Diego"),
    "Seaforth Sportfishing": CA("San Diego"),
    // Orange County
    "Dana Wharf Sportfishing": CA("Dana Point"),
    "Davey's Locker Sportfishing": CA("Newport Beach"),
    "Newport Landing Sportfishing": CA("Newport Beach"),
    // LA / Long Beach
    "Long Beach Sportfishing": CA("Long Beach"),
    "22nd Street Landing": CA("San Pedro"),
    "Pierpoint Landing": CA("Long Beach"),
    "Marina Del Rey Sportfishing": CA("Marina del Rey"),
    "Redondo Beach Sportfishing": CA("Redondo Beach"),
    "LA Waterfront Sportfishing": CA("Wilmington"),
    // Ventura / Santa Barbara / Channel Islands
    "Ventura Sportfishing": CA("Ventura"),
    "Stardust Sportfishing": CA("Santa Barbara"),
    "Channel Islands Sportfishing": CA("Oxnard"),
    "Hook's Landing": CA("Oxnard"),
    // North / Central (in case they’re in the sheet)
    "Morro Bay Landing": CA("Morro Bay"),
    "Berkeley Marina": CA("Berkeley"),
    // Oceanside
    "Oceanside SEA Center": CA("Oceanside"),
    "Helgren's Sportfishing": CA("Oceanside"),
};

function inferCityState(landingName: string, landingWebsite?: string | null): CityState {
    const byName = LANDING_CITY_STATE[landingName];
    if (byName) return byName;

    const host = (() => {
        try {
            const u = new URL(landingWebsite ?? "");
            return u.hostname.toLowerCase();
        } catch {
            return (landingWebsite ?? "").toLowerCase();
        }
    })();

    // simple keyword heuristic on hostname
    const H: Array<[RegExp, CityState]> = [
        [/fishermans|seaforth|hmlanding|sandiego/, CA("San Diego")],
        [/danawharf|danapoint/, CA("Dana Point")],
        [/daveys|newportlanding|newportbeach|newport-?landing/, CA("Newport Beach")],
        [/longbeach|pierpoint/, CA("Long Beach")],
        [/22nd|sanpedro/, CA("San Pedro")],
        [/marinadelrey/, CA("Marina del Rey")],
        [/redondo/, CA("Redondo Beach")],
        [/lawaterfront|wilmington/, CA("Wilmington")],
        [/ventura/, CA("Ventura")],
        [/santabarbara|stardustsportfishing/, CA("Santa Barbara")],
        [/channelislands|oxnard/, CA("Oxnard")],
        [/morr?obay/, CA("Morro Bay")],
        [/oceanside|helgrens/, CA("Oceanside")],
        [/berkeley/, CA("Berkeley")],
    ];
    for (const [re, cs] of H) {
        if (host && re.test(host)) return cs;
    }

    // Fallback
    return CA(""); // city unknown but keep CA; adjust if your scope expands
}
// -------------------------------

// Expected headers (case-sensitive from your screenshot)
const COL_LANDING = "Landing";
const COL_LANDING_WEBSITE = "Landing Website";
const COL_VESSEL = "Vessel";
const COL_VESSEL_WEBSITE = "Vessel Website";

function readFirstSheetRows(filePath: string) {
    const wb = XLSX.readFile(filePath);
    const name = wb.SheetNames[0];
    const sheet = wb.Sheets[name];
    return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
}

async function main() {
    const FILE = process.argv[2];
    const DRY = (process.argv[3] ?? "").toLowerCase().includes("dry");

    if (!FILE) {
        console.error("Usage: npx tsx scripts/import-from-xls.ts <file.xls/xlsx> [--dry-run]");
        process.exit(1);
    }

    const abs = path.resolve(process.cwd(), FILE);
    if (!fs.existsSync(abs)) {
        console.error(`File not found: ${abs}`);
        process.exit(1);
    }

    const rows = readFirstSheetRows(abs);
    console.log(`Loaded ${rows.length} rows from ${path.basename(abs)}${DRY ? " (DRY RUN)" : ""}`);

    const seen = new Set<string>();
    let providersCreated = 0;
    let listingsUpserted = 0;
    let skipped = 0;

    for (const r of rows) {
        const landingName = norm(r[COL_LANDING]);
        const landingWebsite = normalizeUrlOrNull(norm(r[COL_LANDING_WEBSITE]));
        const vesselName = norm(r[COL_VESSEL]);
        const vesselWebsite = normalizeUrlOrNull(norm(r[COL_VESSEL_WEBSITE]));

        // Require landing name, vessel name, and valid vessel url
        if (!landingName || !vesselName || !vesselWebsite) {
            skipped++;
            continue;
        }

        const key = `${landingName}||${vesselName}||${vesselWebsite}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (DRY) continue;

        // Require landing website if present in your sheet
        if (!landingWebsite) {
            skipped++;
            continue;
        }

        // Upsert provider by unique website
        const provider = await prisma.provider.upsert({
            where: { website: landingWebsite },
            update: { name: landingName },
            create: { name: landingName, website: landingWebsite },
        });
        if (provider.createdAt.getTime() === provider.updatedAt.getTime()) providersCreated++;

        // Infer city/state from landing
        const { city, state } = inferCityState(landingName, landingWebsite);

        // Upsert listing by unique sourceUrl (vessel website)
        await prisma.listing.upsert({
            where: { sourceUrl: vesselWebsite },
            update: {
                title: vesselName,
                providerId: provider.id,
                city: city ?? "",
                state: state ?? "CA",
            },
            create: {
                title: vesselName,
                sourceUrl: vesselWebsite,
                providerId: provider.id,
                city: city ?? "",
                state: state ?? "CA",
            },
        });
        listingsUpserted++;
    }

    console.log(
        DRY
            ? `DRY RUN complete. Valid rows = ${seen.size}, Skipped (invalid) = ${skipped}`
            : `Import complete. Providers created ≈ ${providersCreated}, Listings upserted = ${listingsUpserted}, Skipped = ${skipped}`
    );
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
