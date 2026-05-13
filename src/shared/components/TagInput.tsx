import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTags } from '@shared/hooks/useTags';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = 'Dodaj tag...' }: TagInputProps) {
  const allTags = useTags();
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputShellRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

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

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    function updateDropdownPosition() {
      const anchor = inputShellRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }

    if (!open) return;
    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [open, value.length, input]);

  return (
    <div ref={containerRef} className="relative">
      <div ref={inputShellRef} className="app-input-shell flex min-h-12 flex-wrap gap-2 rounded-2xl px-3 py-2 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20">
        {value.map((tag) => (
          <span
            key={tag}
            className="app-pill flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Usuń tag ${tag}`}
              className="text-primary-500 transition-colors hover:text-primary-800"
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
          className="min-w-24 flex-1 bg-transparent py-1 text-sm text-surface-900 outline-none placeholder:text-surface-500"
          aria-label="Wprowadź tag"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
        />
      </div>

      {open && suggestions.length > 0 &&
        createPortal(
          <ul
            role="listbox"
            aria-label="Sugestie tagów"
            className="app-panel-strong fixed z-[80] max-h-32 overflow-auto rounded-2xl py-1.5"
            style={{
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
            }}
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
                  className="w-full px-3 py-2 text-left text-sm text-surface-800 transition-colors hover:bg-[rgba(223,225,218,0.72)]"
                >
                  {tag}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
