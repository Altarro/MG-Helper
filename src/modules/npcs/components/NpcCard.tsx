import React from 'react';
import { User, Crown } from 'lucide-react';
import type { Npc } from '../types';

interface NpcCardProps {
  npc: Npc;
  onClick?: () => void;
}

export const NpcCard = React.memo(function NpcCard({ npc, onClick }: NpcCardProps) {
  const isPC = npc.data?.isPC === true;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-xl border border-surface-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isPC ? 'bg-amber-50' : 'bg-primary-50'}`}>
          {isPC ? <Crown className="h-4 w-4 text-amber-600" /> : <User className="h-4 w-4 text-primary-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-surface-900">{npc.name}</p>
            {isPC && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Gracz
              </span>
            )}
          </div>
          {isPC && npc.data?.playerName && (
            <p className="mt-0.5 truncate text-xs text-amber-600">{npc.data.playerName}</p>
          )}
          {!isPC && npc.data?.instinct && (
            <p className="mt-0.5 truncate text-xs italic text-surface-500">
              {npc.data.instinct}
            </p>
          )}
        </div>
      </div>

      {!isPC && npc.data?.motivation && (
        <p className="truncate text-sm text-surface-600">{npc.data.motivation}</p>
      )}

      {npc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {npc.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600"
            >
              {tag}
            </span>
          ))}
          {npc.tags.length > 4 && (
            <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-400">
              +{npc.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
});
