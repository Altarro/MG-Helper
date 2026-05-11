import { memo } from 'react';
import { Link } from 'react-router';
import { Shield, Target, Scale } from 'lucide-react';
import { CardAccentList, CardAccentSection } from '@shared/components/CardAccentSection';
import { applyPolishTypography } from '@shared/utils/typography';
import { FRONT_CATEGORY_LABELS } from '../types';
import type { Front } from '../types';

interface FrontCardProps {
  front: Front;
}

export const FrontCard = memo(function FrontCard({ front }: FrontCardProps) {
  const { name, data, tags } = front;
  const categoryLabel = FRONT_CATEGORY_LABELS[data.category];
  const goalText = applyPolishTypography(data.goal);
  const stakesText = data.stakes.map((stake) => applyPolishTypography(stake));

  return (
    <Link
      to={`/fronts/${front.id}`}
      className="app-card flex flex-col gap-3 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgba(33,71,102,0.09)]">
            <Shield className="h-4 w-4 text-primary-700" />
          </div>
          <h3 className="truncate text-[1.05rem] font-semibold tracking-[-0.02em] text-surface-900">{name}</h3>
        </div>
        <span className="app-pill-muted shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
          {categoryLabel}
        </span>
      </div>

      {data.goal && (
        <CardAccentSection
          label="Cel frontu"
          icon={Target}
          tone="primary"
          maxLines={5}
          remeasureKey={goalText}
        >
          <p className="text-sm leading-6 whitespace-pre-wrap text-surface-700">{goalText}</p>
        </CardAccentSection>
      )}

      {data.stakes.length > 0 && (
        <CardAccentSection
          label="Stawki"
          icon={Scale}
          tone="warning"
          maxLines={5}
          remeasureKey={stakesText.join('\u0001')}
        >
          <CardAccentList items={stakesText} markerClassName="bg-warning-500/80" />
        </CardAccentSection>
      )}

      {tags && tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="app-pill rounded-full px-2.5 py-1 text-xs font-medium">
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">+{tags.length - 3}</span>
          )}
        </div>
      )}
    </Link>
  );
});
