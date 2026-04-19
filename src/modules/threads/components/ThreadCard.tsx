import { memo } from 'react';
import { Tag } from 'lucide-react';
import {
  THREAD_KIND_LABELS,
  THREAD_PRIORITY_LABELS,
  THREAD_STATUS_LABELS,
} from '../types';
import type { Thread } from '../types';
import { stripHtml } from '@shared/utils/sanitize';

const DESCRIPTION_MAX_CHARS = 120;

interface ThreadCardProps {
  thread: Thread;
  onClick?: () => void;
  className?: string;
}

export const ThreadCard = memo(function ThreadCard({ thread, onClick, className = '' }: ThreadCardProps) {
  const plainDescription = stripHtml(thread.description ?? '');
  const preview =
    plainDescription.length > DESCRIPTION_MAX_CHARS
      ? plainDescription.slice(0, DESCRIPTION_MAX_CHARS).trimEnd() + '…'
      : plainDescription;

  const isCompleted = thread.data.status === 'completed';

  return (
    <article
      className={`group flex cursor-pointer rounded-lg border border-surface-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      {/* Color bar */}
      <div
        className="w-1.5 shrink-0"
        style={{ backgroundColor: thread.data.color }}
        aria-hidden="true"
      />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`text-sm font-semibold leading-tight group-hover:text-primary-700 ${isCompleted ? 'text-surface-400' : 'text-surface-900'}`}>
            {thread.name}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              isCompleted
                ? 'bg-surface-100 text-surface-500'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {THREAD_STATUS_LABELS[thread.data.status]}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700">
            {THREAD_KIND_LABELS[thread.data.kind ?? 'side']}
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            {THREAD_PRIORITY_LABELS[thread.data.priority ?? 'normal']}
          </span>
        </div>

        {preview && (
          <p className="text-xs text-surface-500 leading-relaxed line-clamp-2">{preview}</p>
        )}

        {thread.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-auto pt-1">
            <Tag className="h-3 w-3 text-surface-400 shrink-0" />
            {thread.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-surface-100 px-1.5 py-0.5 text-xs text-surface-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
});
