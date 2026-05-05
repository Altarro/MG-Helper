import { memo } from 'react';
import { Archive, FileText, OctagonAlert, Package } from 'lucide-react';
import { getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';
import { CardAccentList, CardAccentSection } from '@shared/components/CardAccentSection';
import { useCampaign } from '@shared/db/CampaignContext';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';
import { getItemLifecycleStatus } from '@shared/utils/entityData';
import { stripHtml } from '@shared/utils/sanitize';
import type { Item } from '../types';

const TEXT_MAX_CHARS = 150;

interface ItemCardProps {
  item: Item;
  onClick?: () => void;
}

function previewText(value: string | undefined, maxChars = TEXT_MAX_CHARS): string {
  const text = (value ?? '').trim();
  return text.length > maxChars ? `${text.slice(0, maxChars).trimEnd()}...` : text;
}

export const ItemCard = memo(function ItemCard({ item, onClick }: ItemCardProps) {
  const isDestroyed = getItemLifecycleStatus({ data: item.data }) === 'completed';
  const thumbUrl = useAssetUrl(item.data.imageId ?? null, { thumb: true });
  const { campaignId } = useCampaign();
  const propertiesPreview = item.data.properties
    .slice(0, 5)
    .map((property) => previewText(property, 90));
  const descriptionPreview = previewText(stripHtml(item.description ?? ''));

  return (
    <article
      className={`app-card group focus-visible:ring-primary-500/35 flex cursor-pointer flex-col gap-4 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none ${
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
            alt={item.data.imageAlt || item.name}
            className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-[0_4px_10px_rgba(18,45,66,0.12)]"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(242,196,88,0.18)] shadow-[inset_0_1px_0_rgba(255,250,240,0.24)]">
            <Package className="text-warning-600 h-4 w-4" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-surface-900 group-hover:text-primary-800 min-w-0 text-[1.32rem] leading-tight font-semibold tracking-[-0.02em]">
              {item.name}
            </h3>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {isDestroyed && (
              <span className="border-danger-300/50 bg-danger-50 text-danger-800 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold">
                <OctagonAlert className="h-3 w-3" aria-hidden />
                Zniszczony
              </span>
            )}
            <span className="app-danger-pill rounded-full px-2.5 py-1 text-xs">
              {getCatalogLabelByValue('itemType', item.data.itemType, campaignId)}
            </span>
          </div>
        </div>
      </div>

      {propertiesPreview.length > 0 && (
        <CardAccentSection
          label="Właściwości"
          icon={Archive}
          tone="warning"
          maxLines={6}
          remeasureKey={propertiesPreview.join('|')}
        >
          <CardAccentList items={propertiesPreview} markerClassName="bg-warning-500/80" />
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

      {item.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-[rgba(86,93,94,0.1)] pt-3">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
          {item.tags.length > 4 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              +{item.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </article>
  );
});
