import { Link, useLocation } from 'react-router';
import { ChevronRight, Link2 } from 'lucide-react';
import { EntityTypeBadge } from './EntityTypeBadge';
import { InlineEmptyState } from './InlineEmptyState';
import { useThreatDetailPath } from '@shared/hooks/useThreatDetailPath';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';
import type { RelatedEntityItem } from '@shared/hooks/useRelatedEntities';

interface NarrativeLinksSectionProps {
  title: string;
  items: RelatedEntityItem[] | undefined;
  emptyMessage: string;
  meta?: (item: RelatedEntityItem) => string | null | undefined;
  actionLabel?: string;
  onAction?: () => void;
}

function NarrativeEntityRow({
  item,
  meta,
}: {
  item: RelatedEntityItem;
  meta?: (item: RelatedEntityItem) => string | null | undefined;
}) {
  const location = useLocation();
  const threatPath = useThreatDetailPath(item.entity.type === 'threat' ? item.entity.id : undefined);
  const directPath = getEntityDetailPath(item.entity.type, item.entity.id);
  const detailPath = item.entity.type === 'threat' ? threatPath ?? null : directPath;
  const metaText = meta?.(item);
  const returnToSessionLive = typeof location.state === 'object'
    && location.state !== null
    && 'returnToSessionLive' in location.state
    && typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-surface-800">{item.entity.name}</span>
          <EntityTypeBadge type={item.entity.type} size="sm" />
          {detailPath ? (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-surface-500 ring-1 ring-inset ring-surface-200">
              Detail
            </span>
          ) : null}
        </div>
        {metaText && (
          <p className="mt-1 text-xs text-surface-500">{metaText}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-surface-300" />
    </>
  );

  if (!detailPath) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={detailPath}
      state={returnToSessionLive ? { returnToSessionLive } : undefined}
      className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 transition-colors hover:border-primary-200 hover:bg-primary-50"
    >
      {content}
    </Link>
  );
}

export function NarrativeLinksSection({
  title,
  items,
  emptyMessage,
  meta,
  actionLabel,
  onAction,
}: NarrativeLinksSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
          {title}
        </h2>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-md px-1.5 py-1 text-xs text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            {actionLabel ?? '+ Dodaj'}
          </button>
        )}
      </div>
      {!items || items.length === 0 ? (
        <InlineEmptyState
          message={emptyMessage}
          icon={<Link2 className="h-4 w-4" />}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <NarrativeEntityRow
              key={`${item.relation.id}-${item.entity.id}`}
              item={item}
              meta={meta}
            />
          ))}
        </div>
      )}
    </div>
  );
}
