import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronRight, Link2, X } from 'lucide-react';
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
  actions?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onRemoveItem?: (item: RelatedEntityItem) => void;
  removeAriaLabel?: (item: RelatedEntityItem) => string;
  hideHeader?: boolean;
}

function NarrativeEntityRow({
  item,
  meta,
  onRemoveItem,
  removeAriaLabel,
}: {
  item: RelatedEntityItem;
  meta?: (item: RelatedEntityItem) => string | null | undefined;
  onRemoveItem?: (item: RelatedEntityItem) => void;
  removeAriaLabel?: (item: RelatedEntityItem) => string;
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

  const mainContent = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-surface-800 truncate font-medium">{item.entity.name}</span>
          <EntityTypeBadge type={item.entity.type} size="sm" />
        </div>
        {metaText && <p className="text-surface-500 mt-1 text-xs leading-5">{metaText}</p>}
      </div>
      <ChevronRight className="text-surface-300 h-4 w-4 shrink-0" />
    </>
  );

  return (
    <div className="app-input-shell flex min-w-0 items-stretch overflow-hidden rounded-[1.2rem]">
      {detailPath ? (
        <Link
          to={detailPath}
          state={returnToSessionLive ? { returnToSessionLive } : undefined}
          className="hover:border-primary-300 flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgba(229,231,223,0.98)]"
        >
          {mainContent}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
          {mainContent}
        </div>
      )}
      {onRemoveItem ? (
        <div className="flex shrink-0 items-center self-stretch border-l border-[rgba(86,93,94,0.14)] bg-transparent px-2">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemoveItem(item);
            }}
            className="text-surface-400 hover:text-danger-700 hover:bg-danger-50 rounded-full p-1 transition-colors"
            aria-label={removeAriaLabel ? removeAriaLabel(item) : `Usuń powiązanie ${item.entity.name}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function NarrativeLinksSection({
  title,
  items,
  emptyMessage,
  meta,
  actions,
  actionLabel,
  onAction,
  onRemoveItem,
  removeAriaLabel,
  hideHeader = false,
}: NarrativeLinksSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      {!hideHeader && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-surface-500 text-xs font-semibold tracking-wide uppercase">{title}</h2>
          {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
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
      )}
      {!items || items.length === 0 ? (
        <InlineEmptyState message={emptyMessage} icon={<Link2 className="h-4 w-4" />} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <NarrativeEntityRow
              key={`${item.relation.id}-${item.entity.id}`}
              item={item}
              meta={meta}
              onRemoveItem={onRemoveItem}
              removeAriaLabel={removeAriaLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
