import { beforeEach, describe, expect, it } from 'vitest';
import { openCampaignDb } from '@shared/db/database';
import { ensureGeneratorDataIntegrity } from '@modules/generator/dataHealth';

const TEST_ID = '__generator-migration-copies__';
const db = openCampaignDb(TEST_ID);

describe('generator migration tests on production-like copies', () => {
  beforeEach(async () => {
    await db.generatorPacks.clear();
    await db.generatorRollLogs.clear();
    await db.migrationBackups.clear();
  });

  it('normalizes mixed malformed payload from production-like dump', async () => {
    await db.generatorPacks.bulkAdd([
      {
        id: 'pack-1',
        campaignId: TEST_ID,
        name: '  Miasto Cieni  ',
        description: '',
        isActive: true,
        tables: [
          {
            id: 't-1',
            name: 'firstName',
            type: 'firstName',
            entries: [
              { id: 'e-1', value: 'Ada', weight: 1, tags: ['core'], isActive: true },
              { id: 'e-2', value: ' ', weight: 0, tags: ['bad'], isActive: true },
            ],
            isActive: true,
            createdAt: '',
            updatedAt: '',
          },
          {
            id: 't-2',
            name: 'Bad Type',
            type: 'broken-type',
            entries: [],
            isActive: true,
            createdAt: '',
            updatedAt: '',
          },
        ],
        createdAt: '',
        updatedAt: '',
      } as unknown as Parameters<typeof db.generatorPacks.bulkAdd>[0][number],
      {
        id: 'pack-2',
        campaignId: TEST_ID,
        name: '',
        description: '',
        isActive: true,
        tables: [],
        createdAt: '',
        updatedAt: '',
      } as unknown as Parameters<typeof db.generatorPacks.bulkAdd>[0][number],
    ]);
    await db.generatorRollLogs.bulkAdd([
      {
        id: 'log-good',
        campaignId: TEST_ID,
        sessionId: null,
        packId: 'pack-1',
        kind: 'eventTable',
        resultText: 'entry',
        sourceTableIds: [],
        createdAt: '',
      },
      {
        id: 'log-bad-kind',
        campaignId: TEST_ID,
        sessionId: null,
        packId: 'pack-1',
        kind: 'unknown-kind',
        resultText: 'entry',
        sourceTableIds: [],
        createdAt: '',
      } as unknown as Parameters<typeof db.generatorRollLogs.bulkAdd>[0][number],
      {
        id: 'log-bad-pack',
        campaignId: TEST_ID,
        sessionId: null,
        packId: 'missing-pack',
        kind: 'eventTable',
        resultText: 'entry',
        sourceTableIds: [],
        createdAt: '',
      },
    ]);

    const result = await ensureGeneratorDataIntegrity(db, TEST_ID);
    expect(result.repaired).toBe(true);
    expect(result.droppedLogs).toBe(2);

    const packs = await db.generatorPacks.where('campaignId').equals(TEST_ID).toArray();
    const logs = await db.generatorRollLogs.where('campaignId').equals(TEST_ID).toArray();
    expect(packs).toHaveLength(2);
    expect(packs[0]?.name.length).toBeGreaterThan(0);
    expect(packs[0]?.tables.every((table) => table.type !== 'broken-type')).toBe(true);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.id).toBe('log-good');

    const backups = await db.migrationBackups.where('campaignId').equals(TEST_ID).toArray();
    expect(backups).toHaveLength(1);
  });
});
