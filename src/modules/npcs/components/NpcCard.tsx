import React from 'react';
import {
  Crown,
  Eye,
  FileText,
  Heart,
  MapPin,
  MessageCircle,
  Skull,
  Target,
  User,
} from 'lucide-react';
import { CardAccentSection } from '@shared/components/CardAccentSection';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';
import { getNpcLifecycleStatus } from '@shared/utils/entityData';
import { stripHtml } from '@shared/utils/sanitize';
import type { Npc } from '../types';

const TEXT_MAX_CHARS = 150;

interface NpcCardProps {
  npc: Npc;
  onClick?: () => void;
  currentLocationName?: string;
}

function previewText(value: string | undefined, maxChars = TEXT_MAX_CHARS): string {
  const text = (value ?? '').trim();
  return text.length > maxChars ? `${text.slice(0, maxChars).trimEnd()}...` : text;
}

export const NpcCard = React.memo(function NpcCard({
  npc,
  onClick,
  currentLocationName,
}: NpcCardProps) {
  const isPC = npc.data?.isPC === true;
  const isDead = getNpcLifecycleStatus({ data: npc.data }) === 'completed';
  const thumbUrl = useAssetUrl(npc.data?.imageId ?? null, { thumb: true });
  const instinctPreview = previewText(npc.data?.instinct);
  const motivationPreview = previewText(npc.data?.motivation);
  const appearancePreview = previewText(npc.data?.appearance);
  const playStylePreview = previewText(npc.data?.playStyle);
  const descriptionPreview = previewText(stripHtml(npc.description ?? ''));

  return (
    <article
      className={`app-card group focus-visible:ring-primary-500/35 flex w-full cursor-pointer flex-col gap-4 rounded-[1.35rem] p-5 text-left transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none ${
        isDead ? 'opacity-90' : ''
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
            alt={npc.data?.imageAlt || npc.name}
            className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-[0_4px_10px_rgba(18,45,66,0.12)]"
          />
        ) : (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,250,240,0.24)] ${isPC ? 'bg-[rgba(242,196,88,0.18)]' : 'bg-[rgba(33,71,102,0.12)]'}`}
          >
            {isPC ? (
              <Crown className="text-warning-600 h-4 w-4" />
            ) : (
              <User className="text-primary-800 h-4 w-4" />
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-surface-900 group-hover:text-primary-800 min-w-0 text-[1.32rem] leading-tight font-semibold tracking-[-0.02em]">
              {npc.name}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {isPC && (
              <span className="app-danger-pill rounded-full px-2.5 py-1 text-xs font-medium">
                Gracz
              </span>
            )}
            {isPC && npc.data?.playerName && (
              <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium">
                {npc.data.playerName}
              </span>
            )}
            {isDead && (
              <span className="border-danger-300/50 bg-danger-50 text-danger-800 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold">
                <Skull className="h-3 w-3" aria-hidden />
                Nie żyje
              </span>
            )}
          </div>
        </div>
      </div>

      {currentLocationName && (
        <div className="flex">
          <span className="app-pill-muted inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
            <MapPin className="h-3 w-3" aria-hidden />
            Aktualna lokacja: {currentLocationName}
          </span>
        </div>
      )}

      {!isPC && instinctPreview && (
        <CardAccentSection
          label="Instynkt"
          icon={Target}
          tone="primary"
          maxLines={3}
          remeasureKey={instinctPreview}
        >
          <p className="text-surface-700 text-sm leading-6 whitespace-pre-wrap">
            {instinctPreview}
          </p>
        </CardAccentSection>
      )}

      {!isPC && motivationPreview && (
        <CardAccentSection
          label="Motywacja"
          icon={Heart}
          tone="warning"
          maxLines={3}
          remeasureKey={motivationPreview}
        >
          <p className="text-surface-700 text-sm leading-6 whitespace-pre-wrap">
            {motivationPreview}
          </p>
        </CardAccentSection>
      )}

      {appearancePreview && (
        <CardAccentSection
          label="Wygląd"
          icon={Eye}
          tone="primary"
          maxLines={3}
          remeasureKey={appearancePreview}
        >
          <p className="text-surface-700 text-sm leading-6 whitespace-pre-wrap">
            {appearancePreview}
          </p>
        </CardAccentSection>
      )}

      {playStylePreview && (
        <CardAccentSection
          label="Sposób odgrywania"
          icon={MessageCircle}
          tone="success"
          maxLines={3}
          remeasureKey={playStylePreview}
        >
          <p className="text-surface-700 text-sm leading-6 whitespace-pre-wrap">
            {playStylePreview}
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
          <p className="text-surface-700 text-sm leading-6 whitespace-pre-wrap">
            {descriptionPreview}
          </p>
        </CardAccentSection>
      )}

      {npc.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-[rgba(86,93,94,0.1)] pt-3">
          {npc.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
          {npc.tags.length > 4 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              +{npc.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </article>
  );
});
