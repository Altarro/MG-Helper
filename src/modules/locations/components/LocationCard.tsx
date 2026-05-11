import React from 'react';
import { Eye, FileText, MapPin, OctagonAlert } from 'lucide-react';
import { getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';
import { CardAccentSection } from '@shared/components/CardAccentSection';
import { useCampaign } from '@shared/db/CampaignContext';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';
import { getLocationLifecycleStatus } from '@shared/utils/entityData';
import { stripHtml } from '@shared/utils/sanitize';
import { applyPolishTypography } from '@shared/utils/typography';
import type { Location } from '../types';

const DANGER_LABELS = [
  'Bezpieczna',
  'Spokojnie',
  'Umiarkowane',
  'Niebezpiecznie',
  'Śmiertelnie',
  'Apokaliptyczne',
];
const TEXT_MAX_CHARS = 150;

interface LocationCardProps {
  location: Location;
  onClick?: () => void;
}

function previewText(value: string | undefined, maxChars = TEXT_MAX_CHARS): string {
  const text = (value ?? '').trim();
  return text.length > maxChars ? `${text.slice(0, maxChars).trimEnd()}...` : text;
}

export const LocationCard = React.memo(function LocationCard({
  location,
  onClick,
}: LocationCardProps) {
  const { locationType, danger } = location.data;
  const isDestroyed = getLocationLifecycleStatus({ data: location.data }) === 'completed';
  const thumbUrl = useAssetUrl(location.data.imageId ?? null, { thumb: true });
  const { campaignId } = useCampaign();
  const descriptionPreview = applyPolishTypography(previewText(stripHtml(location.description ?? '')));
  const senseRows = [
    { label: 'Widzisz', value: applyPolishTypography(previewText(location.data.senses.see)) },
    { label: 'Słyszysz', value: applyPolishTypography(previewText(location.data.senses.hear)) },
    { label: 'Czujesz', value: applyPolishTypography(previewText(location.data.senses.smell)) },
    { label: 'Atmosfera', value: applyPolishTypography(previewText(location.data.senses.feel)) },
  ].filter((row) => row.value);

  return (
    <article
      className={`app-card group focus-visible:ring-primary-500/35 flex w-full cursor-pointer flex-col gap-4 rounded-[1.35rem] p-5 text-left transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none ${
        isDestroyed ? 'opacity-90' : ''
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
            alt={location.data.imageAlt || location.name}
            className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-[0_4px_10px_rgba(18,45,66,0.12)]"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(33,71,102,0.12)] shadow-[inset_0_1px_0_rgba(255,250,240,0.24)]">
            <MapPin className="text-primary-800 h-4 w-4" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-surface-900 group-hover:text-primary-800 min-w-0 text-[1.32rem] leading-tight font-semibold tracking-[-0.02em]">
              {location.name}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {isDestroyed && (
              <span className="border-danger-300/50 bg-danger-50 text-danger-800 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold">
                <OctagonAlert className="h-3 w-3" aria-hidden />
                Zniszczona
              </span>
            )}
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              {getCatalogLabelByValue('locationType', locationType, campaignId)}
            </span>
            {danger > 0 && (
              <span className="app-danger-pill rounded-full px-2.5 py-1 text-xs font-medium">
                {DANGER_LABELS[danger] ?? `Poziom ${danger}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {senseRows.length > 0 && (
        <CardAccentSection
          label="Klimat"
          icon={Eye}
          tone="primary"
          maxLines={6}
          remeasureKey={senseRows.map((row) => `${row.label}:${row.value}`).join('|')}
        >
          <dl className="text-surface-600 flex flex-col gap-1.5 text-[13px] leading-5">
            {senseRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[5.6rem_minmax(0,1fr)] gap-2">
                <dt className="text-surface-500 font-medium">{row.label}:</dt>
                <dd className="min-w-0 whitespace-pre-wrap">{row.value}</dd>
              </div>
            ))}
          </dl>
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

      {location.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-[rgba(86,93,94,0.1)] pt-3">
          {location.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
          {location.tags.length > 4 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              +{location.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </article>
  );
});
