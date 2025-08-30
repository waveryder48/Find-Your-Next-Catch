// src/app/listing/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";

// Make sure this page runs at request time (not during static build)
export const dynamic = "force-dynamic";

type ListingWithRelations = Awaited<
    ReturnType<typeof prisma.listing.findMany>
>[number];

function formatLocation(listing: ListingWithRelations) {
    const city = listing.city?.trim();
    const state = listing.state?.trim();
    return [city, state].filter(Boolean).join(", ");
}

function minPriceInfo(listing: ListingWithRelations) {
    if (!listing.variants?.length) return null;
    const min = listing.variants.reduce((acc, v) =>
        v.priceFrom < acc.priceFrom ? v : acc
    );
    return {
        priceFrom: min.priceFrom,
        priceUnit: min.priceUnit, // "trip" | "person"
        durationHours: min.durationHours,
        isPrivate: min.isPrivate,
    };
}

function pluralize(n: number, word: string) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border border-white/15 px-2 py-0.5 text-[11px] leading-5 opacity-80">
            {children}
        </span>
    );
}

function ListingCard({ listing }: { listing: ListingWithRelations }) {
    const loc = formatLocation(listing);
    const price = minPriceInfo(listing);
    const cover = listing.images?.[0];

    return (
        <article className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm transition hover:border-white/20 hover:bg-white/10">
            {/* Image header */}
            <div className="aspect-[16/9] w-full bg-black/20">
                {cover ? (
                    // If you already use next/image, you can swap in <Image />
                    <img
                        src={cover}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm opacity-60">
                        No image
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold leading-tight">
                        {listing.title}
                    </h3>
                    <div className="text-xs opacity-70">
                        {price ? (price.isPrivate ? "Private" : "Public") : "Public"}
                    </div>
                </div>

                <div className="text-sm opacity-80">
                    {listing.provider?.name ? (
                        <>
                            <span className="font-medium">{listing.provider.name}</span>
                            {loc ? <span className="opacity-70"> — {loc}</span> : null}
                        </>
                    ) : (
                        loc || "—"
                    )}
                </div>

                {/* Species */}
                {listing.species?.length ? (
                    <div className="flex flex-wrap gap-2">
                        {listing.species.slice(0, 6).map((s, i) => (
                            <Pill key={`${listing.id}-species-${i}`}>{s}</Pill>
                        ))}
                        {listing.species.length > 6 ? (
                            <Pill>+{listing.species.length - 6} more</Pill>
                        ) : null}
                    </div>
                ) : null}

                {/* Pricing / duration */}
                {price ? (
                    <div className="text-sm">
                        From{" "}
                        <span className="font-semibold">
                            ${price.priceFrom.toLocaleString()}
                        </span>{" "}
                        per {price.priceUnit}
                        {" · "}
                        {pluralize(price.durationHours, "hour")}
                    </div>
                ) : (
                    <div className="text-sm opacity-70">Pricing varies by season</div>
                )}

                {/* Actions */}
                <div className="mt-1 flex gap-2">
                    {listing.sourceUrl ? (
                        <a
                            href={listing.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/20"
                        >
                            View details
                        </a>
                    ) : null}
                    {listing.provider?.website ? (
                        <a
                            href={listing.provider.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm transition hover:border-white/30"
                        >
                            Visit provider
                        </a>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

export default async function ListingPage() {
    let listings: ListingWithRelations[] = [];

    try {
        listings = await prisma.listing.findMany({
            include: { provider: true, variants: true },
            orderBy: { updatedAt: "desc" },
            take: 60,
        });
    } catch (err) {
        // Soft-fail the page if DB is unreachable; show a helpful message
        return (
            <main className="container mx-auto max-w-6xl px-4 py-8">
                <h1 className="mb-3 text-2xl font-semibold">Charter Listings</h1>
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
                    <p className="font-medium">Can’t reach the database right now.</p>
                    <p className="opacity-80">
                        Check your <code>/api/health</code> endpoint or database
                        credentials. This page is <code>force-dynamic</code> to avoid build
                        failures, so it will work once the DB is reachable.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="container mx-auto max-w-6xl px-4 py-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Charter Listings</h1>
                <Link
                    href="/"
                    className="text-sm opacity-80 underline-offset-4 hover:underline"
                >
                    Home
                </Link>
            </div>

            {listings.length === 0 ? (
                <div className="rounded-xl border border-white/10 p-6 text-sm opacity-80">
                    No listings yet. Add one via your API:
                    <pre className="mt-3 overflow-x-auto rounded-lg bg-black/30 p-3">
                        {`POST /api/listings
{
  "title": "Test Boat",
  "sourceUrl": "https://example.com/boat/123",
  "city": "San Diego"
}`}
                    </pre>
                </div>
            ) : (
                <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {listings.map((listing) => (
                        <ListingCard key={listing.id} listing={listing} />
                        // If you prefer your custom card:
                        // <TripCard key={listing.id} listing={listing} />
                    ))}
                </section>
            )}
        </main>
    );
}
