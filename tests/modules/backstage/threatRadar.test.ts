import { describe, it, expect } from 'vitest';
import { computeAllThreatRadarRows, computeThreatRadarRow } from '@modules/backstage/engine/threatRadar';
import type { BackstageSnapshot } from '@modules/backstage/types';
import type { Session } from '@modules/sessions/types';
import type { Thread } from '@modules/threads/types';
import type { Threat } from '@modules/fronts/types';

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

function footprintFor(
  threatId: string,
  snap: Pick<BackstageSnapshot, 'threatSessionIds' | 'threatThreadIds' | 'threatClues' | 'threadSessionIds' | 'clueSessionIds' | 'npcSessionIds'>,
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
  fp.set(threatId, set);
  return fp;
}

describe('computeThreatRadarRow', () => {
  it('raises tier when clock is critical', () => {
    const s1 = sess('s1', 1);
    const s2 = sess('s2', 2);
    const t = thr('th1', 'Villain');
    const threatSessionIds = new Map([['th1', new Set(['s2'])]]);
    const snap: BackstageSnapshot = {
      sessions: [s1, s2],
      threads: [],
      threadSessionIds: new Map(),
      npcs: [],
      npcSessionIds: new Map(),
      threats: [t],
      locations: [],
      locationSessionIds: new Map(),
      clues: [],
      clueSessionIds: new Map(),
      activeThreats: [t],
      threatSessionIds,
      threatClues: new Map([['th1', []]]),
      threatThreadIds: new Map([['th1', []]]),
      threatClocks: new Map([
        [
          'th1',
          [{ filled: 9, segments: 10, isActive: true, isCompleted: false }],
        ],
      ]),
      threatFootprintSessionIds: footprintFor('th1', {
        threatSessionIds,
        threatThreadIds: new Map([['th1', []]]),
        threatClues: new Map([['th1', []]]),
        threadSessionIds: new Map(),
        clueSessionIds: new Map(),
        npcSessionIds: new Map(),
      }),
    };
    const row = computeThreatRadarRow(snap, t);
    expect(row.clockCritical).toBe(true);
    expect(row.tier).toBeGreaterThanOrEqual(3);
  });

  it('long absence of footprint increases heat vs recent footprint', () => {
    const sessions = [sess('s1', 1), sess('s2', 2), sess('s3', 3)];
    const t = thr('th1', 'Ghost');
    const absentTs = new Map<string, Set<string>>([['th1', new Set(['s1'])]]);
    const absent: BackstageSnapshot = {
      sessions,
      threads: [],
      threadSessionIds: new Map(),
      npcs: [],
      npcSessionIds: new Map(),
      threats: [t],
      locations: [],
      locationSessionIds: new Map(),
      clues: [],
      clueSessionIds: new Map(),
      activeThreats: [t],
      threatSessionIds: absentTs,
      threatClues: new Map([['th1', []]]),
      threatThreadIds: new Map([['th1', []]]),
      threatClocks: new Map([['th1', []]]),
      threatFootprintSessionIds: footprintFor('th1', {
        threatSessionIds: absentTs,
        threatThreadIds: new Map([['th1', []]]),
        threatClues: new Map([['th1', []]]),
        threadSessionIds: new Map(),
        clueSessionIds: new Map(),
        npcSessionIds: new Map(),
      }),
    };
    const recentTs = new Map([['th1', new Set(['s3'])]]);
    const recent: BackstageSnapshot = {
      ...absent,
      threatSessionIds: recentTs,
      threatFootprintSessionIds: footprintFor('th1', {
        threatSessionIds: recentTs,
        threatThreadIds: new Map([['th1', []]]),
        threatClues: new Map([['th1', []]]),
        threadSessionIds: new Map(),
        clueSessionIds: new Map(),
        npcSessionIds: new Map(),
      }),
    };
    const rAbsent = computeThreatRadarRow(absent, t);
    const rRecent = computeThreatRadarRow(recent, t);
    expect(rAbsent.heat).toBeGreaterThan(rRecent.heat);
  });

  it('sets narrativeGap when last session had thread and clues undiscovered', () => {
    const s1 = sess('s1', 1);
    const thrd = thread('w1', 'Case', 'active');
    const villain = thr('th1', 'Boss');
    const threatSessionIds = new Map([['th1', new Set(['s1'])]]);
    const threadSessionIds = new Map([['w1', new Set(['s1'])]]);
    const threatClues = new Map([['th1', [{ clueId: 'c1', discovered: false }, { clueId: 'c2', discovered: true }]]]);
    const snap: BackstageSnapshot = {
      sessions: [s1],
      threads: [thrd],
      threadSessionIds,
      npcs: [],
      npcSessionIds: new Map(),
      threats: [villain],
      locations: [],
      locationSessionIds: new Map(),
      clues: [],
      clueSessionIds: new Map(),
      activeThreats: [villain],
      threatSessionIds,
      threatClues,
      threatThreadIds: new Map([['th1', ['w1']]]),
      threatClocks: new Map([['th1', []]]),
      threatFootprintSessionIds: footprintFor('th1', {
        threatSessionIds,
        threatThreadIds: new Map([['th1', ['w1']]]),
        threatClues,
        threadSessionIds,
        clueSessionIds: new Map(),
        npcSessionIds: new Map(),
      }),
    };
    const row = computeThreatRadarRow(snap, villain);
    expect(row.narrativeGap).toBe(true);
  });

  it('sets clockTickHint soon when fill is mid-range but not critical', () => {
    const s1 = sess('s1', 1);
    const t = thr('th1', 'Slow burn');
    const threatSessionIds = new Map([['th1', new Set(['s1'])]]);
    const snap: BackstageSnapshot = {
      sessions: [s1],
      threads: [],
      threadSessionIds: new Map(),
      npcs: [],
      npcSessionIds: new Map(),
      threats: [t],
      locations: [],
      locationSessionIds: new Map(),
      clues: [],
      clueSessionIds: new Map(),
      activeThreats: [t],
      threatSessionIds,
      threatClues: new Map([['th1', []]]),
      threatThreadIds: new Map([['th1', []]]),
      threatClocks: new Map([
        ['th1', [{ filled: 6, segments: 10, isActive: true, isCompleted: false }]],
      ]),
      threatFootprintSessionIds: footprintFor('th1', {
        threatSessionIds,
        threatThreadIds: new Map([['th1', []]]),
        threatClues: new Map([['th1', []]]),
        threadSessionIds: new Map(),
        clueSessionIds: new Map(),
        npcSessionIds: new Map(),
      }),
    };
    const row = computeThreatRadarRow(snap, t);
    expect(row.clockCritical).toBe(false);
    expect(row.clockTickHint).toBe('soon');
    expect(row.clockTickCue).toBeTruthy();
  });

  it('marks single spotlight suggestion in computeAllThreatRadarRows', () => {
    const sessions = [sess('s1', 1), sess('s2', 2), sess('s3', 3)];
    const hot = thr('th-hot', 'Hot', 'predator');
    const cold = thr('th-cold', 'Cold', 'mystery');
    const hotTs = new Map([
      ['th-hot', new Set(['s1'])],
      ['th-cold', new Set(['s1', 's2', 's3'])],
    ]);
    const threatClues = new Map([
      ['th-hot', [{ clueId: 'x1', discovered: false }, { clueId: 'x2', discovered: false }]],
      ['th-cold', []],
    ]);
    const snap: BackstageSnapshot = {
      sessions,
      threads: [],
      threadSessionIds: new Map(),
      npcs: [],
      npcSessionIds: new Map(),
      threats: [hot, cold],
      locations: [],
      locationSessionIds: new Map(),
      clues: [],
      clueSessionIds: new Map(),
      activeThreats: [hot, cold],
      threatSessionIds: hotTs,
      threatClues,
      threatThreadIds: new Map([
        ['th-hot', []],
        ['th-cold', []],
      ]),
      threatClocks: new Map([
        ['th-hot', [{ filled: 8, segments: 10, isActive: true, isCompleted: false }]],
        ['th-cold', []],
      ]),
      threatFootprintSessionIds: new Map([
        [
          'th-hot',
          footprintFor('th-hot', {
            threatSessionIds: hotTs,
            threatThreadIds: new Map([
              ['th-hot', []],
              ['th-cold', []],
            ]),
            threatClues,
            threadSessionIds: new Map(),
            clueSessionIds: new Map(),
            npcSessionIds: new Map(),
          }).get('th-hot')!,
        ],
        [
          'th-cold',
          footprintFor('th-cold', {
            threatSessionIds: hotTs,
            threatThreadIds: new Map([
              ['th-hot', []],
              ['th-cold', []],
            ]),
            threatClues,
            threadSessionIds: new Map(),
            clueSessionIds: new Map(),
            npcSessionIds: new Map(),
          }).get('th-cold')!,
        ],
      ]),
    };
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
    const threatSessionIds = new Map<string, Set<string>>([['th1', new Set()]]);
    const threadSessionIds = new Map([['w1', new Set(['s1'])]]);
    const snap: BackstageSnapshot = {
      sessions: [s1],
      threads: [thrd],
      threadSessionIds,
      npcs: [],
      npcSessionIds: new Map(),
      threats: [t],
      locations: [],
      locationSessionIds: new Map(),
      clues: [],
      clueSessionIds: new Map(),
      activeThreats: [t],
      threatSessionIds,
      threatClues: new Map([['th1', []]]),
      threatThreadIds: new Map([['th1', ['w1']]]),
      threatClocks: new Map([['th1', []]]),
      threatFootprintSessionIds: footprintFor('th1', {
        threatSessionIds,
        threatThreadIds: new Map([['th1', ['w1']]]),
        threatClues: new Map([['th1', []]]),
        threadSessionIds,
        clueSessionIds: new Map(),
        npcSessionIds: new Map(),
      }),
    };
    const row = computeThreatRadarRow(snap, t);
    expect(row.scalars.footprintPresence).toBeGreaterThan(0);
  });
});
