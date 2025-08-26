import mock from '@/lib/mockListings.json';

export default function ListingPage({ params }: { params: { id: string }}) {
  const listing = (mock as any).find((l: any)=> l.id === params.id);
  if (!listing) return <div className="py-16">Listing not found.</div>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <img src={listing.images[0]} alt={listing.title} className="w-full aspect-video object-cover rounded-xl border border-white/10" />
        <h1 className="text-3xl font-semibold">{listing.title}</h1>
        <p className="opacity-80">{listing.description}</p>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <h3 className="font-semibold mb-2">Trip details</h3>
          <ul className="list-disc pl-6 opacity-90 text-sm">
            <li>Duration: {listing.duration} hrs</li>
            <li>Capacity: up to {listing.capacity} anglers</li>
            <li>Location: {listing.location}</li>
          </ul>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-2xl font-bold">${'{'}listing.price{'}'}</div>
          <div className="text-sm opacity-80 mb-3">per trip</div>
          <form action="/api/checkout" method="POST" className="space-y-2">
            <input type="hidden" name="listingId" value={listing.id} />
            <button className="w-full rounded-lg bg-white text-black py-2 font-medium">Book now</button>
            <a className="block text-center text-sm underline opacity-80" href={listing.affiliateUrl || '#'}>View captain website</a>
          </form>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm opacity-80">
          Secure payments (coming soon). Submit a lead or click to book on captain site.
        </div>
      </aside>
    </div>
  );
}