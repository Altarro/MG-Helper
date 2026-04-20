import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
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
      className="app-danger-card flex min-h-56 cursor-pointer flex-col gap-3 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgba(242,196,88,0.14)]">
            <AlertTriangle className="h-4 w-4 text-warning-600" />
          </div>
          <h4 className="truncate text-[1.05rem] font-semibold tracking-[-0.02em] text-surface-900">{name}</h4>
        </div>
        <span className="app-danger-pill shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
          {typeLabel}
        </span>
      </div>

      {data.impulse && (
        <p className="line-clamp-2 text-sm italic leading-6 text-surface-700">{data.impulse}</p>
      )}

      {(data.forkThreatId || isCompleted) && (
        <div className="flex flex-wrap gap-2">
          {data.forkThreatId && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">Odłam</span>
          )}
          {isCompleted && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">Wygaszone</span>
          )}
        </div>
      )}

      {data.moves.length > 0 && (
        <p className="text-sm text-surface-700">
          <span className="font-medium text-surface-800">{data.moves.length}</span>{' '}
          {data.moves.length === 1 ? 'ruch' : data.moves.length < 5 ? 'ruchy' : 'ruchów'}
        </p>
      )}

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="app-danger-pill rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}

      {linkedClock && (
        <div className="mt-auto flex flex-col gap-2">
          <p className="truncate text-xs font-medium uppercase tracking-[0.12em] text-surface-500">
            {linkedClock.name}
          </p>
          <div
            className="flex w-full gap-0.5 overflow-visible rounded"
            aria-label={`Zegar: ${linkedClock.data.filled}/${linkedClock.data.segments}`}
          >
            {Array.from({ length: linkedClock.data.segments }, (_, i) => {
              const clock = linkedClock;
              if (!clock) return null;
              const isFilled = i < clock.data.filled;
              const isActive = clock.data.isActive !== false;
              const bgClass = isFilled ? (isActive ? 'bg-[rgba(242,166,0,0.9)]' : 'bg-surface-500') : 'bg-[rgba(86,93,94,0.24)]';
              const isNext = i === clock.data.filled && clock.data.filled < clock.data.segments;
              const isUndo = i === clock.data.filled - 1 && clock.data.filled > 0;
              const isClickable = (isNext || isUndo) && isActive;
              const clickHintClass = isClickable
                ? isNext
                  ? 'cursor-pointer hover:z-10 hover:scale-y-[1.15] hover:ring-1 hover:ring-[rgba(242,166,0,0.7)] hover:ring-offset-1 hover:ring-offset-[rgba(231,226,210,0.95)]'
                  : 'cursor-pointer hover:z-10 hover:scale-y-[1.15] hover:ring-1 hover:ring-surface-500/80 hover:ring-offset-1 hover:ring-offset-[rgba(231,226,210,0.95)]'
                : '';

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
                } catch {
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
                  title={isClickable ? (isNext ? 'Dodaj 1 tick' : 'Cofnij 1 tick') : undefined}
                  aria-label={isClickable ? (i === clock.data.filled ? `Wypełnij segment ${i + 1}` : `Cofnij segment ${i + 1}`) : undefined}
                  className={`h-3 flex-1 overflow-hidden rounded-[4px] transition-all focus:outline-none ${bgClass} ${clickHintClass}`}
                />
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
