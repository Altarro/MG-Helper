import { Link } from 'react-router';
import { MapPin } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { getClockData, getLocationData, getNpcData, getThreatData, isPlayerNpc } from '@shared/utils/entityData';
import { isClock } from '@modules/clocks/types';
import { isThreat } from '@modules/fronts/types';
import { isLocation } from '@modules/locations/types';
import { isNpc } from '@modules/npcs/types';
import { FloatingCard } from './FloatingCard';

// ── NpcSceneCard ──────────────────────────────────────────────────────────────

interface NpcSceneCardProps {
  npcId: string;
  sessionId?: string;
  onClose: () => void;
  initialX?: number;
  initialY?: number;
}

export function NpcSceneCard({ npcId, onClose, initialX, initialY }: NpcSceneCardProps) {
  const { db } = useCampaign();

  const npc = useLiveQuery(() => db.entities.get(npcId), [db, npcId]);

  // Current location(s) via contains relation
  const locations = useLiveQuery(async () => {
    const rels = await db.relations
      .where('targetId')
      .equals(npcId)
      .filter((r) => r.type === 'contains')
      .toArray();
    if (rels.length === 0) return [];
    return db.entities.where('id').anyOf(rels.map((r) => r.sourceId)).toArray();
  }, [db, npcId]) ?? [];

  if (!npc || !isNpc(npc)) return null;

  const data = getNpcData(npc);
  const isPC = isPlayerNpc(npc);

  return (
    <FloatingCard
      id={`npc-${npcId}`}
      title={npc.name}
      linkPath={`/npcs/${npc.id}`}
      badge={isPC ? (
        <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">Gracz</span>
      ) : undefined}
      onClose={onClose}
      initialX={initialX}
      initialY={initialY}
    >
      <div className="flex flex-col gap-1.5">
        {data.playerName && <p className="text-surface-500 italic">{data.playerName}</p>}
        {data.instinct && (
          <div>
            <span className="font-medium text-surface-600">Instynkt: </span>
            <span className="text-surface-700">{data.instinct}</span>
          </div>
        )}
        {data.motivation && (
          <div>
            <span className="font-medium text-surface-600">Motywacja: </span>
            <span className="text-surface-700">{data.motivation}</span>
          </div>
        )}
        {data.playStyle && (
          <div>
            <span className="font-medium text-surface-600">Odgrywanie: </span>
            <span className="text-surface-700">{data.playStyle}</span>
          </div>
        )}
        {locations.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {locations.map((loc) => (
              <span key={loc.id} className="flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600">
                <MapPin className="h-3 w-3" /> {loc.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </FloatingCard>
  );
}

// ── ThreatSceneCard ───────────────────────────────────────────────────────────

interface ThreatSceneCardProps {
  threatId: string;
  onClose: () => void;
  initialX?: number;
  initialY?: number;
}

export function ThreatSceneCard({ threatId, onClose, initialX, initialY }: ThreatSceneCardProps) {
  const { db } = useCampaign();

  const threat = useLiveQuery(() => db.entities.get(threatId), [db, threatId]);

  // Find linked clock via 'tracks' relation
  const clock = useLiveQuery(async () => {
    const rel = await db.relations
      .where('sourceId')
      .equals(threatId)
      .filter((r) => r.type === 'tracks')
      .first();
    if (!rel) return null;
    const entity = await db.entities.get(rel.targetId);
    return entity && isClock(entity) ? entity : null;
  }, [db, threatId]);

  if (!threat || !isThreat(threat)) return null;

  const data = getThreatData(threat);
  const clockData = clock ? getClockData(clock) : undefined;

  const filledPct = clockData
    ? Math.round(((clockData.filled ?? 0) / (clockData.segments ?? 1)) * 100)
    : 0;

  return (
    <FloatingCard
      id={`threat-${threatId}`}
      title={threat.name}
      linkPath="/fronts"
      badge={<span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">Zagrożenie</span>}
      onClose={onClose}
      initialX={initialX}
      initialY={initialY}
    >
      <div className="flex flex-col gap-1.5">
        {data.threatType && <p className="text-surface-500">{data.threatType}</p>}
        {data.impulse && (
          <div>
            <span className="font-medium text-surface-600">Impuls: </span>
            <span className="text-surface-700">{data.impulse}</span>
          </div>
        )}
        {clock && clockData && (
          <div className="pt-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-surface-600">{clock.name}</span>
              <span className="text-surface-500">{clockData.filled ?? 0}/{clockData.segments ?? '?'}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${filledPct}%` }} />
            </div>
            {clockData.tickLabels && clockData.tickLabels.length > 0 && (
              <p className="mt-1 text-xs text-surface-500 italic">
                {clockData.tickLabels[(clockData.filled ?? 1) - 1] ?? clockData.tickLabels[0]}
              </p>
            )}
          </div>
        )}
      </div>
    </FloatingCard>
  );
}

// ── LocationSceneCard ─────────────────────────────────────────────────────────

interface LocationSceneCardProps {
  locationId: string;
  sessionId?: string;
  onClose: () => void;
  initialX?: number;
  initialY?: number;
}

export function LocationSceneCard({ locationId, sessionId, onClose, initialX, initialY }: LocationSceneCardProps) {
  const { db } = useCampaign();

  const location = useLiveQuery(() => db.entities.get(locationId), [db, locationId]);

  // NPCs in this location
  const npcs = useLiveQuery(async () => {
    const rels = await db.relations
      .where('sourceId')
      .equals(locationId)
      .filter((r) => r.type === 'contains')
      .toArray();
    if (rels.length === 0) return [];
    return db.entities
      .where('id')
      .anyOf(rels.map((r) => r.targetId))
      .filter((e) => e.type === 'npc')
      .toArray();
  }, [db, locationId]) ?? [];

  if (!location || !isLocation(location)) return null;

  const data = getLocationData(location);

  return (
    <FloatingCard
      id={`loc-${locationId}`}
      title={location.name}
      linkPath={`/locations/${location.id}`}
      badge={<span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700">Lokacja</span>}
      onClose={onClose}
      initialX={initialX}
      initialY={initialY}
    >
      <div className="flex flex-col gap-1.5">
        {data.locationType && <p className="text-surface-500">{data.locationType}</p>}
        {data.danger !== undefined && data.danger > 0 && (
          <div className="flex items-center gap-1">
            <span className="font-medium text-surface-600">Niebezpieczne: </span>
            <span className="text-red-600">{'●'.repeat(data.danger)}{'○'.repeat(5 - data.danger)}</span>
          </div>
        )}
        {data.senses?.see && (
          <div>
            <span className="font-medium text-surface-600">Widać: </span>
            <span className="text-surface-700">{data.senses.see}</span>
          </div>
        )}
        {data.senses?.hear && (
          <div>
            <span className="font-medium text-surface-600">Słychać: </span>
            <span className="text-surface-700">{data.senses.hear}</span>
          </div>
        )}
        {npcs.length > 0 && (
          <div className="border-t border-surface-100 pt-2">
            <p className="mb-1 font-medium text-surface-600">Postacie ({npcs.length}):</p>
            <div className="flex flex-wrap gap-1">
              {npcs.map((n) => (
                <Link
                  key={n.id}
                  to={`/npcs/${n.id}`}
                  state={sessionId ? { returnToSessionLive: sessionId } : undefined}
                  className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                >
                  {n.name}
                  {isPlayerNpc(n) ? ' · Gracz' : ''}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </FloatingCard>
  );
}
