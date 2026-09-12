'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SearchBar({ placeholder = "Buscar torneo por nombre...", className = "" }: { placeholder?: string, className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('search') || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/torneos?search=${encodeURIComponent(query.trim())}`);
    } else {
      router.push(`/torneos`);
    }
  };

  return (
    <form onSubmit={handleSearch} className={`flex w-full max-w-lg shadow-[0_0_15px_rgba(204,255,0,0.1)] rounded-lg overflow-hidden ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        className="glass-input w-full rounded-r-none border-r-0 focus:ring-0 focus:outline-none"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button 
        type="submit" 
        className="bg-neon text-black px-6 flex items-center justify-center font-bold hover:bg-white transition-colors"
      >
        <Search className="w-5 h-5 mr-2 hidden sm:block" />
        Buscar
      </button>
    </form>
  );
}
