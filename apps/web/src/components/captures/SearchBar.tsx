'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="flex items-center gap-2 mx-4 mb-4 px-4 py-2.5 rounded-xl bg-surface border border-border focus-within:ring-2 focus-within:ring-primary/50 transition-shadow">
      <Search size={14} className="text-text-tertiary flex-shrink-0" />
      <input
        type="search"
        aria-label="캡처 검색"
        placeholder="캡처 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
      />
      {query && (
        <button onClick={() => setQuery('')} className="text-text-tertiary hover:text-text-secondary">
          ✕
        </button>
      )}
    </div>
  );
}
