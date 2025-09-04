import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <section className="rounded-2xl border p-8">
        <h1 className="text-4xl font-bold">Find Your Next Catch</h1>
        <p className="mt-3 text-gray-600">Browse Southern California sportfishing charters.</p>
        <div className="mt-6">
          <Link href="/listing" className="inline-block rounded-xl border px-5 py-3 text-base font-medium hover:bg-gray-50">
            Browse Listings
          </Link>
        </div>
      </section>
    </main>
  );
}
