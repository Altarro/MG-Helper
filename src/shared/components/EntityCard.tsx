import { memo } from 'react';
import { Tag } from 'lucide-react';
import type { Entity } from '@shared/types/entity';
import { stripHtml } from '@shared/utils/sanitize';
import { EntityTypeBadge } from './EntityTypeBadge';

interface EntityCardProps {
  entity: Entity;
  onClick?: () => void;
  renderExtra?: (entity: Entity) => React.ReactNode;
  className?: string;
}

const DESCRIPTION_MAX_CHARS = 150;

export const EntityCard = memo(function EntityCard({
  entity,
  onClick,
  renderExtra,
  className = '',
}: EntityCardProps) {
  const plainDescription = stripHtml(entity.description ?? '');
  const preview =
    plainDescription.length > DESCRIPTION_MAX_CHARS
      ? plainDescription.slice(0, DESCRIPTION_MAX_CHARS).trimEnd() + '…'
      : plainDescription;

  return (
    <article
      className={`group flex cursor-pointer flex-col gap-2 rounded-lg border border-surface-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-surface-900 leading-tight group-hover:text-primary-700">
          {entity.name}
        </h3>
        <EntityTypeBadge
          type={entity.type}
          onClick={onClick}
          ariaLabel={onClick ? `Otworz detail encji ${entity.name}` : undefined}
        />
      </div>

      {preview && (
        <p className="text-xs text-surface-500 leading-relaxed line-clamp-3">{preview}</p>
      )}

      {renderExtra && <div className="mt-1">{renderExtra(entity)}</div>}

      {entity.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-auto pt-1">
          <Tag className="h-3 w-3 text-surface-400 shrink-0" />
          {entity.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-surface-100 px-1.5 py-0.5 text-xs text-surface-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
});
