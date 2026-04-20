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
      ? `${plainDescription.slice(0, DESCRIPTION_MAX_CHARS).trimEnd()}...`
      : plainDescription;

  const isCompleted = thread.data.status === 'completed';

  return (
    <article
      className={`app-card group flex cursor-pointer overflow-hidden rounded-[1.35rem] transition-all hover:-translate-y-0.5 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="w-2 shrink-0" style={{ backgroundColor: thread.data.color }} aria-hidden="true" />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className={`text-[1.02rem] font-semibold leading-tight tracking-[-0.02em] ${isCompleted ? 'text-surface-500' : 'text-surface-900 group-hover:text-primary-800'}`}>
            {thread.name}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              isCompleted ? 'app-pill-muted' : 'app-pill'
            }`}
          >
            {THREAD_STATUS_LABELS[thread.data.status]}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="app-pill rounded-full px-2.5 py-1 text-[11px] font-medium">
            {THREAD_KIND_LABELS[thread.data.kind ?? 'side']}
          </span>
          <span className="app-danger-pill rounded-full px-2.5 py-1 text-[11px] font-medium">
            {THREAD_PRIORITY_LABELS[thread.data.priority ?? 'normal']}
          </span>
        </div>

        {preview && (
          <p className="line-clamp-3 text-sm leading-6 text-surface-700">{preview}</p>
        )}

        {thread.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <Tag className="h-3.5 w-3.5 shrink-0 text-surface-500" />
            {thread.tags.map((tag) => (
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
