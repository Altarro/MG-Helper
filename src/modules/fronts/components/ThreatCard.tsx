import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isClock } from '@modules/clocks/types';
import { TickProgress } from '@shared/components/TickProgress';
import { getThreatStatus } from '@shared/utils/entityData';
import { THREAT_TYPE_LABELS } from '../types';
import type { Threat } from '../types';

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
          <div className="flex w-full gap-px overflow-hidden rounded" aria-label={`Zegar: ${linkedClock.data.filled}/${linkedClock.data.segments}`}>
            {Array.from({ length: linkedClock.data.segments }, (_, i) => (
              <div
                key={i}
                className={`h-3 flex-1 transition-colors ${
                  i < linkedClock.data.filled
                    ? linkedClock.data.isActive === false
                      ? 'bg-surface-400'
                      : 'bg-amber-500'
                    : 'bg-surface-200'
                }`}
              />
            ))}
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
