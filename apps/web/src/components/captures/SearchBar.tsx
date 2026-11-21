'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  storageKey?: string;
}

export function SearchBar({ onSearch, storageKey }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isRestored, setIsRestored] = useState(!storageKey);

  useEffect(() => {
    if (storageKey) {
      try { setQuery(sessionStorage.getItem(storageKey) ?? ''); } catch { /* Search remains available when storage is blocked. */ }
    }
    setIsRestored(true);
  }, [storageKey]);

  const updateQuery = (value: string) => {
    setQuery(value);
    if (storageKey) {
      try { sessionStorage.setItem(storageKey, value); } catch { /* Keep the current query in memory. */ }
    }
  };

  useEffect(() => {
    if (!isRestored) return;
    const timer = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, onSearch, isRestored]);

  return (
    <div className="flex items-center gap-2 mx-4 mb-4 px-4 py-2.5 rounded-xl bg-surface border border-border focus-within:ring-2 focus-within:ring-primary/50 transition-shadow">
      <Search size={14} className="text-text-tertiary flex-shrink-0" />
      <input
        type="search"
        aria-label="캡처 검색"
        placeholder="캡처 검색..."
        value={query}
        onChange={(e) => updateQuery(e.target.value)}
        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
      />
      {query && (
        <button
          onClick={() => updateQuery('')}
          aria-label="검색어 지우기"
          className="text-text-tertiary hover:text-text-secondary"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
