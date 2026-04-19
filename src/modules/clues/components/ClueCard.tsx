import { memo } from 'react';
import { User, MapPin, Zap, CheckCircle2, Circle } from 'lucide-react';
import { Link } from 'react-router';
import type { Clue } from '../types';
import { CLUE_TYPE_LABELS } from '../types';

const CLUE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  character: User,
  location: MapPin,
  event: Zap,
};

interface ClueCardProps {
  clue: Clue;
  onClick?: () => void;
  onToggleDiscovered?: (clue: Clue) => void;
}

export const ClueCard = memo(function ClueCard({ clue, onClick, onToggleDiscovered }: ClueCardProps) {
  const Icon = CLUE_ICONS[clue.data.clueType] ?? Zap;
  const discovered = clue.data.discovered;

  return (
    <article
      className={`group flex flex-col gap-2 rounded-lg border p-3 shadow-sm transition-shadow hover:shadow-md cursor-pointer ${
        discovered
          ? 'border-green-200 bg-green-50'
          : 'border-surface-200 bg-white'
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.() : undefined}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={`mt-0.5 h-4 w-4 shrink-0 ${discovered ? 'text-green-600' : 'text-cyan-500'}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-surface-900 group-hover:text-primary-700 truncate">
              {clue.name}
            </span>
            <span className="shrink-0 rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
              {CLUE_TYPE_LABELS[clue.data.clueType] ?? clue.data.clueType}
            </span>
            {discovered && (
              <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Odkryta
              </span>
            )}
          </div>
          {clue.data.hint && (
            <p className="mt-1 text-xs text-surface-500 line-clamp-2">{clue.data.hint}</p>
          )}
        </div>
        {onToggleDiscovered && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleDiscovered(clue); }}
            aria-label={discovered ? 'Oznacz jako nieodkrytą' : 'Oznacz jako odkrytą'}
            className="shrink-0 rounded-md p-1 hover:bg-surface-100 transition-colors"
          >
            {discovered
              ? <CheckCircle2 className="h-4 w-4 text-green-500" />
              : <Circle className="h-4 w-4 text-surface-300" />
            }
          </button>
        )}
      </div>

      {clue.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {clue.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
});

/** Compact inline row for use in ClueSection */
export const ClueRow = memo(function ClueRow({
  clue,
  metaLabel,
  onToggleDiscovered,
}: {
  clue: Clue;
  metaLabel?: string;
  onToggleDiscovered?: (clue: Clue) => void;
}) {
  const Icon = CLUE_ICONS[clue.data.clueType] ?? Zap;
  const discovered = clue.data.discovered;

  return (
    <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${discovered ? 'bg-green-50' : 'bg-surface-50'}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${discovered ? 'text-green-500' : 'text-cyan-500'}`} />
      <Link
        to={`/clues/${clue.id}`}
        className="flex-1 truncate text-xs font-medium text-surface-800 hover:text-primary-600"
        onClick={(e) => e.stopPropagation()}
      >
        {clue.name}
      </Link>
      {metaLabel && (
        <span className="hidden shrink-0 rounded-full bg-cyan-100 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 sm:inline-flex">
          {metaLabel}
        </span>
      )}
      {clue.data.hint && (
        <span className="shrink-0 truncate max-w-[120px] text-xs text-surface-400 hidden sm:block">
          {clue.data.hint}
        </span>
      )}
      {onToggleDiscovered && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleDiscovered(clue); }}
          aria-label={discovered ? 'Oznacz jako nieodkrytą' : 'Odkryj'}
          className="shrink-0 rounded p-0.5 hover:bg-surface-200"
        >
          {discovered
            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            : <Circle className="h-3.5 w-3.5 text-surface-300" />
          }
        </button>
      )}
    </div>
  );
});
