import type { EntityType } from '@shared/types/entity';
import { getEntityTypeBadgeClasses, getEntityTypeLabel } from '@shared/utils/entityTypeMeta';

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-xs',
} as const;

interface EntityTypeBadgeProps {
  type: EntityType;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

export function EntityTypeBadge({
  type,
  size = 'md',
  className = '',
  onClick,
  ariaLabel,
}: EntityTypeBadgeProps) {
  const classes = `inline-flex items-center rounded-full font-medium leading-none ring-1 ring-inset ${SIZE_CLASSES[size]} ${getEntityTypeBadgeClasses(type)} ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? `Otw?rz detail typu ${getEntityTypeLabel(type)}`}
        className={`${classes} cursor-pointer transition-colors hover:brightness-95`}
        title={getEntityTypeLabel(type)}
      >
        {getEntityTypeLabel(type)}
      </button>
    );
  }

  return (
    <span
      className={classes}
      title={getEntityTypeLabel(type)}
    >
      {getEntityTypeLabel(type)}
    </span>
  );
}
