import { resolvePreviewToken } from "@/server/sources";
import { notFound } from "next/navigation";
import prisma from "@/server/prisma"; // your prisma helper

export default async function PreviewPage({ params }: { params: { token: string } }) {
    const pt = await resolvePreviewToken(params.token);
    if (!pt) return notFound();

    // show either a single listing preview or a source-wide feed
    const listing = pt.listingId
        ? await prisma.listing.findUnique({ where: { id: pt.listingId } })
        : null;

    return (
        <main className="mx-auto max-w-3xl p-6">
            <h1 className="text-2xl font-semibold mb-4">Private Preview</h1>
            <p className="text-sm mb-6">For: {pt.source.operatorName}</p>
            {listing ? (
                <ListingCardPreview listing={listing} />
            ) : (
                <p>No specific listing attached. Ask us for a boat preview link.</p>
            )}
        </main>
    );
}

// Make sure ListingCardPreview is a simple, server-safe component or convert to client as needed.
function ListingCardPreview({ listing }: { listing: any }) {
    return (
        <article className="rounded-2xl border p-4 shadow-sm">
            <h2 className="text-xl font-medium">{listing.boatName}</h2>
            <p className="text-sm opacity-80">{listing.locationText}</p>
            <div className="mt-2 text-sm">
                {listing.priceUSD ? <>From ${listing.priceUSD.toFixed(0)}</> : <>Contact for pricing</>}
                {listing.durationHours ? <span> · {listing.durationHours}h</span> : null}
            </div>
        </article>
    );
}
