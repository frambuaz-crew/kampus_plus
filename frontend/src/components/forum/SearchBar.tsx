import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface SearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, disabled }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Konu veya etiket ara…"
        disabled={disabled}
        className="h-11 border-slate-200 bg-white pl-10 pr-[5.5rem] shadow-sm focus-visible:ring-indigo-500/20"
        autoComplete="off"
      />
      <Button
        type="submit"
        size="sm"
        disabled={disabled || !query.trim()}
        className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 bg-indigo-600 px-4 text-xs font-semibold hover:bg-indigo-700"
      >
        Ara
      </Button>
    </form>
  );
};