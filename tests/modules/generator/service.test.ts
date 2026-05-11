import { describe, expect, it } from 'vitest';
import { commitRollFromPack } from '@modules/generator/service';
import type { GeneratorPack } from '@modules/generator/contracts';

const basePack: GeneratorPack = {
  id: 'pack-1',
  campaignId: 'camp-1',
  name: 'Pack',
  description: '',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  tables: [
    {
      id: 'first',
      name: 'firstName',
      type: 'firstName',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      entries: [
        { id: 'e1', value: 'Ada', weight: 1, tags: [], isActive: true },
        { id: 'e2', value: 'Bea', weight: 1, tags: [], isActive: true },
      ],
    },
    {
      id: 'nick',
      name: 'nickname',
      type: 'nickname',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      entries: [{ id: 'n1', value: 'Lis', weight: 1, tags: [], isActive: true }],
    },
    {
      id: 'last',
      name: 'lastName',
      type: 'lastName',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      entries: [{ id: 'l1', value: 'Kowal', weight: 1, tags: [], isActive: true }],
    },
    {
      id: 'event',
      name: 'event',
      type: 'event',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      entries: [
        { id: 'ev1', value: 'A', weight: 10, tags: [], isActive: true },
        { id: 'ev2', value: 'B', weight: 1, tags: [], isActive: true },
      ],
    },
  ],
};

describe('generator service', () => {
  it('is deterministic for same seed', () => {
    const a = commitRollFromPack({ pack: basePack, kind: 'character', options: { seed: 'same-seed' } });
    const b = commitRollFromPack({ pack: basePack, kind: 'character', options: { seed: 'same-seed' } });
    expect(a.resultText).toBe(b.resultText);
  });

  it('supports withoutRepetition fallback', () => {
    const roll = commitRollFromPack({
      pack: basePack,
      kind: 'customTable',
      customTableId: 'first',
      options: { withoutRepetition: true, previousEntryIds: ['e1'] },
    });
    expect(roll.resultText).toBe('Bea');
  });

  it('respects weighted outcomes with seed variety', () => {
    const values = Array.from({ length: 20 }, (_, i) =>
      commitRollFromPack({ pack: basePack, kind: 'eventTable', options: { seed: `s-${i}` } }).resultText,
    );
    const countA = values.filter((item) => item === 'A').length;
    const countB = values.filter((item) => item === 'B').length;
    expect(countA).toBeGreaterThan(countB);
  });

  it('rolls large custom tables (>10k entries) within a practical budget', () => {
    const largeTable = {
      id: 'big',
      name: 'custom:big',
      type: 'custom:big',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      entries: Array.from({ length: 10_500 }, (_, index) => ({
        id: `big-${index}`,
        value: `Entry ${index}`,
        weight: 1,
        tags: [],
        isActive: true,
      })),
    } as const;
    const pack: GeneratorPack = {
      ...basePack,
      id: 'pack-large',
      tables: [...basePack.tables, largeTable],
    };
    const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? () => performance.now()
      : () => Date.now();

    const start = now();
    const result = commitRollFromPack({
      pack,
      kind: 'customTable',
      customTableId: 'big',
      options: { seed: 'large-table-seed' },
    });
    const elapsedMs = now() - start;

    expect(result.resultText.startsWith('Entry ')).toBe(true);
    expect(elapsedMs).toBeLessThan(500);
  });

  it('evolutionary mode biases outcomes toward campaign context tags', () => {
    const contextPack: GeneratorPack = {
      ...basePack,
      id: 'pack-context',
      tables: [
        ...basePack.tables,
        {
          id: 'ctx',
          name: 'custom:ctx',
          type: 'custom:ctx',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          entries: [
            { id: 'city', value: 'Kupiec z miasta', weight: 1, tags: ['miasto', 'handel'], isActive: true },
            { id: 'wild', value: 'Postac z dziczy', weight: 1, tags: ['dzicz', 'tropienie'], isActive: true },
          ],
        },
      ],
    };

    const results = Array.from({ length: 40 }, (_, index) =>
      commitRollFromPack({
        pack: contextPack,
        kind: 'customTable',
        customTableId: 'ctx',
        options: {
          seed: `ctx-${index}`,
          evo: {
            enabled: true,
            contextTags: ['miasto', 'intryga'],
            generations: 5,
            explorationRate: 0.2,
          },
        },
      }).resultText,
    );
    const cityHits = results.filter((value) => value.includes('miasta')).length;
    const wildHits = results.filter((value) => value.includes('dziczy')).length;
    expect(cityHits).toBeGreaterThan(wildHits);
  });
});

