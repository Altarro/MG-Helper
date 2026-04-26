import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isSession } from '@modules/sessions/types';
import { isThread } from '@modules/threads/types';
import { isThreat } from '@modules/fronts/types';
import { isClue } from '@modules/clues/types';
import { isNamedLocation, type Location } from '@modules/locations/types';
import { isClock } from '@modules/clocks/types';
import type { Entity } from '@shared/types/entity';
import type { Relation } from '@shared/types/relation';
import { computeAllThreatRadarRows } from '../engine/threatRadar';
import type { BackstageSnapshot, ThreatRadarResult } from '../types';
import type { Session } from '@modules/sessions/types';
import type { Thread } from '@modules/threads/types';
import { isNpc, type Npc } from '@modules/npcs/types';
import type { Threat } from '@modules/fronts/types';
import type { Clue } from '@modules/clues/types';
import type { Clock } from '@modules/clocks/types';
import { isCompleted } from '@modules/clocks/types';

export interface BackstageData {
  sessions: Session[];
  threads: Thread[];
  threadSessionIds: Map<string, Set<string>>;
  npcs: Npc[];
  npcSessionIds: Map<string, Set<string>>;
  threats: Threat[];
  threatSessionIds: Map<string, Set<string>>;
  locations: Location[];
  locationSessionIds: Map<string, Set<string>>;
  clues: Clue[];
  clueSessionIds: Map<string, Set<string>>;
  snapshot: BackstageSnapshot;
  threatRows: ThreatRadarResult[];
}

function indexEntities(entities: Entity[]) {
  const byId = new Map<string, Entity>();
  for (const e of entities) byId.set(e.id, e);
  return byId;
}

