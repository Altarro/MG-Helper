import { memo } from 'react';
import { Link } from 'react-router';
import { Shield } from 'lucide-react';
import { FRONT_CATEGORY_LABELS } from '../types';
import type { Front } from '../types';

interface FrontCardProps {
  front: Front;
}

export const FrontCard = memo(function FrontCard({ front }: FrontCardProps) {
  const { name, data, tags } = front;
  const categoryLabel = FRONT_CATEGORY_LABELS[data.category];

  return (
    <Link
      to={`/fronts/${front.id}`}
      className="flex flex-col gap-2 rounded-lg border border-surface-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-4 w-4 shrink-0 text-primary-500" />
          <h3 className="truncate font-semibold text-surface-900">{name}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600">
          {categoryLabel}
        </span>
      </div>

      {data.goal && (
        <p className="text-xs font-medium text-primary-700 line-clamp-2">{data.goal}</p>
      )}

      {data.stakes.length > 0 && (
        <p className="text-xs text-surface-500 line-clamp-2">
          Stawki: {data.stakes.slice(0, 2).join(' • ')}{data.stakes.length > 2 ? ` +${data.stakes.length - 2}` : ''}
        </p>
      )}

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
    </Link>
  );
});
