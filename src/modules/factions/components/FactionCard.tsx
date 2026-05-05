import { memo } from 'react';
import { Archive, FileText, Flag, Target } from 'lucide-react';
import { CardAccentList, CardAccentSection } from '@shared/components/CardAccentSection';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';
import { getFactionLifecycleStatus } from '@shared/utils/entityData';
import { stripHtml } from '@shared/utils/sanitize';
import type { Faction } from '../types';

const TEXT_MAX_CHARS = 150;

interface FactionCardProps {
  faction: Faction;
  onClick?: () => void;
}

function previewText(value: string | undefined, maxChars = TEXT_MAX_CHARS): string {
  const text = (value ?? '').trim();
  return text.length > maxChars ? `${text.slice(0, maxChars).trimEnd()}...` : text;
}

export const FactionCard = memo(function FactionCard({ faction, onClick }: FactionCardProps) {
  const thumbUrl = useAssetUrl(faction.data.imageId ?? null, { thumb: true });
  const isDisbanded = getFactionLifecycleStatus({ data: faction.data }) === 'completed';
  const goalsPreview = faction.data.goals.slice(0, 4).map((goal) => previewText(goal, 90));
  const resourcesPreview = faction.data.resources
    .slice(0, 4)
    .map((resource) => previewText(resource, 90));
  const descriptionPreview = previewText(stripHtml(faction.description ?? ''));

  return (
    <article
      className={`app-card group focus-visible:ring-primary-500/35 flex cursor-pointer flex-col gap-4 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none ${
        isDisbanded ? 'opacity-75' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="flex items-center gap-3">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={faction.data.imageAlt || faction.name}
            className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-[0_4px_10px_rgba(18,45,66,0.12)]"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(33,71,102,0.12)] shadow-[inset_0_1px_0_rgba(255,250,240,0.24)]">
            <Flag className="text-primary-800 h-4 w-4" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0 flex-1 self-center">
            <h3 className="text-surface-900 group-hover:text-primary-800 min-w-0 text-[1.32rem] leading-tight font-semibold tracking-[-0.02em]">
              {faction.name}
            </h3>
          </div>
          {isDisbanded && (
            <span className="app-pill-muted shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold">
              Rozbita
            </span>
          )}
        </div>
      </div>

      {goalsPreview.length > 0 && (
        <CardAccentSection
          label="Cele"
          icon={Target}
          tone="primary"
          maxLines={5}
          remeasureKey={goalsPreview.join('|')}
        >
          <CardAccentList items={goalsPreview} markerClassName="bg-primary-500/75" />
        </CardAccentSection>
      )}

      {resourcesPreview.length > 0 && (
        <CardAccentSection
          label="Zasoby"
          icon={Archive}
          tone="warning"
          maxLines={5}
          remeasureKey={resourcesPreview.join('|')}
        >
          <CardAccentList items={resourcesPreview} markerClassName="bg-warning-500/80" />
        </CardAccentSection>
      )}

      {descriptionPreview && (
        <CardAccentSection
          label="Opis"
          icon={FileText}
          tone="surface"
          maxLines={4}
          remeasureKey={descriptionPreview}
        >
          <p className="text-surface-700 text-sm leading-6 whitespace-pre-wrap">
            {descriptionPreview}
          </p>
        </CardAccentSection>
      )}

      {faction.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-[rgba(86,93,94,0.1)] pt-3">
          {faction.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
          {faction.tags.length > 4 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              +{faction.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </article>
  );
});
