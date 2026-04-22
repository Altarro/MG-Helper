import React from 'react';
import { User, Crown } from 'lucide-react';
import type { Npc } from '../types';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';

interface NpcCardProps {
  npc: Npc;
  onClick?: () => void;
}

export const NpcCard = React.memo(function NpcCard({ npc, onClick }: NpcCardProps) {
  const isPC = npc.data?.isPC === true;
  const thumbUrl = useAssetUrl(npc.data?.imageId ?? null, { thumb: true });
  return (
    <button
      type="button"
      onClick={onClick}
      className="app-card flex w-full flex-col gap-3 rounded-[1.35rem] p-5 text-left transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-3">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={npc.data?.imageAlt || npc.name}
            className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-[0_4px_10px_rgba(18,45,66,0.12)]"
          />
        ) : (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isPC ? 'bg-[rgba(242,196,88,0.16)]' : 'bg-[rgba(33,71,102,0.09)]'}`}>
            {isPC ? <Crown className="h-4 w-4 text-warning-600" /> : <User className="h-4 w-4 text-primary-700" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-surface-900">{npc.name}</p>
            {isPC && (
              <span className="app-danger-pill shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
                Gracz
              </span>
            )}
          </div>
          {isPC && npc.data?.playerName && (
            <p className="mt-1 truncate text-xs font-medium uppercase tracking-[0.12em] text-warning-600">{npc.data.playerName}</p>
          )}
          {!isPC && npc.data?.instinct && (
            <p className="mt-1 truncate text-sm italic text-surface-600">{npc.data.instinct}</p>
          )}
        </div>
      </div>

      {!isPC && npc.data?.motivation && (
        <p className="text-sm leading-6 text-surface-700">{npc.data.motivation}</p>
      )}

      {npc.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {npc.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
          {npc.tags.length > 4 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">+{npc.tags.length - 4}</span>
          )}
        </div>
      )}
    </button>
  );
});
