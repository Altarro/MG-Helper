import { beforeEach, describe, expect, it } from 'vitest';
import { openCampaignDb } from '@shared/db/database';
import {
  ensureGeneratorDataIntegrity,
  listGeneratorMigrationBackups,
  restoreGeneratorFromMigrationBackup,
} from '@modules/generator/dataHealth';

const TEST_ID = '__generator-data-health__';
const db = openCampaignDb(TEST_ID);

describe('generator data health', () => {
  beforeEach(async () => {
    await db.generatorPacks.clear();
    await db.generatorRollLogs.clear();
    await db.migrationBackups.clear();
  });

  it('repairs malformed pack rows and creates pre-repair backup snapshot', async () => {
    await db.generatorPacks.put({
      id: 'broken-pack',
      campaignId: TEST_ID,
      name: '   ',
      description: null as unknown as string,
      isActive: true,
      tables: [
        {
          id: 'bad-table',
          name: '',
          type: 'custom:bad',
          entries: [
            { id: 'e1', value: '', weight: -3, tags: ['x'.repeat(70)], isActive: true },
            { id: 'e2', value: 'OK', weight: 1, tags: ['tag'], isActive: true },
          ],
          isActive: true,
          createdAt: '',
          updatedAt: '',
        },
      ],
      createdAt: '',
      updatedAt: '',
    } as unknown as Parameters<typeof db.generatorPacks.put>[0]);

    const result = await ensureGeneratorDataIntegrity(db, TEST_ID);
    expect(result.repaired).toBe(true);
    expect(result.normalizedPacks).toBe(1);

    const repaired = await db.generatorPacks.get('broken-pack');
    expect(repaired).toBeDefined();
    expect(repaired?.name).toBe('Recovered pack');
    expect(repaired?.description).toBe('');
    expect(repaired?.tables[0]?.entries).toHaveLength(1);

    const backups = await db.migrationBackups.where('campaignId').equals(TEST_ID).toArray();
    expect(backups).toHaveLength(1);
    expect(backups[0]?.kind).toBe('generator_repair');
  });

  it('drops orphan roll logs pointing to missing packs', async () => {
    await db.generatorPacks.put({
      id: 'pack-a',
      campaignId: TEST_ID,
      name: 'Pack A',
      description: '',
      isActive: true,
      tables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.generatorRollLogs.bulkAdd([
      {
        id: 'log-valid',
        campaignId: TEST_ID,
        sessionId: null,
        packId: 'pack-a',
        kind: 'eventTable',
        resultText: 'valid',
        sourceTableIds: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'log-orphan',
        campaignId: TEST_ID,
        sessionId: null,
        packId: 'pack-missing',
        kind: 'eventTable',
        resultText: 'orphan',
        sourceTableIds: [],
        createdAt: new Date().toISOString(),
      },
    ]);

    const result = await ensureGeneratorDataIntegrity(db, TEST_ID);
    expect(result.repaired).toBe(true);
    expect(result.droppedLogs).toBe(1);

    const logs = await db.generatorRollLogs.where('campaignId').equals(TEST_ID).toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.id).toBe('log-valid');
  });

  it('restores generator data from migration backup snapshot (rollback procedure)', async () => {
    await db.generatorPacks.put({
      id: 'pack-before',
      campaignId: TEST_ID,
      name: 'Before',
      description: '',
      isActive: true,
      tables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.generatorRollLogs.put({
      id: 'log-before',
      campaignId: TEST_ID,
      sessionId: null,
      packId: 'pack-before',
      kind: 'eventTable',
      resultText: 'before',
      sourceTableIds: [],
      createdAt: new Date().toISOString(),
    });
    await db.generatorRollLogs.put({
      id: 'log-bad',
      campaignId: TEST_ID,
      sessionId: null,
      packId: 'pack-missing',
      kind: 'eventTable',
      resultText: 'bad',
      sourceTableIds: [],
      createdAt: new Date().toISOString(),
    });
    await ensureGeneratorDataIntegrity(db, TEST_ID);

    await db.generatorPacks.clear();
    await db.generatorRollLogs.clear();
    await db.generatorPacks.put({
      id: 'pack-after',
      campaignId: TEST_ID,
      name: 'After',
      description: '',
      isActive: true,
      tables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const backups = await listGeneratorMigrationBackups(db, TEST_ID);
    expect(backups.length).toBeGreaterThan(0);
    const rollback = await restoreGeneratorFromMigrationBackup(db, TEST_ID, backups[0]!.id);
    expect(rollback.ok).toBe(true);

    const packs = await db.generatorPacks.where('campaignId').equals(TEST_ID).toArray();
    const logs = await db.generatorRollLogs.where('campaignId').equals(TEST_ID).toArray();
    expect(packs.map((item) => item.id)).toContain('pack-before');
    expect(logs.map((item) => item.id)).toContain('log-before');
  });
});
