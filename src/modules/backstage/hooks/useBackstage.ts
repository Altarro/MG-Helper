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
import { loadThreatRadarWeights } from '../radarSettings';
import { isFaction, type Faction } from '@modules/factions/types';

export interface BackstageData {
  sessions: Session[];
  threads: Thread[];
  threadSessionIds: Map<string, Set<string>>;
  npcs: Npc[];
  npcSessionIds: Map<string, Set<string>>;
  factions: Faction[];
  factionSessionIds: Map<string, Set<string>>;
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
  const factions = entities.filter(isFaction).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const threatsAll = entities.filter(isThreat).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const locations = entities.filter(isNamedLocation).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const clues = entities.filter(isClue).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const activeThreats = threatsAll.filter((t) => t.data.status !== 'completed');

  const threadIds = new Set(threads.map((t) => t.id));
  const npcIds = new Set(npcs.map((n) => n.id));
  const allThreatIds = new Set(threatsAll.map((t) => t.id));
  const activeThreatIds = new Set(activeThreats.map((t) => t.id));
  const factionIds = new Set(factions.map((f) => f.id));
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

  const factionSessionIds = new Map<string, Set<string>>();
  for (const faction of factions) {
    factionSessionIds.set(faction.id, new Set());
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

  const threatClues = new Map<string, { clueId: string; discovered: boolean }[]>();
  const threatClueSeen = new Map<string, Set<string>>();
  const threatThreadIds = new Map<string, string[]>();
  const threatNpcIds = new Map<string, Set<string>>();
  const threatFactionIds = new Map<string, Set<string>>();
  const npcFactionIds = new Map<string, Set<string>>();
  const locationFactionIds = new Map<string, Set<string>>();
  const threatClocks = new Map<
    string,
    {
      filled: number;
      segments: number;
      isActive: boolean;
      isCompleted: boolean;
      lastAdvanceSessionId?: string;
      lastAdvanceAt?: string;
    }[]
  >();

  for (const tid of activeThreatIds) {
    threatClues.set(tid, []);
    threatClueSeen.set(tid, new Set());
    threatThreadIds.set(tid, []);
    threatNpcIds.set(tid, new Set());
    threatFactionIds.set(tid, new Set());
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
        const seen = threatClueSeen.get(rel.targetId)!;
        if (seen.has(clue.id)) continue;
        seen.add(clue.id);
        threatClues.get(rel.targetId)?.push({
          clueId: clue.id,
          discovered: clue.data.discovered === true,
        });
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
          lastAdvanceSessionId:
            typeof c.data.lastAdvanceSessionId === 'string' ? c.data.lastAdvanceSessionId : undefined,
          lastAdvanceAt: typeof c.data.lastAdvanceAt === 'string' ? c.data.lastAdvanceAt : undefined,
        });
      }
    }
    if (rel.type === 'related_to') {
      const ea = byId.get(rel.sourceId);
      const eb = byId.get(rel.targetId);
      if (!ea || !eb) continue;
      if (ea.type === 'npc' && eb.type === 'threat' && activeThreatIds.has(eb.id)) {
        threatNpcIds.get(eb.id)?.add(ea.id);
      } else if (ea.type === 'threat' && eb.type === 'npc' && activeThreatIds.has(ea.id)) {
        threatNpcIds.get(ea.id)?.add(eb.id);
      } else if (ea.type === 'faction' && eb.type === 'threat' && activeThreatIds.has(eb.id)) {
        threatFactionIds.get(eb.id)?.add(ea.id);
      } else if (ea.type === 'threat' && eb.type === 'faction' && activeThreatIds.has(ea.id)) {
        threatFactionIds.get(ea.id)?.add(eb.id);
      }
    }
    if (rel.type === 'belongs_to') {
      if (npcIds.has(rel.sourceId) && factionIds.has(rel.targetId)) {
        if (!npcFactionIds.has(rel.sourceId)) npcFactionIds.set(rel.sourceId, new Set());
        npcFactionIds.get(rel.sourceId)?.add(rel.targetId);
      }
      if (locationIds.has(rel.sourceId) && factionIds.has(rel.targetId)) {
        if (!locationFactionIds.has(rel.sourceId)) locationFactionIds.set(rel.sourceId, new Set());
        locationFactionIds.get(rel.sourceId)?.add(rel.targetId);
      }
    }
  }

  for (const [npcId, factionSet] of npcFactionIds) {
    const npcSessions = npcSessionIds.get(npcId);
    if (!npcSessions) continue;
    for (const factionId of factionSet) {
      const factionSessions = factionSessionIds.get(factionId);
      if (!factionSessions) continue;
      for (const sid of npcSessions) factionSessions.add(sid);
    }
  }

  for (const [locationId, factionSet] of locationFactionIds) {
    const locationSessions = locationSessionIds.get(locationId);
    if (!locationSessions) continue;
    for (const factionId of factionSet) {
      const factionSessions = factionSessionIds.get(factionId);
      if (!factionSessions) continue;
      for (const sid of locationSessions) factionSessions.add(sid);
    }
  }

  const threatFootprintSessionIds = new Map<string, Set<string>>();
  for (const tid of activeThreatIds) {
    const fp = new Set<string>();
    for (const sid of threatSessionIds.get(tid) ?? []) fp.add(sid);
    for (const threadId of threatThreadIds.get(tid) ?? []) {
      for (const sid of threadSessionIds.get(threadId) ?? []) fp.add(sid);
    }
    for (const row of threatClues.get(tid) ?? []) {
      for (const sid of clueSessionIds.get(row.clueId) ?? []) fp.add(sid);
    }
    for (const npcId of threatNpcIds.get(tid) ?? []) {
      for (const sid of npcSessionIds.get(npcId) ?? []) fp.add(sid);
    }
    for (const factionId of threatFactionIds.get(tid) ?? []) {
      for (const sid of factionSessionIds.get(factionId) ?? []) fp.add(sid);
    }
    threatFootprintSessionIds.set(tid, fp);
  }

  return {
    sessions,
    threads,
    threadSessionIds,
    npcs,
    npcSessionIds,
    factions,
    factionSessionIds,
    threats: threatsAll,
    locations,
    locationSessionIds,
    clues,
    clueSessionIds,
    activeThreats,
    threatSessionIds,
    threatClues,
    threatThreadIds,
    threatNpcIds,
    threatFactionIds,
    threatClocks,
    threatFootprintSessionIds,
  };
}

