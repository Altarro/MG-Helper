import { scrollWindowToElementId } from '@shared/utils/scrollToAnchor';

export type DetailTocItem = { id: string; label: string };

type DetailTocBarProps = {
  items: DetailTocItem[];
  /** Domyślnie: „Spis sekcji” */
  ariaLabel?: string;
  className?: string;
};

/** Spis treści strony detalu — przyciski przewijają do kotwic (`id` sekcji). */
export function DetailTocBar({ items, ariaLabel = 'Spis sekcji', className = '' }: DetailTocBarProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className={`flex flex-wrap gap-2 ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollWindowToElementId(item.id)}
          className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-surface-700 transition-colors hover:bg-surface-50 hover:text-surface-900"
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
