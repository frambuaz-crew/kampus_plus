import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
}

/**
 * Global Forum Arama Bileşeni - Aydınlık Stil
 * Spec: 005-forum-page/spec.md - 5.1 Global Arama
 */
export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, disabled }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative group w-full">
      <div className="relative flex items-center">
        {/* Arama İkonu - Renk geçişi aydınlık tema için yumuşatıldı */}
        <div className="absolute left-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors z-10">
          <Search size={20} />
        </div>

        {/* Input Alanı - bg-[#0f1624] yerine ferah bg-gray-50 */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Konu, kullanıcı veya etiket ara..."
          disabled={disabled}
          className="w-full bg-gray-50 border border-gray-200 text-gray-900 pl-12 pr-28 py-4 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder-gray-400 font-medium"
        />

        {/* Ara Butonu - Gölge efekti açık renk zemin için optimize edildi */}
        <button
          type="submit"
          disabled={disabled || !query.trim()}
          className="absolute right-2.5 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Ara
        </button>
      </div>
    </form>
  );
};