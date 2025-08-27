import Link from 'next/link';

export default function ListingCard({ listing }: { listing: any }) {
    return (
        <Link
            href={`/listing/${listing.id}`}
            className="rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition"
        >
            <img src={listing.images[0]} alt={listing.title} className="w-full aspect-video object-cover" />
            <div className="p-4 space-y-1">
                <div className="font-medium">{listing.title}</div>
                <div className="opacity-70 text-sm">{listing.location}</div>
                <div className="text-sm">
                    <span className="font-semibold">${listing.price}</span>{' '}
                    <span className="opacity-70">per trip</span>
                </div>
            </div>
        </Link>
    );
}
