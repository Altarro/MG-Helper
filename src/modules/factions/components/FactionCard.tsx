import { memo } from 'react';
import { Link } from 'react-router';
import { Flag } from 'lucide-react';
import type { Faction } from '../types';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';
import { getFactionLifecycleStatus } from '@shared/utils/entityData';

interface FactionCardProps {
  faction: Faction;
}

export const FactionCard = memo(function FactionCard({ faction }: FactionCardProps) {
  const thumbUrl = useAssetUrl(faction.data.imageId ?? null, { thumb: true });
  return (
    <Link
      to={`/factions/${faction.id}`}
      className={`app-card flex flex-col gap-3 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5 ${
        getFactionLifecycleStatus({ data: faction.data }) === 'completed' ? 'opacity-75' : ''
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={faction.data.imageAlt || faction.name}
            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-[0_4px_10px_rgba(18,45,66,0.12)]"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgba(33,71,102,0.09)]">
            <Flag className="h-4 w-4 text-primary-700" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-surface-900">
            {faction.name}
          </h3>
          {getFactionLifecycleStatus({ data: faction.data }) === 'completed' && (
            <span className="app-pill-muted shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
              Rozbita
            </span>
          )}
        </div>
      </div>
      {faction.data.goals.length > 0 && (
        <p className="line-clamp-2 text-sm leading-6 text-surface-700">
          {faction.data.goals.slice(0, 2).join(' • ')}
        </p>
      )}
      {faction.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {faction.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="app-pill rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
});
