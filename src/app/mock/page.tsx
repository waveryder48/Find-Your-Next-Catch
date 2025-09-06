"use client";
import { useMemo, useState } from "react";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import type { ListingLite } from "@/lib/types";
import ListingCard from "@/components/ListingCard";
import ListingFilters, { FilterState, useDefaultFilters } from "@/components/ListingFilters";
import { distanceMiles } from "@/lib/geo";

export default function MockPage() {
    const [filters, setFilters] = useState<FilterState>(useDefaultFilters());

    const computed = useMemo(() => {
        const q = filters.q.toLowerCase();

        // 1) filter
        let arr = MOCK_LISTINGS.filter((l) => {
            if (q && !(
                l.boatName.toLowerCase().includes(q) ||
                (l.captainName || "").toLowerCase().includes(q) ||
                l.species.some(s => s.toLowerCase().includes(q)) ||
                (l.locationText || "").toLowerCase().includes(q)
            )) return false;

            if (filters.species !== "any" && !l.species.includes(filters.species)) return false;
            if (filters.location !== "any" && (l.locationText || "").indexOf(filters.location) === -1) return false;
            if (filters.maxPrice !== null && (l.priceUSD ?? Infinity) > filters.maxPrice) return false;
            if (filters.minHours !== null && (l.durationHours ?? 0) < filters.minHours) return false;

            // distance filter if we have user coords and listing coords
            if (filters.maxDistanceMi && filters.userLat != null && filters.userLng != null && l.lat != null && l.lng != null) {
                const d = distanceMiles({ lat: filters.userLat, lng: filters.userLng }, { lat: l.lat, lng: l.lng });
                if (d > filters.maxDistanceMi) return false;
            }
            return true;
        });

        // 2) sort
        arr = [...arr].sort((a, b) => {
            switch (filters.sort) {
                case "price-asc": return (a.priceUSD ?? 1e9) - (b.priceUSD ?? 1e9);
                case "price-desc": return (b.priceUSD ?? -1) - (a.priceUSD ?? -1);
                case "duration-asc": return (a.durationHours ?? 1e9) - (b.durationHours ?? 1e9);
                case "duration-desc": return (b.durationHours ?? -1) - (a.durationHours ?? -1);
                case "distance-asc": {
                    if (filters.userLat == null || filters.userLng == null) return 0;
                    const da = (a.lat != null && a.lng != null)
                        ? distanceMiles({ lat: filters.userLat, lng: filters.userLng }, { lat: a.lat, lng: a.lng })
                        : 1e9;
                    const db = (b.lat != null && b.lng != null)
                        ? distanceMiles({ lat: filters.userLat, lng: filters.userLng }, { lat: b.lat, lng: b.lng })
                        : 1e9;
                    return da - db;
                }
                default: return 0; // relevance (keep input order)
            }
        });

        return arr;
    }, [filters]);

    return (
        <main className="mx-auto max-w-6xl">
            <ListingFilters onChange={setFilters} />

            <div className="p-6 space-y-6">
                <header className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-semibold">Find Your Next Catch — Prototype</h1>
                    <p className="text-sm text-gray-600">Toggle filters above; try “Use my location” to filter by distance.</p>
                </header>

                {computed.length === 0 ? (
                    <div className="rounded-2xl border p-8 text-center text-gray-600">
                        <p className="font-medium">No trips match your filters.</p>
                        <p className="text-sm mt-1">Try clearing filters or increasing distance.</p>
                    </div>
                ) : (
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {computed.map((l: ListingLite) => <ListingCard key={l.id} listing={l} />)}
                    </section>
                )}
            </div>
        </main>
    );
}
