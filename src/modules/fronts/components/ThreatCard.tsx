import { memo } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isClock } from '@modules/clocks/types';
import { TickProgress } from '@shared/components/TickProgress';
import { getThreatStatus } from '@shared/utils/entityData';
import { THREAT_TYPE_LABELS } from '../types';
import type { Threat } from '../types';
import { updateEntity } from '@shared/db/operations';
import { toast } from 'sonner';

interface ThreatCardProps {
  threat: Threat;
  onClick?: () => void;
}

export const ThreatCard = memo(function ThreatCard({ threat, onClick }: ThreatCardProps) {
  const { db } = useCampaign();
  const { name, data, tags } = threat;
  const typeLabel = THREAT_TYPE_LABELS[data.threatType];
  const isCompleted = getThreatStatus(threat) === 'completed';

  const linkedClock = useLiveQuery(async () => {
    const rels = await db.relations
      .where('sourceId').equals(threat.id)
      .filter((r) => r.type === 'tracks')
      .toArray();
    if (!rels.length) return null;
    const rel = rels[0];
    if (!rel) return null;
    const entity = await db.entities.get(rel.targetId);
    return entity && isClock(entity) ? entity : null;
  }, [db, threat.id]);

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 transition-shadow hover:shadow-md cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <h4 className="truncate font-semibold text-surface-900">{name}</h4>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          {typeLabel}
        </span>
      </div>

      {data.impulse && (
        <p className="text-xs italic text-surface-600 line-clamp-2">{data.impulse}</p>
      )}

      {(data.forkThreatId || isCompleted) && (
        <div className="flex flex-wrap gap-1">
          {data.forkThreatId && (
            <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600">
              Odlam
            </span>
          )}
          {isCompleted && (
            <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600">
              Wygaszone
            </span>
          )}
        </div>
      )}

      {data.moves.length > 0 && (
        <p className="text-xs text-surface-500">
          {data.moves.length} {data.moves.length === 1 ? 'ruch' : data.moves.length < 5 ? 'ruchy' : 'ruchów'}
        </p>
      )}

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              {tag}
            </span>
          ))}
        </div>
      )}

      {linkedClock && (
        <div className="mt-1 flex flex-col gap-1">
          <p className="text-xs text-surface-400 truncate">{linkedClock.name}</p>
          <div
            className="flex w-full gap-px overflow-visible rounded"
            aria-label={`Zegar: ${linkedClock.data.filled}/${linkedClock.data.segments}`}
          >
            {Array.from({ length: linkedClock.data.segments }, (_, i) => {
              const clock = linkedClock;
              if (!clock) return null;
              const isFilled = i < clock.data.filled;
              const isActive = clock.data.isActive !== false;
              const bgClass = isFilled ? (isActive ? 'bg-amber-500' : 'bg-surface-400') : 'bg-surface-200';
              const isNext = i === clock.data.filled && clock.data.filled < clock.data.segments;
              const isClickable = (i === clock.data.filled || i === clock.data.filled - 1) && isActive;

              async function handleSegmentClick(e: React.MouseEvent) {
                e.stopPropagation();
                if (!isClickable) return;
                try {
                  const current = clock.data.filled;
                  let newFilled = current;
                  if (i === current) newFilled = current + 1;
                  else if (i === current - 1) newFilled = current - 1;
                  newFilled = Math.max(0, Math.min(newFilled, clock.data.segments));
                  await updateEntity(db, clock.id, {
                    data: { ...clock.data, filled: newFilled },
                  });
                } catch (err) {
                  toast.error('Nie udało się zaktualizować zegara');
                }
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={handleSegmentClick}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={!isClickable}
                  aria-label={isClickable ? (i === clock.data.filled ? `Wypełnij segment ${i + 1}` : `Cofnij segment ${i + 1}`) : undefined}
                  className={`group relative h-3 flex-1 rounded-[3px] transition-all focus:outline-none ${bgClass} ${isClickable ? 'cursor-pointer' : ''} ${isNext ? 'hover:z-10 hover:scale-y-[1.2] hover:bg-amber-100 hover:ring-1 hover:ring-amber-300/70 hover:ring-offset-1 hover:ring-offset-amber-50' : ''}`}
                >
                  {isNext && (
                    <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-all duration-150 group-hover:opacity-100">
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/70">
                        <Plus size={9} strokeWidth={2.75} className="text-amber-500/90" />
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {linkedClock.data.tickLabels && linkedClock.data.tickLabels.length > 0 && (
            <TickProgress
              tickLabels={linkedClock.data.tickLabels}
              filled={linkedClock.data.filled}
              segments={linkedClock.data.segments}
            />
          )}
        </div>
      )}
    </div>
  );
});
