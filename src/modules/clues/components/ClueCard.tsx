import { memo } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  Lightbulb,
  MapPin,
  Package,
  User,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { useCampaign } from '@shared/db/CampaignContext';
import { getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';
import { CardAccentSection } from '@shared/components/CardAccentSection';
import { EntityTypeBadge } from '@shared/components/EntityTypeBadge';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';
import { stripHtml } from '@shared/utils/sanitize';
import { applyPolishTypography } from '@shared/utils/typography';
import type { ClueStrengthOption } from '@shared/domain/storyContracts';
import type { Clue } from '../types';

const DESCRIPTION_MAX_CHARS = 120;
const HINT_MAX_CHARS = 160;

const CLUE_ICONS: Record<string, LucideIcon> = {
  character: User,
  location: MapPin,
  event: Zap,
  item: Package,
};

const CLUE_STRENGTH_PILL_CLASSES: Record<ClueStrengthOption, string> = {
  weak: 'border-[#d9c486]/70 bg-[#f3e8bd]/70 text-[#7b5c10]',
  standard: 'border-primary-200/70 bg-primary-100/70 text-primary-800',
  strong: 'border-emerald-300/70 bg-emerald-100/80 text-emerald-800',
};

interface ClueCardProps {
  clue: Clue;
  onClick?: () => void;
  onToggleDiscovered?: (clue: Clue) => void;
}

export const ClueCard = memo(function ClueCard({ clue, onClick, onToggleDiscovered }: ClueCardProps) {
  const { campaignId } = useCampaign();
  const primaryType = clue.data.clueTypes[0] ?? 'event';
  const Icon = CLUE_ICONS[primaryType] ?? Zap;
  const discovered = clue.data.discovered;
  const hintPreview =
    clue.data.hint.length > HINT_MAX_CHARS
      ? `${clue.data.hint.slice(0, HINT_MAX_CHARS).trimEnd()}...`
      : clue.data.hint;
  const plainDescription = stripHtml(clue.description ?? '');
  const descriptionPreview =
    plainDescription.length > DESCRIPTION_MAX_CHARS
      ? `${plainDescription.slice(0, DESCRIPTION_MAX_CHARS).trimEnd()}...`
      : plainDescription;

  return (
    <article
      className={`group flex cursor-pointer flex-col gap-3 rounded-[1.35rem] p-4 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 ${
        discovered ? 'bg-[linear-gradient(180deg,rgba(215,234,220,0.92)_0%,rgba(204,227,212,0.96)_100%)] border border-[rgba(95,155,125,0.22)] shadow-[0_12px_28px_rgba(18,45,66,0.08),inset_0_1px_0_rgba(255,250,240,0.18)]' : 'app-card'
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.() : undefined}
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${discovered ? 'bg-[rgba(95,155,125,0.16)]' : 'bg-[rgba(111,146,164,0.14)]'}`}>
          <Icon className={`h-4 w-4 ${discovered ? 'text-success-600' : 'text-primary-600'}`} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 flex-1 text-[1.02rem] font-semibold leading-tight tracking-[-0.02em] text-surface-900 group-hover:text-primary-800">
              {clue.name}
            </span>
            <div
              className={`flex shrink-0 items-center overflow-hidden rounded-full border text-xs font-medium ${
                discovered
                  ? 'border-[rgba(95,155,125,0.26)] bg-[rgba(95,155,125,0.14)] text-success-700'
                  : 'border-[rgba(86,93,94,0.16)] bg-[rgba(255,250,240,0.34)] text-surface-600'
              }`}
            >
              <span className="px-2.5 py-1">{discovered ? 'Odkryta' : 'Nieodkryta'}</span>
              {onToggleDiscovered && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleDiscovered(clue);
                  }}
                  aria-label={discovered ? 'Oznacz jako nieodkrytą' : 'Oznacz jako odkrytą'}
                  className="flex h-7 w-7 items-center justify-center border-l border-current/15 bg-white/18 transition-colors hover:bg-white/36"
                >
                  {discovered ? (
                    <CheckCircle2 className="h-4 w-4 text-success-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-surface-500" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {clue.data.clueTypes.map((type) => (
              <span key={type} className="app-pill rounded-full px-2.5 py-1 text-xs">
                {getCatalogLabelByValue('clueType', type, campaignId)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {hintPreview && (
        <CardAccentSection
          label="Wskazówka"
          icon={Lightbulb}
          tone={discovered ? 'success' : 'primary'}
          maxLines={4}
          remeasureKey={hintPreview}
        >
          <p className="text-sm leading-6 whitespace-pre-wrap text-surface-700">
            {applyPolishTypography(hintPreview)}
          </p>
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
          <p className="text-sm leading-6 whitespace-pre-wrap text-surface-700">
            {applyPolishTypography(descriptionPreview)}
          </p>
        </CardAccentSection>
      )}

      {clue.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {clue.tags.map((tag) => (
            <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
});

export const ClueRow = memo(function ClueRow({
  clue,
  metaLabel,
  metaTone,
  onToggleDiscovered,
  onRemove,
}: {
  clue: Clue;
  metaLabel?: string;
  metaTone?: ClueStrengthOption;
  onToggleDiscovered?: (clue: Clue) => void;
  onRemove?: (clue: Clue) => void;
}) {
  const { campaignId } = useCampaign();
  const discovered = clue.data.discovered;
  const detailPath = getEntityDetailPath('clue', clue.id) ?? `/clues/${clue.id}`;

  return (
    <div
      className={`flex min-w-0 items-stretch overflow-hidden rounded-[1.2rem] app-input-shell ${
        discovered ? 'border-[rgba(95,155,125,0.35)] bg-[rgba(229,241,233,0.55)]' : ''
      }`}
    >
      <Link
        to={detailPath}
        className="hover:border-primary-300 flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgba(229,231,223,0.98)]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-surface-800">{clue.name}</span>
            <EntityTypeBadge type="clue" size="sm" />
            {clue.data.clueTypes.slice(0, 2).map((type) => (
              <span
                key={type}
                className="app-pill-muted rounded-full px-2 py-0.5 text-[11px] font-medium"
              >
                {getCatalogLabelByValue('clueType', type, campaignId)}
              </span>
            ))}
            {discovered && (
              <span className="rounded-full border border-[rgba(95,155,125,0.22)] bg-[rgba(95,155,125,0.14)] px-2 py-0.5 text-[11px] font-medium text-success-700">
                Odkryta
              </span>
            )}
            {metaLabel && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  metaTone ? CLUE_STRENGTH_PILL_CLASSES[metaTone] : 'app-pill-muted'
                }`}
              >
                {metaLabel}
              </span>
            )}
          </div>
          {clue.data.hint ? (
            <p className="text-surface-500 mt-1 line-clamp-2 text-xs leading-5">{clue.data.hint}</p>
          ) : null}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-surface-300" />
      </Link>
      {(onToggleDiscovered || onRemove) ? (
        <div className="flex shrink-0 items-center self-stretch border-l border-[rgba(86,93,94,0.14)] bg-transparent px-2">
          {onToggleDiscovered ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleDiscovered(clue);
              }}
              aria-label={discovered ? 'Oznacz jako nieodkrytą' : 'Oznacz jako odkrytą'}
              className="flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-[rgba(229,231,223,0.65)]"
            >
              {discovered ? (
                <CheckCircle2 className="h-4 w-4 text-success-600" />
              ) : (
                <Circle className="text-surface-400 h-4 w-4" />
              )}
            </button>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(clue);
              }}
              aria-label={`Usuń wskazówkę ${clue.name} z tego widoku`}
              className="text-surface-400 hover:text-danger-700 hover:bg-danger-50 rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
