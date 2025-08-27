'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar({ onSearch }: { onSearch?: (q: {location: string, date: string})=> void }) {
  const [location, setLocation] = useState('San Diego, CA');
  const [date, setDate] = useState('');
  const router = useRouter();
  return (
    <form
      className="flex flex-col md:flex-row gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch?.({ location, date });
        router.push('/search');
      }}
    >
      <input
        className="flex-1 rounded-lg bg-black/40 border border-white/20 px-4 py-3"
        placeholder="Where to?"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <input
        className="rounded-lg bg-black/40 border border-white/20 px-4 py-3"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <button className="rounded-lg bg-white text-black px-6 py-3 font-medium">Search</button>
    </form>
  );
}
