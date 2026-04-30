import { memo, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isClock } from '@modules/clocks/types';
import { CardScrollBlock } from '@shared/components/CardScrollBlock';
import { getThreatStatus } from '@shared/utils/entityData';
import { getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';
import { normalizeThreatPillars } from '../types';
import type { Threat } from '../types';
import { ThreatClockListStylePanel } from './ThreatClockListStylePanel';

interface ThreatCardProps {
  threat: Threat;
  onClick?: () => void;
}

export const ThreatCard = memo(function ThreatCard({ threat, onClick }: ThreatCardProps) {
  const { db, campaignId } = useCampaign();
  const { name, data, tags } = threat;
  const typeLabel = getCatalogLabelByValue('threatType', data.threatType, campaignId);
  const pillars = useMemo(() => normalizeThreatPillars(data.pillars), [data.pillars]);
  const hasMoves = data.moves.length > 0;
  const hasPillars = pillars.length > 0;
  const [detailMode, setDetailMode] = useState<'moves' | 'pillars'>(hasMoves ? 'moves' : 'pillars');
  const isCompleted = getThreatStatus(threat) === 'completed';
  const impulseTrimmed = data.impulse.trim();
  const clockTickWhenLines = useMemo(
    () =>
      (data.trigger ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [data.trigger],
  );

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

  useEffect(() => {
    if (hasMoves) {
      setDetailMode('moves');
      return;
    }
    if (hasPillars) {
      setDetailMode('pillars');
    }
  }, [hasMoves, hasPillars, threat.id]);

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className="app-card flex cursor-pointer flex-col gap-3 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgba(33,71,102,0.09)]">
            <AlertTriangle className="text-primary-700 h-4 w-4" />
          </div>
          <h3 className="text-surface-900 truncate text-[1.05rem] font-semibold tracking-[-0.02em]">{name}</h3>
        </div>
        <span className="app-pill-muted shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
          {typeLabel}
        </span>
      </div>

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

      {impulseTrimmed.length > 0 && (
        <CardScrollBlock label="Impuls" contentClassName="pr-0.5" maxLines={5} remeasureKey={impulseTrimmed}>
          <p className="text-sm leading-6 whitespace-pre-wrap text-surface-700">{impulseTrimmed}</p>
        </CardScrollBlock>
      )}

      {(hasMoves || hasPillars) && (
        <div className="flex flex-col gap-2">
          {detailMode === 'moves' && hasMoves && (
            <CardScrollBlock
              label="Ruchy"
              contentClassName="pr-0.5"
              remeasureKey={data.moves.join('\u0001')}
              headerRight={
                hasMoves && hasPillars ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDetailMode('moves');
                      }}
                      className="app-pill rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                    >
                      Ruchy
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDetailMode('pillars');
                      }}
                      className="app-pill-muted hover:bg-[rgba(223,225,218,0.98)] rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                    >
                      Filary
                    </button>
                  </div>
                ) : null
              }
            >
              <ul className="list-inside list-disc text-sm leading-6 text-surface-700 [&>li+li]:mt-1">
                {data.moves.map((move, index) => (
                  <li key={`${threat.id}-move-${index}`} className="marker:text-surface-400 pl-0.5">
                    {move}
                  </li>
                ))}
              </ul>
            </CardScrollBlock>
          )}

          {detailMode === 'pillars' && hasPillars && (
            <CardScrollBlock
              label="Filary"
              contentClassName="pr-0.5"
              remeasureKey={pillars.map((pillar) => `${pillar.label}:${pillar.destroyed ? '1' : '0'}`).join('\u0001')}
              headerRight={
                hasMoves && hasPillars ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDetailMode('moves');
                      }}
                      className="app-pill-muted hover:bg-[rgba(223,225,218,0.98)] rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                    >
                      Ruchy
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDetailMode('pillars');
                      }}
                      className="app-pill rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                    >
                      Filary
                    </button>
                  </div>
                ) : null
              }
            >
              <ul className="list-inside list-disc text-sm leading-6 text-surface-700 [&>li+li]:mt-1">
                {pillars.map((pillar, index) => (
                  <li
                    key={`${threat.id}-pillar-${index}`}
                    className={`marker:text-surface-400 pl-0.5 ${pillar.destroyed ? 'line-through opacity-70' : ''}`}
                  >
                    {pillar.label}
                  </li>
                ))}
              </ul>
            </CardScrollBlock>
          )}
        </div>
      )}

      {linkedClock && (
        <div className="min-w-0">
          <p className="text-surface-500 mb-1.5 text-[11px] font-semibold tracking-wide uppercase">Zegar</p>
          <ThreatClockListStylePanel
            clock={linkedClock}
            triggerLines={clockTickWhenLines}
            stopPointerPropagation
            showTickProgress={Boolean(linkedClock.data.tickLabels?.length)}
          />
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${linkedClock ? '' : 'mt-auto'}`}>
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="app-pill rounded-full px-2.5 py-1 text-xs font-medium">
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">+{tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
});
