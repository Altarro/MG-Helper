import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTags } from '@shared/hooks/useTags';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = 'Dodaj tag…' }: TagInputProps) {
  const allTags = useTags();
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = allTags.filter(
    (t) => t.toLowerCase().includes(input.toLowerCase()) && !value.includes(t),
  );

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
    setOpen(false);
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
    if (e.key === 'Escape') setOpen(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex min-h-9 flex-wrap gap-1.5 rounded-md border border-surface-300 bg-white px-2 py-1.5 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Usuń tag ${tag}`}
              className="text-primary-400 hover:text-primary-700"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-surface-400"
          aria-label="Wprowadź tag"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Sugestie tagów"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-surface-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(tag);
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-surface-700 hover:bg-surface-50"
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
