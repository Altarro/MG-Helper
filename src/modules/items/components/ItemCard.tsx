import { memo } from 'react';
import { Link } from 'react-router';
import { Package, OctagonAlert } from 'lucide-react';
import { ITEM_TYPE_LABELS } from '../types';
import type { Item } from '../types';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';
import { getItemLifecycleStatus } from '@shared/utils/entityData';

interface ItemCardProps {
  item: Item;
}

export const ItemCard = memo(function ItemCard({ item }: ItemCardProps) {
  const isDestroyed = getItemLifecycleStatus({ data: item.data }) === 'completed';
  const thumbUrl = useAssetUrl(item.data.imageId ?? null, { thumb: true });
  return (
    <Link
      to={`/items/${item.id}`}
      className={`app-card flex flex-col gap-3 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 ${
        isDestroyed ? 'opacity-90' : ''
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={item.data.imageAlt || item.name}
            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-[0_4px_10px_rgba(18,45,66,0.12)]"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgba(242,196,88,0.14)]">
            <Package className="h-4 w-4 text-warning-600" />
          </div>
        )}
        <h3 className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-surface-900">{item.name}</h3>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
          {isDestroyed && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-danger-300/50 bg-danger-50 px-2 py-0.5 text-[10px] font-semibold text-danger-800">
              <OctagonAlert className="h-3 w-3" aria-hidden />
              Zniszcz./zgub.
            </span>
          )}
          <span className="app-danger-pill rounded-full px-2.5 py-1 text-xs">
            {ITEM_TYPE_LABELS[item.data.itemType]}
          </span>
        </div>
      </div>
      {item.data.properties.length > 0 && (
        <p className="line-clamp-2 text-sm leading-6 text-surface-700">
          {item.data.properties.slice(0, 3).join(' • ')}
        </p>
      )}
      {item.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="app-danger-pill rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
});
