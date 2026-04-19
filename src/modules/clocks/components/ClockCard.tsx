import { memo } from 'react';
import { ClockVisual } from './ClockVisual';
import type { Clock } from '../types';
import { isCompleted } from '../types';
import { Tag } from 'lucide-react';

interface ClockCardProps {
  clock: Clock;
  onClick?: () => void;
  className?: string;
}

export const ClockCard = memo(function ClockCard({ clock, onClick, className = '' }: ClockCardProps) {
  const { segments, filled, isActive } = clock.data;
  const completed = isCompleted(clock);
  const dead = isActive === false;

  return (
    <article
      className={`group flex cursor-pointer items-center gap-4 rounded-lg border border-surface-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${dead ? 'opacity-60' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <ClockVisual segments={segments} filled={filled} size={64} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-surface-900 group-hover:text-primary-700">
            {clock.name}
          </h3>
          {completed && (
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Ukończony
            </span>
          )}
          {dead && (
            <span className="shrink-0 rounded-full bg-surface-200 px-2 py-0.5 text-xs font-medium text-surface-500">
              Martwy
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-surface-500">
          <span className="tabular-nums font-medium text-primary-600">{filled}/{segments}</span>
          <span>segmentów</span>
          {/* progress bar */}
          <div className="ml-1 h-1.5 w-20 overflow-hidden rounded-full bg-surface-100">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${(filled / segments) * 100}%` }}
            />
          </div>
        </div>

        {clock.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            <Tag className="h-3 w-3 shrink-0 text-surface-400" />
            {clock.tags.map((tag) => (
              <span key={tag} className="rounded bg-surface-100 px-1.5 py-0.5 text-xs text-surface-600">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
});
