import { describe, it, expect } from 'vitest';
import { computeAllThreatRadarRows, computeThreatRadarRow } from '@modules/backstage/engine/threatRadar';
import type { BackstageSnapshot } from '@modules/backstage/types';
import type { Session } from '@modules/sessions/types';
import type { Thread } from '@modules/threads/types';
import type { Threat } from '@modules/fronts/types';
import type { Faction } from '@modules/factions/types';

const now = new Date().toISOString();

function sess(id: string, num: number): Session {
  return {
    id,
    type: 'session',
    name: `S${num}`,
    description: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: { number: num, date: '2026-01-01', summary: '' },
  };
}

function thr(id: string, name: string, radarArchetype?: Threat['data']['radarArchetype']): Threat {
  return {
    id,
    type: 'threat',
    name,
    description: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: {
      threatType: 'dark_entity',
      impulse: 'x',
      moves: ['a'],
      status: 'active',
      ...(radarArchetype ? { radarArchetype } : {}),
    },
  };
}

function thread(id: string, name: string, status: 'active' | 'completed'): Thread {
  return {
    id,
    type: 'thread',
    name,
    description: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: { color: '#000', status },
  };
}

function faction(id: string, name: string): Faction {
  return {
    id,
    type: 'faction',
    name,
    description: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: { goals: [], resources: [] },
  };
}

function footprintFor(
  threatId: string,
  snap: Pick<
    BackstageSnapshot,
    | 'threatSessionIds'
    | 'threatThreadIds'
    | 'threatClues'
    | 'threadSessionIds'
    | 'clueSessionIds'
    | 'npcSessionIds'
    | 'threatFactionIds'
    | 'factionSessionIds'
  >,
  npcByThreat?: Map<string, Set<string>>,
): Map<string, Set<string>> {
  const fp = new Map<string, Set<string>>();
  const set = new Set<string>();
  for (const sid of snap.threatSessionIds.get(threatId) ?? []) set.add(sid);
  for (const threadId of snap.threatThreadIds.get(threatId) ?? []) {
    for (const sid of snap.threadSessionIds.get(threadId) ?? []) set.add(sid);
  }
  for (const row of snap.threatClues.get(threatId) ?? []) {
    for (const sid of snap.clueSessionIds.get(row.clueId) ?? []) set.add(sid);
  }
  for (const npcId of npcByThreat?.get(threatId) ?? []) {
    for (const sid of snap.npcSessionIds.get(npcId) ?? []) set.add(sid);
  }
  for (const factionId of snap.threatFactionIds.get(threatId) ?? []) {
    for (const sid of snap.factionSessionIds.get(factionId) ?? []) set.add(sid);
  }
  fp.set(threatId, set);
  return fp;
}

function baseSnapshot(params: {
  sessions: Session[];
  threats: Threat[];
  threads?: Thread[];
  threatSessionIds?: Map<string, Set<string>>;
  threadSessionIds?: Map<string, Set<string>>;
  clueSessionIds?: Map<string, Set<string>>;
  threatClues?: Map<string, { clueId: string; discovered: boolean }[]>;
  threatThreadIds?: Map<string, string[]>;
  threatClocks?: Map<string, { filled: number; segments: number; isActive: boolean; isCompleted: boolean }[]>;
  threatNpcIds?: Map<string, Set<string>>;
  npcSessionIds?: Map<string, Set<string>>;
  factions?: Faction[];
  factionSessionIds?: Map<string, Set<string>>;
  threatFactionIds?: Map<string, Set<string>>;
}): BackstageSnapshot {
  const threatSessionIds = params.threatSessionIds ?? new Map(params.threats.map((t) => [t.id, new Set<string>()]));
  const threadSessionIds = params.threadSessionIds ?? new Map();
  const clueSessionIds = params.clueSessionIds ?? new Map();
  const threatClues = params.threatClues ?? new Map(params.threats.map((t) => [t.id, []]));
  const threatThreadIds = params.threatThreadIds ?? new Map(params.threats.map((t) => [t.id, []]));
  const threatClocks = params.threatClocks ?? new Map(params.threats.map((t) => [t.id, []]));
  const threatNpcIds = params.threatNpcIds ?? new Map(params.threats.map((t) => [t.id, new Set<string>()]));
  const npcSessionIds = params.npcSessionIds ?? new Map();
  const factions = params.factions ?? [];
  const factionSessionIds = params.factionSessionIds ?? new Map(factions.map((f) => [f.id, new Set<string>()]));
  const threatFactionIds =
    params.threatFactionIds ?? new Map(params.threats.map((t) => [t.id, new Set<string>()]));

  return {
    sessions: params.sessions,
    threads: params.threads ?? [],
    threadSessionIds,
    npcs: [],
    npcSessionIds,
    factions,
    factionSessionIds,
    threats: params.threats,
    locations: [],
    locationSessionIds: new Map(),
    clues: [],
    clueSessionIds,
    activeThreats: params.threats,
    threatSessionIds,
    threatClues,
    threatThreadIds,
    threatNpcIds,
    threatFactionIds,
    threatClocks,
    threatFootprintSessionIds: new Map(
      params.threats.map((t) => [
        t.id,
        footprintFor(
          t.id,
          {
            threatSessionIds,
            threatThreadIds,
            threatClues,
            threadSessionIds,
            clueSessionIds,
            npcSessionIds,
            threatFactionIds,
            factionSessionIds,
          },
          threatNpcIds,
        ).get(t.id) ?? new Set<string>(),
      ]),
    ),
  };
}

