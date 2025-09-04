import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

function isProbablyUrl(raw?: string | null) {
  if (!raw) return false;
  const s = String(raw).trim();
  if (!/^https?:\/\//i.test(s) && /\s/.test(s)) return false;
  if (/\.[a-z]{2,}($|[\/?#])/i.test(s)) return true;
  return /^https?:\/\//i.test(s);
}
function toExternalUrlOrNull(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!isProbablyUrl(s)) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export default async function ListingDetailsPage({ params }: Props) {
  let listing: any = null;
  try {
    listing = await prisma.listing.findUnique({
      where: { id: params.id }, // cuid string
      include: { provider: true, variants: true },
    });
  } catch (err) {
    console.error("Error loading listing:", err);
    return notFound();
  }

  if (!listing) return notFound();

  const providerUrl = toExternalUrlOrNull(listing.provider?.website || listing.sourceUrl);

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