/**
 * Read-only backstage payload: thread×session matrix data + threat radar rows.
 */
export function useBackstage(): BackstageData | undefined {
  const { db, campaignId } = useCampaign();
  return useLiveQuery(async () => {
    const [entities, relAppears, relClues, relAffects, relTracks, relRelated, relBelongsTo] = await Promise.all([
      db.entities.where('type').anyOf([
        'session',
        'thread',
        'npc',
        'faction',
        'threat',
        'location',
        'clue',
        'clock',
      ]).toArray(),
      db.relations.where('type').equals('appears_in').toArray(),
      db.relations.where('type').equals('clues_for').toArray(),
      db.relations.where('type').equals('affects').toArray(),
      db.relations.where('type').equals('tracks').toArray(),
      db.relations.where('type').equals('related_to').toArray(),
      db.relations.where('type').equals('belongs_to').toArray(),
    ]);

    const relations: Relation[] = [
      ...relAppears,
      ...relClues,
      ...relAffects,
      ...relTracks,
      ...relRelated,
      ...relBelongsTo,
    ];
    const snapshot = buildSnapshot(entities, relations);
    const threatRows = computeAllThreatRadarRows(snapshot, loadThreatRadarWeights(campaignId));

    return {
      sessions: snapshot.sessions,
      threads: snapshot.threads,
      threadSessionIds: snapshot.threadSessionIds,
      npcs: snapshot.npcs,
      npcSessionIds: snapshot.npcSessionIds,
      factions: snapshot.factions,
      factionSessionIds: snapshot.factionSessionIds,
      threats: snapshot.threats,
      threatSessionIds: snapshot.threatSessionIds,
      locations: snapshot.locations,
      locationSessionIds: snapshot.locationSessionIds,
      clues: snapshot.clues,
      clueSessionIds: snapshot.clueSessionIds,
      snapshot,
      threatRows,
    };
  }, [db, campaignId]);
}
