"use client";
import type { ListingLite } from "@/lib/types";
import AttributionLine from "./AttributionLine";
import Image from "next/image";
import { useMemo } from "react";

export default function ListingCard({ listing }: { listing: ListingLite }) {
    const primaryImg = useMemo(() => listing.imageUrls?.[0], [listing.imageUrls]);

    return (
        <article className="rounded-2xl border shadow-sm overflow-hidden bg-white flex flex-col">
            {primaryImg ? (
                <div className="relative h-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={primaryImg} alt={listing.boatName} className="h-full w-full object-cover" />
                </div>
            ) : null}
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold">{listing.boatName}</h3>
                    {listing.priceUSD ? (
                        <div className="text-right">
                            <div className="text-sm text-gray-500">From</div>
                            <div className="text-base font-semibold">${Math.round(listing.priceUSD)}</div>
                        </div>
                    ) : null}
                </div>

                <p className="text-sm text-gray-600 mt-1">{listing.locationText}</p>

                <div className="mt-2 flex flex-wrap gap-1">
                    {listing.species.slice(0, 3).map((s) => (
                        <span key={s} className="rounded-full border px-2 py-0.5 text-xs">
                            {s}
                        </span>
                    ))}
                    {listing.durationHours ? (
                        <span className="rounded-full border px-2 py-0.5 text-xs">
                            {listing.durationHours}h
                        </span>
                    ) : null}
                </div>

                {/* Description—respect “long copy” preference if you want to simulate */}
                {listing.source?.allowLongCopy === false ? (
                    <p className="text-xs text-gray-500 mt-2">
                        Detailed description available on operator’s site.
                    </p>
                ) : (
                    listing.description && <p className="text-sm mt-2 line-clamp-3">{listing.description}</p>
                )}

                <div className="mt-auto">
                    <a
                        href={`${listing.bookingUrl}?utm_source=findyournextcatch&utm_medium=referral`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex rounded-xl border px-3 py-2 text-sm hover:shadow"
                    >
                        Book on operator’s site
                    </a>
                    <AttributionLine source={listing.source} listingId={listing.id} />
                </div>
            </div>
        </article>
    );
}
