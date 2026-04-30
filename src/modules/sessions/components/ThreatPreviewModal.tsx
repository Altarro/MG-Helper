import { useLiveQuery } from 'dexie-react-hooks';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { useCampaign } from '@shared/db/CampaignContext';
import { Modal } from '@shared/components/Modal';
import { ClockVisual } from '@modules/clocks/components/ClockVisual';
import { isClock } from '@modules/clocks/types';
import { isThreat } from '@modules/fronts/types';
import { getClockData, getThreatStatus } from '@shared/utils/entityData';
import { getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';

interface ThreatPreviewModalProps {
  threatId: string;
  sessionId?: string;
  onClose: () => void;
}

export function ThreatPreviewModal({ threatId, sessionId, onClose }: ThreatPreviewModalProps) {
  const { db, campaignId } = useCampaign();

  const data = useLiveQuery(async () => {
    const threat = await db.entities.get(threatId);
    if (!threat || !isThreat(threat)) return null;

    // Clock linked via `tracks` relation
    const clockRel = await db.relations
      .where('sourceId')
      .equals(threatId)
      .filter((r) => r.type === 'tracks')
      .first();
    const clockEntity = clockRel ? await db.entities.get(clockRel.targetId) : undefined;
    const clock = clockEntity && isClock(clockEntity) ? clockEntity : null;

    // Parent front via `belongs_to`
    const parentRel = await db.relations
      .where('sourceId')
      .equals(threatId)
      .filter((r) => r.type === 'belongs_to')
      .first();
    const front = parentRel ? await db.entities.get(parentRel.targetId) : undefined;

    return { threat, clock, frontId: front?.id ?? null };
  }, [db, threatId]);

  if (!data?.threat) return null;

  const { threat, clock, frontId } = data;
  const threatData = threat.data;
  const clockData = clock ? getClockData(clock) : null;
  const typeLabel = getCatalogLabelByValue('threatType', threatData.threatType, campaignId);
  const status = getThreatStatus(threat);

  return (
    <Modal title={threat.name} size="md" onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        {/* Type + status badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {typeLabel}
          </span>
          <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
            status === 'completed' ? 'bg-surface-200 text-surface-700' : 'bg-green-100 text-green-700'
          }`}>
            {status === 'completed' ? 'Zakończone' : 'Aktywne'}
          </span>
        </div>

        {/* Clock */}
        {clock && clockData && (
          <div className="flex items-center gap-4">
            <ClockVisual
              segments={clockData.segments}
              filled={clockData.filled}
              size={72}
            />
            <div>
              <p className="font-medium text-surface-800">{clock.name}</p>
              <p className="text-xs text-surface-500">
                {clock.data.filled}/{clock.data.segments} segmentów
              </p>
            </div>
          </div>
        )}

        {/* Impulse */}
        {threatData.impulse && (
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
              Impuls
            </p>
            <p className="text-sm text-surface-800">{threatData.impulse}</p>
          </div>
        )}

        {/* Description */}
        {threat.description && (
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
              Opis
            </p>
            <p className="line-clamp-4 text-sm text-surface-700">{threat.description}</p>
          </div>
        )}

        {/* Moves */}
        {threatData.moves.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-400">
              Ruchy zagrożenia
            </p>
            <ul className="flex flex-col gap-0.5">
              {threatData.moves.map((move, i) => (
                <li key={i} className="text-sm text-surface-700">
                  • {move}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="flex justify-end gap-4 border-t border-surface-100 px-4 py-3">
        <Link
          to={`/threats/${threat.id}`}
          state={sessionId ? { returnToSessionLive: sessionId } : undefined}
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
        >
          Otwórz kartę
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        {frontId && (
          <Link
            to={`/fronts/${frontId}`}
            state={sessionId ? { returnToSessionLive: sessionId } : undefined}
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
          >
            Pokaż front
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </Modal>
  );
}