describe('computeThreatRadarRow', () => {
  it('raises tier when clock is critical', () => {
    const s1 = sess('s1', 1);
    const s2 = sess('s2', 2);
    const t = thr('th1', 'Villain');
    const snap = baseSnapshot({
      sessions: [s1, s2],
      threats: [t],
      threatSessionIds: new Map([['th1', new Set(['s2'])]]),
      threatClocks: new Map([['th1', [{ filled: 9, segments: 10, isActive: true, isCompleted: false }]]]),
    });
    const row = computeThreatRadarRow(snap, t);
    expect(row.clockCritical).toBe(true);
    expect(row.tier).toBeGreaterThanOrEqual(3);
  });

  it('long absence of footprint increases heat vs recent footprint', () => {
    const sessions = [sess('s1', 1), sess('s2', 2), sess('s3', 3)];
    const t = thr('th1', 'Ghost');
    const absent = baseSnapshot({
      sessions,
      threats: [t],
      threatSessionIds: new Map([['th1', new Set(['s1'])]]),
    });
    const recent = baseSnapshot({
      sessions,
      threats: [t],
      threatSessionIds: new Map([['th1', new Set(['s3'])]]),
    });
    const rAbsent = computeThreatRadarRow(absent, t);
    const rRecent = computeThreatRadarRow(recent, t);
    expect(rAbsent.heat).toBeGreaterThan(rRecent.heat);
  });

  it('sets narrativeGap when last session had thread and clues undiscovered', () => {
    const s1 = sess('s1', 1);
    const thrd = thread('w1', 'Case', 'active');
    const villain = thr('th1', 'Boss');
    const snap = baseSnapshot({
      sessions: [s1],
      threats: [villain],
      threads: [thrd],
      threatSessionIds: new Map([['th1', new Set(['s1'])]]),
      threadSessionIds: new Map([['w1', new Set(['s1'])]]),
      threatClues: new Map([['th1', [{ clueId: 'c1', discovered: false }, { clueId: 'c2', discovered: true }]]]),
      threatThreadIds: new Map([['th1', ['w1']]]),
    });
    const row = computeThreatRadarRow(snap, villain);
    expect(row.narrativeGap).toBe(true);
  });

  it('sets clockTickHint soon when fill is mid-range but not critical', () => {
    const s1 = sess('s1', 1);
    const t = thr('th1', 'Slow burn');
    const snap = baseSnapshot({
      sessions: [s1],
      threats: [t],
      threatSessionIds: new Map([['th1', new Set(['s1'])]]),
      threatClocks: new Map([['th1', [{ filled: 6, segments: 10, isActive: true, isCompleted: false }]]]),
    });
    const row = computeThreatRadarRow(snap, t);
    expect(row.clockCritical).toBe(false);
    expect(row.clockTickHint).toBe('soon');
    expect(row.clockTickCue).toBeTruthy();
  });

  it('marks single spotlight suggestion in computeAllThreatRadarRows', () => {
    const sessions = [sess('s1', 1), sess('s2', 2), sess('s3', 3)];
    const hot = thr('th-hot', 'Hot', 'predator');
    const cold = thr('th-cold', 'Cold', 'mystery');
    const threatSessionIds = new Map([
      ['th-hot', new Set(['s1'])],
      ['th-cold', new Set(['s1', 's2', 's3'])],
    ]);
    const threatClues = new Map([
      ['th-hot', [{ clueId: 'x1', discovered: false }, { clueId: 'x2', discovered: false }]],
      ['th-cold', []],
    ]);
    const snap = baseSnapshot({
      sessions,
      threats: [hot, cold],
      threatSessionIds,
      threatClues,
      threatThreadIds: new Map([
        ['th-hot', []],
        ['th-cold', []],
      ]),
      threatClocks: new Map([
        ['th-hot', [{ filled: 8, segments: 10, isActive: true, isCompleted: false }]],
        ['th-cold', []],
      ]),
    });
    const rows = computeAllThreatRadarRows(snap);
    const picks = rows.filter((r) => r.isSpotlightSuggestion);
    expect(picks.length).toBe(1);
    expect(picks[0]?.threatId).toBe('th-hot');
    expect(picks[0]?.spotlightCue).toBeTruthy();
    const coldRow = rows.find((r) => r.threatId === 'th-cold');
    expect(coldRow?.isSpotlightSuggestion).toBe(false);
    expect(coldRow?.spotlightRank).toBeGreaterThan(1);
  });

  it('footprint includes thread sessions without direct threat appears_in', () => {
    const s1 = sess('s1', 1);
    const t = thr('th1', 'Indirect', 'living_world');
    const thrd = thread('w1', 'Arc', 'active');
    const snap = baseSnapshot({
      sessions: [s1],
      threats: [t],
      threads: [thrd],
      threatSessionIds: new Map([['th1', new Set()]]),
      threadSessionIds: new Map([['w1', new Set(['s1'])]]),
      threatThreadIds: new Map([['th1', ['w1']]]),
    });
    const row = computeThreatRadarRow(snap, t);
    expect(row.scalars.footprintPresence).toBeGreaterThan(0);
  });

  it('living world rises when network (threads/npc/factions) disappears from sessions', () => {
    const sessions = [sess('s1', 1), sess('s2', 2), sess('s3', 3)];
    const t = thr('th1', 'Żywy front', 'living_world');
    const th = thread('w1', 'Wątek', 'active');
    const f = faction('f1', 'Bractwo');
    const sparse = baseSnapshot({
      sessions,
      threats: [t],
      threads: [th],
      factions: [f],
      threatThreadIds: new Map([['th1', ['w1']]]),
      threadSessionIds: new Map([['w1', new Set(['s1'])]]),
      threatFactionIds: new Map([['th1', new Set(['f1'])]]),
      factionSessionIds: new Map([['f1', new Set(['s1'])]]),
    });
    const active = baseSnapshot({
      sessions,
      threats: [t],
      threads: [th],
      factions: [f],
      threatThreadIds: new Map([['th1', ['w1']]]),
      threadSessionIds: new Map([['w1', new Set(['s2', 's3'])]]),
      threatFactionIds: new Map([['th1', new Set(['f1'])]]),
      factionSessionIds: new Map([['f1', new Set(['s2', 's3'])]]),
    });

    expect(computeThreatRadarRow(sparse, t).heat).toBeGreaterThan(computeThreatRadarRow(active, t).heat);
  });

  it('mystery reacts stronger to unresolved clues present in sessions than to merely undiscovered clues', () => {
    const sessions = [sess('s1', 1), sess('s2', 2), sess('s3', 3)];
    const t = thr('th1', 'Sekret', 'mystery');
    const withOpportunity = baseSnapshot({
      sessions,
      threats: [t],
      threatClues: new Map([['th1', [{ clueId: 'c1', discovered: false }, { clueId: 'c2', discovered: false }]]]),
      clueSessionIds: new Map([
        ['c1', new Set(['s3'])],
        ['c2', new Set(['s2'])],
      ]),
    });
    const withoutOpportunity = baseSnapshot({
      sessions,
      threats: [t],
      threatClues: new Map([['th1', [{ clueId: 'c1', discovered: false }, { clueId: 'c2', discovered: false }]]]),
      clueSessionIds: new Map([
        ['c1', new Set()],
        ['c2', new Set()],
      ]),
    });

    expect(computeThreatRadarRow(withOpportunity, t).heat).toBeGreaterThan(
      computeThreatRadarRow(withoutOpportunity, t).heat,
    );
  });

  it('predator ramps up when table gets closer to truth', () => {
    const sessions = [sess('s1', 1), sess('s2', 2), sess('s3', 3)];
    const t = thr('th1', 'Łowca', 'predator');
    const threadClosed = thread('w1', 'Śledztwo', 'completed');
    const threadOpen = thread('w1', 'Śledztwo', 'active');

    const nearTruth = baseSnapshot({
      sessions,
      threats: [t],
      threads: [threadClosed],
      threatThreadIds: new Map([['th1', ['w1']]]),
      threadSessionIds: new Map([['w1', new Set(['s2', 's3'])]]),
      threatClues: new Map([['th1', [{ clueId: 'c1', discovered: true }, { clueId: 'c2', discovered: true }]]]),
    });
    const farTruth = baseSnapshot({
      sessions,
      threats: [t],
      threads: [threadOpen],
      threatThreadIds: new Map([['th1', ['w1']]]),
      threadSessionIds: new Map([['w1', new Set(['s2', 's3'])]]),
      threatClues: new Map([['th1', [{ clueId: 'c1', discovered: false }, { clueId: 'c2', discovered: false }]]]),
    });

    expect(computeThreatRadarRow(nearTruth, t).heat).toBeGreaterThan(computeThreatRadarRow(farTruth, t).heat);
  });

  it('avalanche accelerates with clock progress', () => {
    const sessions = [sess('s1', 1), sess('s2', 2), sess('s3', 3), sess('s4', 4)];
    const t = thr('th1', 'Lawina', 'avalanche');
    const low = baseSnapshot({
      sessions,
      threats: [t],
      threatClocks: new Map([['th1', [{ filled: 2, segments: 10, isActive: true, isCompleted: false }]]]),
    });
    const high = baseSnapshot({
      sessions,
      threats: [t],
      threatClocks: new Map([['th1', [{ filled: 8, segments: 10, isActive: true, isCompleted: false }]]]),
    });

    expect(computeThreatRadarRow(high, t).heat).toBeGreaterThan(computeThreatRadarRow(low, t).heat);
  });
});
