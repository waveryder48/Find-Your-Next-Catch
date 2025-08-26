'use client';
import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import ListingCard from '@/components/ListingCard';
import mock from '@/lib/mockListings.json';
import Link from 'next/link';

export default function Home() {
  const [q, setQ] = useState({ location: '', date: '' });
  const listings = mock.slice(0, 6);
  return (
    <div className="space-y-8">
      <section className="rounded-2xl p-8 bg-white/5 border border-white/10 shadow-xl">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">Find your next sportfishing charter</h1>
        <p className="opacity-80 mb-6">Compare captains, boats, and prices. Book with confidence.</p>
        <SearchBar onSearch={(x)=> setQ(x)} />
      </section>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Featured near you</h2>
          <Link href="/search" className="text-sm underline opacity-80 hover:opacity-100">See all</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((l) => (<ListingCard key={l.id} listing={l as any} />))}
        </div>
      </section>
    </div>
  );
}