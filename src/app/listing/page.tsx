// src/app/listings/page.tsx
import TripCard from "@/components/trips/TripCard";
import { prisma } from "@/lib/prisma";

export const revalidate = 600; // re-generate every 10 min

export default async function ListingsPage() {
    const listings = await prisma.listing.findMany({
        include: {
            provider: true,
            variants: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 24,
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((l) => {
                const port = [l.city, l.state].filter(Boolean).join(", ");
                const updatedAt = l.updatedAt;
                return (
                    <TripCard
                        key={l.id}
                        charterName={l.title || l.provider.name}
                        port={port || undefined}
                        description={l.description || undefined}
                        // External "book" link:
                        website={l.sourceUrl}
                        // Internal details page:
                        canonicalUrl={`/listings/${l.id}`}
                        // Optional badges:
                        species={l.species ?? []}
                        seasonTags={[]} // add if/when you track them
                        // Map TripVariant -> TripCard variants
                        variants={l.variants.map((v) => ({
                            id: v.id,
                            durationHours: v.durationHours,
                            // Default to PUBLIC unless explicitly private
                            isPrivate: v.isPrivate ?? false,
                            priceFrom: v.priceFrom ?? null, // cents
                            priceUnit: v.priceUnit,         // "trip" | "person"
                            lastObservedAt: v.updatedAt,
                        }))}
                        updatedAt={updatedAt}
                    />
                );
            })}
        </div>
    );
}
