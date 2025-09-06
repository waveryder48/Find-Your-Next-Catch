// src/app/preview/[token]/page.tsx

import prisma from "@/server/prisma"; // or: ../../../server/prisma if you haven't set the "@/"" alias
import { notFound } from "next/navigation";

export default async function PreviewPage({ params }: { params: { token: string } }) {
    const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

    // Mock mode: render a static message, no DB access
    if (IS_MOCK) {
        return (
            <main className="mx-auto max-w-3xl p-6">
                <h1 className="text-2xl font-semibold mb-4">Private Preview (Mock)</h1>
                <p className="text-sm text-gray-600">
                    Preview is disabled in mock mode. Turn mock mode off to enable database-backed previews.
                </p>
            </main>
        );
    }

    // Real mode: require prisma to be available
    if (!prisma) return notFound();

    const pt = await prisma.previewToken.findUnique({
        where: { token: params.token },
        include: { source: true },
    });
    if (!pt || pt.expiresAt < new Date()) return notFound();

    const listing = pt.listingId
        ? await prisma.listing.findUnique({ where: { id: pt.listingId } })
        : null;

    return (
        <main className="mx-auto max-w-3xl p-6">
            <h1 className="text-2xl font-semibold mb-4">Private Preview</h1>
            <p className="text-sm mb-6">For: {pt.source.operatorName}</p>
            {listing ? (
                <article className="rounded-2xl border p-4 shadow-sm">
                    <h2 className="text-xl font-medium">
                        {("title" in listing && listing.title) || "Listing"}
                    </h2>
                    {"city" in listing && (
                        <p className="text-sm opacity-80">{(listing as any).city}</p>
                    )}
                </article>
            ) : (
                <p>No specific listing attached. Ask us for a boat preview link.</p>
            )}
        </main>
    );
}
