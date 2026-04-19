import { memo } from 'react';
import { Link } from 'react-router';
import { Package } from 'lucide-react';
import { ITEM_TYPE_LABELS } from '../types';
import type { Item } from '../types';

interface ItemCardProps {
  item: Item;
}

export const ItemCard = memo(function ItemCard({ item }: ItemCardProps) {
  return (
    <Link
      to={`/items/${item.id}`}
      className="flex flex-col gap-2 rounded-lg border border-surface-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Package className="h-4 w-4 shrink-0 text-amber-500" />
        <h3 className="truncate font-semibold text-surface-900">{item.name}</h3>
        <span className="ml-auto shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
          {ITEM_TYPE_LABELS[item.data.itemType]}
        </span>
      </div>
      {item.data.properties.length > 0 && (
        <p className="text-xs text-surface-500 line-clamp-1">
          {item.data.properties.slice(0, 3).join(' • ')}
        </p>
      )}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
});
