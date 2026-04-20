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
      ? `${plainDescription.slice(0, DESCRIPTION_MAX_CHARS).trimEnd()}...`
      : plainDescription;

  return (
    <article
      className={`app-card group flex cursor-pointer flex-col gap-3 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[1.02rem] font-semibold leading-tight tracking-[-0.02em] text-surface-900 group-hover:text-primary-800">
          {entity.name}
        </h3>
        <EntityTypeBadge
          type={entity.type}
          onClick={onClick}
          ariaLabel={onClick ? `Otwórz detail encji ${entity.name}` : undefined}
        />
      </div>

      {preview && (
        <p className="line-clamp-3 text-sm leading-6 text-surface-700">{preview}</p>
      )}

      {renderExtra && <div className="mt-1">{renderExtra(entity)}</div>}

      {entity.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Tag className="h-3.5 w-3.5 shrink-0 text-surface-500" />
          {entity.tags.map((tag) => (
            <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
});
