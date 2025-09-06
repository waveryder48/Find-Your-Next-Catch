"use client";
import { useMemo, useState } from "react";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import type { ListingLite } from "@/lib/types";
import ListingCard from "@/components/ListingCard";
import ListingFilters, { FilterState, useDefaultFilters } from "@/components/ListingFilters";

export default function MockPage() {
    const [filters, setFilters] = useState<FilterState>(useDefaultFilters());

    const filtered = useMemo(() => {
        const q = filters.q.toLowerCase();
        return MOCK_LISTINGS.filter((l) => {
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

            return true;
        });
    }, [filters]);

    return (
        <main className="mx-auto max-w-6xl p-6 space-y-6">
            <header className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-semibold">Find Your Next Catch — Prototype</h1>
                <p className="text-sm text-gray-600">Mock listings to finalize layout before live data.</p>
            </header>

            <ListingFilters onChange={setFilters} />

            {filtered.length === 0 ? (
                <div className="rounded-2xl border p-8 text-center text-gray-600">
                    <p className="font-medium">No trips match your filters.</p>
                    <p className="text-sm mt-1">Try clearing filters or lowering the price.</p>
                </div>
            ) : (
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((l: ListingLite) => <ListingCard key={l.id} listing={l} />)}
                </section>
            )}
        </main>
    );
}
