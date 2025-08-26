'use client';
import { useMemo, useState } from 'react';
import SearchBar from '@/components/SearchBar';
import ListingCard from '@/components/ListingCard';
import mock from '@/lib/mockListings.json';

export default function SearchPage() {
  const [filters, setFilters] = useState({ q: '', maxPrice: 2000, duration: 0, capacity: 0 });
  const results = useMemo(()=>{
    return mock.filter((l)=> {
      const matchQ = filters.q ? (l.title.toLowerCase().includes(filters.q.toLowerCase()) || l.location.toLowerCase().includes(filters.q.toLowerCase())) : true;
      const matchPrice = l.price <= filters.maxPrice;
      const matchDuration = filters.duration ? l.duration === filters.duration : true;
      const matchCapacity = filters.capacity ? l.capacity >= filters.capacity : true;
      return matchQ && matchPrice && matchDuration && matchCapacity;
    });
  }, [filters]);
  return (
    <div className="space-y-6">
      <SearchBar onSearch={({location})=> setFilters((f)=> ({...f, q: location}))} />
      <div className="flex gap-4 items-center text-sm">
        <label className="flex items-center gap-2">Max price ${'{'}filters.maxPrice{'}'}
          <input type="range" min={200} max={3000} value={filters.maxPrice} onChange={(e)=> setFilters((f)=> ({...f, maxPrice: Number(e.target.value)}))} />
        </label>
        <select className="bg-white/5 border border-white/10 rounded px-3 py-2" value={filters.duration} onChange={(e)=> setFilters((f)=> ({...f, duration: Number(e.target.value)}))}>
          <option value={0}>Any duration</option>
          <option value={4}>4 hours</option>
          <option value={6}>6 hours</option>
          <option value={8}>8 hours</option>
        </select>
        <select className="bg-white/5 border border-white/10 rounded px-3 py-2" value={filters.capacity} onChange={(e)=> setFilters((f)=> ({...f, capacity: Number(e.target.value)}))}>
          <option value={0}>Any capacity</option>
          <option value={4}>4+ anglers</option>
          <option value={6}>6+ anglers</option>
          <option value={8}>8+ anglers</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((l)=> (<ListingCard key={l.id} listing={l as any} />))}
      </div>
    </div>
  );
}