function buildSnapshot(entities: Entity[], relations: Relation[]): BackstageSnapshot {
  const sessions = entities.filter(isSession).sort((a, b) => (a.data.number ?? 0) - (b.data.number ?? 0));
  const threads = entities.filter(isThread).sort((a, b) => a.name.localeCompare(b.name));
  const npcs = entities.filter(isNpc).sort((a, b) => a.name.localeCompare(b.name));
  const threatsAll = entities.filter(isThreat).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const locations = entities.filter(isNamedLocation).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const clues = entities.filter(isClue).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const activeThreats = threatsAll.filter((t) => t.data.status !== 'completed');

  const threadIds = new Set(threads.map((t) => t.id));
  const npcIds = new Set(npcs.map((n) => n.id));
  const allThreatIds = new Set(threatsAll.map((t) => t.id));
  const activeThreatIds = new Set(activeThreats.map((t) => t.id));
  const locationIds = new Set(locations.map((l) => l.id));
  const clueIds = new Set(clues.map((c) => c.id));

  const threadSessionIds = new Map<string, Set<string>>();
  for (const thread of threads) {
    threadSessionIds.set(thread.id, new Set());
  }

  const npcSessionIds = new Map<string, Set<string>>();
  for (const npc of npcs) {
    npcSessionIds.set(npc.id, new Set());
  }

  const locationSessionIds = new Map<string, Set<string>>();
  for (const location of locations) {
    locationSessionIds.set(location.id, new Set());
  }

  const clueSessionIds = new Map<string, Set<string>>();
  for (const clue of clues) {
    clueSessionIds.set(clue.id, new Set());
  }

  const threatSessionIds = new Map<string, Set<string>>();
  for (const tid of allThreatIds) {
    threatSessionIds.set(tid, new Set());
  }

  const threatClues = new Map<string, { discovered: boolean }[]>();
  const threatThreadIds = new Map<string, string[]>();
  const threatClocks = new Map<
    string,
    { filled: number; segments: number; isActive: boolean; isCompleted: boolean }[]
  >();

  for (const tid of activeThreatIds) {
    threatClues.set(tid, []);
    threatThreadIds.set(tid, []);
    threatClocks.set(tid, []);
  }

  const byId = indexEntities(entities);

  for (const rel of relations) {
    if (rel.type === 'appears_in') {
      if (threadIds.has(rel.sourceId)) {
        threadSessionIds.get(rel.sourceId)?.add(rel.targetId);
      }
      if (npcIds.has(rel.sourceId)) {
        npcSessionIds.get(rel.sourceId)?.add(rel.targetId);
      }
      if (locationIds.has(rel.sourceId)) {
        locationSessionIds.get(rel.sourceId)?.add(rel.targetId);
      }
      if (clueIds.has(rel.sourceId)) {
        clueSessionIds.get(rel.sourceId)?.add(rel.targetId);
      }
      if (allThreatIds.has(rel.sourceId)) {
        threatSessionIds.get(rel.sourceId)?.add(rel.targetId);
      }
    }
    if (rel.type === 'clues_for' && activeThreatIds.has(rel.targetId)) {
      const clue = byId.get(rel.sourceId);
      if (clue && isClue(clue)) {
        threatClues.get(rel.targetId)?.push({ discovered: clue.data.discovered === true });
      }
    }
    if (rel.type === 'affects') {
      const a = rel.sourceId;
      const b = rel.targetId;
      const ta = byId.get(a);
      const tb = byId.get(b);
      if (ta && tb) {
        if (ta.type === 'threat' && tb.type === 'thread' && activeThreatIds.has(ta.id)) {
          const arr = threatThreadIds.get(ta.id)!;
          if (!arr.includes(tb.id)) arr.push(tb.id);
        }
        if (ta.type === 'thread' && tb.type === 'threat' && activeThreatIds.has(tb.id)) {
          const arr = threatThreadIds.get(tb.id)!;
          if (!arr.includes(ta.id)) arr.push(ta.id);
        }
      }
    }
    if (rel.type === 'tracks' && activeThreatIds.has(rel.sourceId)) {
      const clockEnt = byId.get(rel.targetId);
      if (clockEnt && isClock(clockEnt)) {
        const c = clockEnt as Clock;
        const filled = typeof c.data.filled === 'number' ? c.data.filled : 0;
        const segments = typeof c.data.segments === 'number' ? c.data.segments : 4;
        const isActive = c.data.isActive !== false;
        threatClocks.get(rel.sourceId)?.push({
          filled,
          segments,
          isActive,
          isCompleted: isCompleted(c),
        });
      }
    }
  }

  return {
    sessions,
    threads,
    threadSessionIds,
    npcs,
    npcSessionIds,
    threats: threatsAll,
    locations,
    locationSessionIds,
    clues,
    clueSessionIds,
    activeThreats,
    threatSessionIds,
    threatClues,
    threatThreadIds,
    threatClocks,
  };
}

/**
 * Read-only backstage payload: thread×session matrix data + threat radar rows.
 */
export function useBackstage(): BackstageData | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const [entities, relAppears, relClues, relAffects, relTracks] = await Promise.all([
      db.entities.toArray(),
      db.relations.where('type').equals('appears_in').toArray(),
      db.relations.where('type').equals('clues_for').toArray(),
      db.relations.where('type').equals('affects').toArray(),
      db.relations.where('type').equals('tracks').toArray(),
    ]);

    const relations: Relation[] = [...relAppears, ...relClues, ...relAffects, ...relTracks];
    const snapshot = buildSnapshot(entities, relations);
    const threatRows = computeAllThreatRadarRows(snapshot);

    return {
      sessions: snapshot.sessions,
      threads: snapshot.threads,
      threadSessionIds: snapshot.threadSessionIds,
      npcs: snapshot.npcs,
      npcSessionIds: snapshot.npcSessionIds,
      threats: snapshot.threats,
      threatSessionIds: snapshot.threatSessionIds,
      locations: snapshot.locations,
      locationSessionIds: snapshot.locationSessionIds,
      clues: snapshot.clues,
      clueSessionIds: snapshot.clueSessionIds,
      snapshot,
      threatRows,
    };
  }, [db]);
}
