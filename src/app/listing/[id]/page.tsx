// src/app/listing/[id]/page.tsx
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type Props = { params: { id: string } };

export default async function ListingDetailsPage({ params }: Props) {
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { provider: true, variants: true },
  });

  if (!listing) return notFound();

  const raw = listing.provider?.website || listing.sourceUrl;
  const isUrl = (u?: string | null) =>
    !!u && (/^https?:\/\//i.test(u) || (/\.[a-z]{2,}($|[\/?#])/i.test(u) && !/\s/.test(u)));
  const providerUrl = isUrl(raw) ? (/^https?:\/\//i.test(raw!) ? raw : `https://${raw}`) : null;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold">{listing.title ?? "Untitled Vessel"}</h1>
      <p className="mt-2 text-sm text-gray-600">{[listing.city, listing.state].filter(Boolean).join(", ")}</p>

      <div className="mt-6 space-y-4">
        <p>{listing.description || "No description provided."}</p>
        {providerUrl && (
          <a href={providerUrl} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg border px-4 py-2 hover:bg-gray-50">
            Visit provider site
          </a>
        )}
      </div>
    </main>
  );
}
