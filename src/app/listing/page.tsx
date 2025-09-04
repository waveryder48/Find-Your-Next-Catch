// src/app/listing/page.tsx
import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function ListingPage() {
    // Fetch listings from your database
    const listings = await prisma.listing.findMany({
        orderBy: { id: "asc" },
    });

    return (
        <main className="max-w-6xl mx-auto px-4 py-8">
            {/* Back to Homepage */}
            <div className="mb-6">
                <Link
                    href="/"
                    className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition"
                >
                    ← Back to Homepage
                </Link>
            </div>

            <h1 className="text-4xl font-bold mb-8 text-center">Available Listings</h1>

            {listings.length === 0 ? (
                <p className="text-center text-gray-600">No listings available yet.</p>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {listings.map((listing) => (
                        <div
                            key={listing.id}
                            className="border rounded-lg shadow-sm bg-white p-4 flex flex-col justify-between"
                        >
                            <div>
                                <h2 className="text-xl font-semibold mb-2">{listing.title}</h2>
                                {listing.city && listing.state && (
                                    <p className="text-gray-500 text-sm mb-2">
                                        {listing.city}, {listing.state}
                                    </p>
                                )}
                            </div>

                            <div className="mt-4 space-y-2">
                                {/* View Provider (internal route) */}
                                <Link
                                    href={`/listing/${listing.id}`}
                                    className="block text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                                >
                                    View Provider
                                </Link>

                                {/* View Detail (outbound but same tab) */}
                                {listing.providerWebsite && (
                                    <Link
                                        href={listing.providerWebsite}
                                        className="block text-center bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition"
                                    >
                                        View Detail
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
