import { Fragment, memo, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, FileText, GitBranch, Scale, Tag } from 'lucide-react';
import { CardAccentList, CardAccentSection } from '@shared/components/CardAccentSection';
import {
  getThreadStakes,
  THREAD_KIND_LABELS,
  THREAD_PRIORITY_LABELS,
  THREAD_STATUS_LABELS,
} from '../types';
import type { Thread } from '../types';
import { stripHtml } from '@shared/utils/sanitize';
import { applyPolishTypography } from '@shared/utils/typography';

const DESCRIPTION_MAX_CHARS = 120;
const RESOLUTION_MAX_CHARS = 160;

export interface ThreadQuestlineCardItem {
  id: string;
  name: string;
  label: string;
}

export interface ThreadQuestlineCardInfo {
  parents: ThreadQuestlineCardItem[];
  children: ThreadQuestlineCardItem[];
}

interface ThreadQuestlineCardGroup {
  label: string;
  items: ThreadQuestlineCardItem[];
}

interface ThreadCardProps {
  thread: Thread;
  onClick?: () => void;
  className?: string;
  questline?: ThreadQuestlineCardInfo;
  actionSlot?: ReactNode;
}

function getQuestlineGroups(questline?: ThreadQuestlineCardInfo): ThreadQuestlineCardGroup[] {
  const groups = new Map<string, ThreadQuestlineCardItem[]>();

  for (const item of [...(questline?.parents ?? []), ...(questline?.children ?? [])]) {
    const group = groups.get(item.label);
    if (group) {
      group.push(item);
    } else {
      groups.set(item.label, [item]);
    }
  }

  return [...groups].map(([label, items]) => ({ label, items }));
}

function stopCardEvent(
  event: KeyboardEvent<HTMLAnchorElement> | MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>,
) {
  event.stopPropagation();
}

export const ThreadCard = memo(function ThreadCard({
  thread,
  onClick,
  className = '',
  questline,
  actionSlot,
}: ThreadCardProps) {
  const plainDescription = stripHtml(thread.description ?? '');
  const preview =
    plainDescription.length > DESCRIPTION_MAX_CHARS
      ? `${plainDescription.slice(0, DESCRIPTION_MAX_CHARS).trimEnd()}...`
      : plainDescription;
  const resolution = (thread.data.resolution ?? '').trim();
  const resolutionPreview =
    resolution.length > RESOLUTION_MAX_CHARS
      ? `${resolution.slice(0, RESOLUTION_MAX_CHARS).trimEnd()}...`
      : resolution;
  const stakesText = getThreadStakes(thread).map((stake) => applyPolishTypography(stake));

  const isCompleted = thread.data.status === 'completed';
  const questlineGroups = getQuestlineGroups(questline);
  const hasQuestline = questlineGroups.length > 0;

  return (
    <article
      className={`app-card group flex cursor-pointer overflow-hidden rounded-[1.35rem] transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 ${className}`}
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
          <CardAccentSection
            label="Opis"
            icon={FileText}
            tone="surface"
            maxLines={4}
            remeasureKey={preview}
          >
            <p className="text-sm leading-6 whitespace-pre-wrap text-surface-700">
              {applyPolishTypography(preview)}
            </p>
          </CardAccentSection>
        )}

        {stakesText.length > 0 && (
          <CardAccentSection
            label="Stawki"
            icon={Scale}
            tone="warning"
            maxLines={5}
            remeasureKey={stakesText.join('\u0001')}
          >
            <CardAccentList items={stakesText} markerClassName="bg-warning-500/80" />
          </CardAccentSection>
        )}

        {isCompleted && resolutionPreview && (
          <CardAccentSection
            label="Efekt"
            icon={CheckCircle2}
            tone="success"
            maxLines={4}
            remeasureKey={resolutionPreview}
          >
            <p className="text-sm leading-6 whitespace-pre-wrap text-surface-700">
              {applyPolishTypography(resolutionPreview)}
            </p>
          </CardAccentSection>
        )}

        {hasQuestline && (
          <CardAccentSection
            label="Linia wątku"
            icon={GitBranch}
            tone="primary"
            maxLines={5}
            remeasureKey={questlineGroups
              .map((group) => `${group.label}:${group.items.map((item) => item.id).join('|')}`)
              .join(';')}
          >
            <div className="flex flex-col gap-2">
              {questlineGroups.map((group) => (
                <p key={group.label} className="min-w-0 text-sm leading-6 text-surface-700">
                  <span className="font-medium text-surface-600">
                    {applyPolishTypography(group.label)}:
                  </span>
                  <span> </span>
                  <span>
                    {group.items.map((item, index) => (
                      <Fragment key={item.id}>
                        {index > 0 && <span className="text-surface-500">, </span>}
                        <Link
                          to={`/threads/${item.id}`}
                          className="rounded-sm underline decoration-transparent underline-offset-4 transition-colors hover:text-primary-700 hover:decoration-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                          onClick={stopCardEvent}
                          onPointerDown={stopCardEvent}
                          onKeyDown={stopCardEvent}
                        >
                          {applyPolishTypography(item.name)}
                        </Link>
                      </Fragment>
                    ))}
                  </span>
                </p>
              ))}
            </div>
          </CardAccentSection>
        )}

        {(thread.tags.length > 0 || actionSlot) && (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-surface-200/50 pt-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {thread.tags.length > 0 && (
                <>
                  <Tag className="h-3.5 w-3.5 shrink-0 text-surface-500" />
                  {thread.tags.map((tag) => (
                    <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
                      {tag}
                    </span>
                  ))}
                </>
              )}
            </div>
            {actionSlot ? <div className="ml-auto flex shrink-0 items-center gap-1.5">{actionSlot}</div> : null}
          </div>
        )}
      </div>
    </article>
  );
});
