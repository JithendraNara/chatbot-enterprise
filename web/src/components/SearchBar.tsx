import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = 'Search conversations...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
          isFocused
            ? 'border-accent bg-background'
            : 'border-border-color bg-card'
        )}
      >
        <Search size={18} className="text-text-secondary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-text-primary placeholder:text-text-secondary focus:outline-none"
        />
        {query && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-background rounded transition-colors"
          >
            <X size={16} className="text-text-secondary" />
          </button>
        )}
      </div>
    </form>
  );
}
