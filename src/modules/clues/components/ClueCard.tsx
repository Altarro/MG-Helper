import { memo } from 'react';
import { User, MapPin, Zap, CheckCircle2, Circle, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { Clue } from '../types';
import { CLUE_TYPE_LABELS } from '../types';

const CLUE_ICONS: Record<string, LucideIcon> = {
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
      className={`group flex cursor-pointer flex-col gap-3 rounded-[1.35rem] p-4 transition-all hover:-translate-y-0.5 ${
        discovered ? 'bg-[linear-gradient(180deg,rgba(215,234,220,0.92)_0%,rgba(204,227,212,0.96)_100%)] border border-[rgba(95,155,125,0.22)] shadow-[0_12px_28px_rgba(18,45,66,0.08),inset_0_1px_0_rgba(255,250,240,0.18)]' : 'app-card'
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.() : undefined}
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${discovered ? 'bg-[rgba(95,155,125,0.16)]' : 'bg-[rgba(111,146,164,0.14)]'}`}>
          <Icon className={`h-4 w-4 ${discovered ? 'text-success-600' : 'text-primary-600'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-surface-900 group-hover:text-primary-800">
              {clue.name}
            </span>
            <span className="app-pill rounded-full px-2.5 py-1 text-xs">
              {CLUE_TYPE_LABELS[clue.data.clueType] ?? clue.data.clueType}
            </span>
            {discovered && (
              <span className="rounded-full border border-[rgba(95,155,125,0.22)] bg-[rgba(95,155,125,0.16)] px-2.5 py-1 text-xs text-success-600">
                Odkryta
              </span>
            )}
          </div>
          {clue.data.hint && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-surface-700">{clue.data.hint}</p>
          )}
        </div>
        {onToggleDiscovered && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDiscovered(clue);
            }}
            aria-label={discovered ? 'Oznacz jako nieodkrytą' : 'Oznacz jako odkrytą'}
            className="shrink-0 rounded-xl p-2 transition-colors hover:bg-[rgba(223,225,218,0.72)]"
          >
            {discovered ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : <Circle className="h-4 w-4 text-surface-400" />}
          </button>
        )}
      </div>

      {clue.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {clue.tags.map((tag) => (
            <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
});

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
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${discovered ? 'bg-[rgba(215,234,220,0.56)]' : 'bg-[rgba(223,225,218,0.72)]'}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${discovered ? 'text-success-600' : 'text-primary-600'}`} />
      <Link
        to={`/clues/${clue.id}`}
        className="flex-1 truncate text-xs font-medium text-surface-800 hover:text-primary-700"
        onClick={(e) => e.stopPropagation()}
      >
        {clue.name}
      </Link>
      {metaLabel && (
        <span className="app-pill hidden shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex">
          {metaLabel}
        </span>
      )}
      {clue.data.hint && (
        <span className="hidden max-w-[120px] shrink-0 truncate text-xs text-surface-500 sm:block">
          {clue.data.hint}
        </span>
      )}
      {onToggleDiscovered && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDiscovered(clue);
          }}
          aria-label={discovered ? 'Oznacz jako nieodkrytą' : 'Odkryj'}
          className="shrink-0 rounded p-0.5 hover:bg-[rgba(223,225,218,0.72)]"
        >
          {discovered ? <CheckCircle2 className="h-3.5 w-3.5 text-success-600" /> : <Circle className="h-3.5 w-3.5 text-surface-400" />}
        </button>
      )}
    </div>
  );
});
