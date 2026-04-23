import { describe, it, expect, afterEach } from 'vitest';
import Dexie from 'dexie';
import { MgHelperDb } from '@shared/db/database';
import { SCHEMA_V1 } from '@shared/db/schema';

describe('Dexie v1 → v2 migration', () => {
  const dbName = `mg-migrate-v1-v2-${Date.now()}`;

  afterEach(async () => {
    await Dexie.delete(dbName);
  });

  it('adds the assets object store when opening a v1 database with MgHelperDb', async () => {
    const legacy = new Dexie(dbName);
    legacy.version(1).stores(SCHEMA_V1);
    await legacy.open();
    await legacy.entities.add({
      id: 'e1',
      type: 'npc',
      name: 'Test',
      description: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {},
    });
    await legacy.close();

    const upgraded = new MgHelperDb(dbName);
    await upgraded.open();
    expect(upgraded.tables.map((t) => t.name).sort()).toEqual(
      ['assets', 'entities', 'generatorPacks', 'generatorRollLogs', 'migrationBackups', 'relations'].sort(),
    );
    const row = await upgraded.entities.get('e1');
    expect(row?.name).toBe('Test');
    await upgraded.close();
  });
});
