import { memo } from 'react';
import { Link } from 'react-router';
import { Package } from 'lucide-react';
import { ITEM_TYPE_LABELS } from '../types';
import type { Item } from '../types';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';

interface ItemCardProps {
  item: Item;
}

export const ItemCard = memo(function ItemCard({ item }: ItemCardProps) {
  const thumbUrl = useAssetUrl(item.data.imageId ?? null, { thumb: true });
  return (
    <Link
      to={`/items/${item.id}`}
      className="app-card flex flex-col gap-3 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5"
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
        <span className="app-danger-pill ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs">
          {ITEM_TYPE_LABELS[item.data.itemType]}
        </span>
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
