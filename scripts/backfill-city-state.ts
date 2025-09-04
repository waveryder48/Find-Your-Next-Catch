/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CityState = { city: string; state: string };
const CA = (city: string): CityState => ({ city, state: "CA" });

const LANDING_CITY_STATE: Record<string, CityState> = {
    "Fisherman's Landing": CA("San Diego"),
    "H&M Landing": CA("San Diego"),
    "Seaforth Sportfishing": CA("San Diego"),
    "Dana Wharf Sportfishing": CA("Dana Point"),
    "Davey's Locker Sportfishing": CA("Newport Beach"),
    "Newport Landing Sportfishing": CA("Newport Beach"),
    "Long Beach Sportfishing": CA("Long Beach"),
    "22nd Street Landing": CA("San Pedro"),
    "Pierpoint Landing": CA("Long Beach"),
    "Marina Del Rey Sportfishing": CA("Marina del Rey"),
    "Redondo Beach Sportfishing": CA("Redondo Beach"),
    "LA Waterfront Sportfishing": CA("Wilmington"),
    "Ventura Sportfishing": CA("Ventura"),
    "Stardust Sportfishing": CA("Santa Barbara"),
    "Channel Islands Sportfishing": CA("Oxnard"),
    "Hook's Landing": CA("Oxnard"),
    "Morro Bay Landing": CA("Morro Bay"),
    "Oceanside SEA Center": CA("Oceanside"),
    "Helgren's Sportfishing": CA("Oceanside"),
    "Berkeley Marina": CA("Berkeley"),
};

function inferFromProviderName(name?: string | null): CityState {
    if (!name) return CA("");
    const byName = LANDING_CITY_STATE[name];
    if (byName) return byName;

    const n = name.toLowerCase();
    if (/sandiego|fishermans|hmlanding|seaforth/.test(n)) return CA("San Diego");
    if (/danawharf|danapoint/.test(n)) return CA("Dana Point");
    if (/davey|newport/.test(n)) return CA("Newport Beach");
    if (/long beach|pierpoint/.test(n)) return CA("Long Beach");
    if (/22nd|san pedro/.test(n)) return CA("San Pedro");
    if (/marina del rey/.test(n)) return CA("Marina del Rey");
    if (/redondo/.test(n)) return CA("Redondo Beach");
    if (/la waterfront|wilmington/.test(n)) return CA("Wilmington");
    if (/ventura/.test(n)) return CA("Ventura");
    if (/santa barbara|stardust/.test(n)) return CA("Santa Barbara");
    if (/channel islands|oxnard|hooks/.test(n)) return CA("Oxnard");
    if (/morro/.test(n)) return CA("Morro Bay");
    if (/oceanside|helgren/.test(n)) return CA("Oceanside");
    if (/berkeley/.test(n)) return CA("Berkeley");
    return CA("");
}

async function main() {
    const listings = await prisma.listing.findMany({
        include: { provider: true },
    });

    let updated = 0;
    for (const l of listings) {
        if (l.city && l.state) continue;
        const { city, state } = inferFromProviderName(l.provider?.name);
        if (!city && !state) continue;

        await prisma.listing.update({
            where: { id: l.id },
            data: {
                city: l.city || city || "",
                state: l.state || state || "CA",
            },
        });
        updated++;
    }

    console.log(`Backfill complete. Updated ${updated} listings.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => prisma.$disconnect());
