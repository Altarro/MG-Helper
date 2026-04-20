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
  const threatPath = useThreatDetailPath(
    item.entity.type === 'threat' ? item.entity.id : undefined,
  );
  const directPath = getEntityDetailPath(item.entity.type, item.entity.id);
  const detailPath = item.entity.type === 'threat' ? (threatPath ?? null) : directPath;
  const metaText = meta?.(item);
  const returnToSessionLive =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnToSessionLive' in location.state &&
    typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-surface-800 truncate font-medium">{item.entity.name}</span>
          <EntityTypeBadge type={item.entity.type} size="sm" />
          {detailPath ? (
            <span className="app-pill-muted rounded-full px-2 py-0.5 text-[11px] font-medium">
              Detail
            </span>
          ) : null}
        </div>
        {metaText && <p className="text-surface-500 mt-1 text-xs leading-5">{metaText}</p>}
      </div>
      <ChevronRight className="text-surface-300 h-4 w-4 shrink-0" />
    </>
  );

  if (!detailPath) {
    return (
      <div className="app-input-shell flex items-center gap-3 rounded-[1.2rem] px-4 py-3">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={detailPath}
      state={returnToSessionLive ? { returnToSessionLive } : undefined}
      className="app-input-shell hover:border-primary-300 flex items-center gap-3 rounded-[1.2rem] px-4 py-3 transition-colors hover:bg-[rgba(229,231,223,0.98)]"
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-surface-500 text-xs font-semibold tracking-wide uppercase">{title}</h2>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="app-button-secondary focus:ring-primary-500/30 rounded-full px-3 py-1.5 text-xs font-medium focus:ring-2 focus:outline-none"
          >
            {actionLabel ?? '+ Dodaj'}
          </button>
        )}
      </div>
      {!items || items.length === 0 ? (
        <InlineEmptyState message={emptyMessage} icon={<Link2 className="h-4 w-4" />} />
      ) : (
        <div className="flex flex-col gap-2.5">
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
