// src/app/listings/[id]/page.tsx
import TripCard from "@/components/trips/TripCard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const revalidate = 600;

export default async function ListingDetail({ params }: { params: { id: string } }) {
  const l = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { provider: true, variants: true },
  });
  if (!l) return notFound();

  const port = [l.city, l.state].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <TripCard
        charterName={l.title || l.provider.name}
        port={port || undefined}
        description={l.description || undefined}
        website={l.sourceUrl}
        canonicalUrl={l.canonicalUrl ?? undefined}
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

      {/* Room for extra sections: gallery, amenities, map, provider info, price history, etc. */}
    </div>
  );
}
