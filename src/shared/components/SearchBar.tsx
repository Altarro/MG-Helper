import { useRef, useState, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { useKeyboardShortcut } from '@shared/hooks/useKeyboardShortcut';

interface SearchBarProps {
  /** Rendered inline in TopBar. If false, renders as full-width input */
  compact?: boolean;
  className?: string;
}

export function SearchBar({ compact = true, className = '' }: SearchBarProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentQuery = params.get('q') ?? '';
  const [draftQuery, setDraftQuery] = useState(currentQuery);

  useEffect(() => {
    setDraftQuery(currentQuery);
  }, [currentQuery]);

  function submit() {
    const q = draftQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      return;
    }
    navigate('/search');
  }

  function clear() {
    setDraftQuery('');
    navigate('/search');
    inputRef.current?.focus();
  }

  const focusSearch = useCallback((e: KeyboardEvent | globalThis.KeyboardEvent) => {
    e.preventDefault();
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useKeyboardShortcut('ctrl+k', focusSearch);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div
      className={`relative flex items-center ${compact ? 'max-w-64' : 'max-w-full'} ${className}`}
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-surface-500" />
      <input
        ref={inputRef}
        type="search"
        value={draftQuery}
        onChange={(e) => setDraftQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Szukaj…"
        aria-label="Globalne wyszukiwanie"
        title="Globalne wyszukiwanie (Ctrl+K)"
        className="app-input w-full rounded-full py-2 pl-9 pr-8 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
      {draftQuery && (
        <button
          type="button"
          onClick={clear}
          aria-label="Wyczyść wyszukiwanie"
          className="absolute right-2 rounded-full p-0.5 text-surface-500 transition-colors hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
