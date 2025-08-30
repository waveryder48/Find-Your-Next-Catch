// src/app/listings/page.tsx
import { prisma } from "@/lib/prisma";
import TripCard from "@/components/trips/TripCard";

export const revalidate = 600; // (optional) ISR for 10 min

export default async function ListingsPage() {
    const listings = await prisma.listing.findMany({
        include: { provider: true, variants: true },
        orderBy: { updatedAt: "desc" },
        take: 24,
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((l) => (
                <TripCard
                    key={l.id}
                    charterName={l.title || l.provider.name}
                    port={[l.city, l.state].filter(Boolean).join(", ") || undefined}
                    description={l.description ?? undefined}
                    website={l.sourceUrl}
                    canonicalUrl={`/listings/${l.id}`}
                    species={l.species ?? []}
                    seasonTags={[]}
                    variants={l.variants.map((v) => ({
                        id: v.id,
                        durationHours: v.durationHours,
                        isPrivate: v.isPrivate ?? false,
                        priceFrom: v.priceFrom ?? null,
                        priceUnit: v.priceUnit,
                        lastObservedAt: v.updatedAt,
                    }))}
                    updatedAt={l.updatedAt}
                />
            ))}
        </div>
    );
    export const dynamic = "force-dynamic";   // disables static prerender for this page
    // or: export const revalidate = 0;

}
