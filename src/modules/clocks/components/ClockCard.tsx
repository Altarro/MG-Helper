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
      className={`app-card group flex cursor-pointer items-center gap-4 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5 ${dead ? 'opacity-70' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <ClockVisual segments={segments} filled={filled} size={64} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-surface-900 group-hover:text-primary-800">
            {clock.name}
          </h3>
          {completed && (
            <span className="app-pill rounded-full px-2.5 py-1 text-xs font-medium">
              Ukończony
            </span>
          )}
          {dead && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium">
              Martwy
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-surface-600">
          <span className="tabular-nums font-semibold text-primary-700">{filled}/{segments}</span>
          <span>segmentów</span>
          <div className="ml-1 h-2 w-24 overflow-hidden rounded-full bg-[rgba(86,93,94,0.18)]">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${(filled / segments) * 100}%` }}
            />
          </div>
        </div>

        {clock.tags.length > 0 && (
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <Tag className="h-3.5 w-3.5 shrink-0 text-surface-500" />
            {clock.tags.map((tag) => (
              <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
});
