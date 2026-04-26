import { describe, it, expect } from 'vitest';
import { computeThreatRadarRow } from '@modules/backstage/engine/threatRadar';
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

function thr(id: string, name: string): Threat {
  return {
    id,
    type: 'threat',
    name,
    description: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: { threatType: 'dark_entity', impulse: 'x', moves: ['a'], status: 'active' },
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

describe('computeThreatRadarRow', () => {
  it('raises tier when clock is critical', () => {
    const s1 = sess('s1', 1);
    const s2 = sess('s2', 2);
    const t = thr('th1', 'Villain');
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
      threatSessionIds: new Map([['th1', new Set(['s2'])]]),
      threatClues: new Map([['th1', []]]),
      threatThreadIds: new Map([['th1', []]]),
      threatClocks: new Map([
        [
          'th1',
          [{ filled: 9, segments: 10, isActive: true, isCompleted: false }],
        ],
      ]),
    };
    const row = computeThreatRadarRow(snap, 'th1', 'Villain');
    expect(row.clockCritical).toBe(true);
    expect(row.tier).toBeGreaterThanOrEqual(3);
  });

  it('long absence without presence increases heat vs recent appearance', () => {
    const sessions = [sess('s1', 1), sess('s2', 2), sess('s3', 3)];
    const t = thr('th1', 'Ghost');
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
      threatSessionIds: new Map([['th1', new Set(['s1'])]]),
      threatClues: new Map([['th1', []]]),
      threatThreadIds: new Map([['th1', []]]),
      threatClocks: new Map([['th1', []]]),
    };
    const recent: BackstageSnapshot = {
      ...absent,
      threatSessionIds: new Map([['th1', new Set(['s3'])]]),
    };
    const rAbsent = computeThreatRadarRow(absent, 'th1', 'Ghost');
    const rRecent = computeThreatRadarRow(recent, 'th1', 'Ghost');
    expect(rAbsent.heat).toBeGreaterThan(rRecent.heat);
  });

  it('sets narrativeGap when last session had thread and clues undiscovered', () => {
    const s1 = sess('s1', 1);
    const thrd = thread('w1', 'Case', 'active');
    const villain = thr('th1', 'Boss');
    const snap: BackstageSnapshot = {
      sessions: [s1],
      threads: [thrd],
      threadSessionIds: new Map([['w1', new Set(['s1'])]]),
      npcs: [],
      npcSessionIds: new Map(),
      threats: [villain],
      locations: [],
      locationSessionIds: new Map(),
      clues: [],
      clueSessionIds: new Map(),
      activeThreats: [villain],
      threatSessionIds: new Map([['th1', new Set(['s1'])]]),
      threatClues: new Map([['th1', [{ discovered: false }, { discovered: true }]]]),
      threatThreadIds: new Map([['th1', ['w1']]]),
      threatClocks: new Map([['th1', []]]),
    };
    const row = computeThreatRadarRow(snap, 'th1', 'Boss');
    expect(row.narrativeGap).toBe(true);
  });
});
