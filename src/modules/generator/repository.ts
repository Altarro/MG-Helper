import { generateId } from '@shared/utils/id';
import { nowISO } from '@shared/utils/date';
import type { MgHelperDb } from '@shared/db/database';
import type { GeneratorPackRecord, GeneratorRollLogRecord } from '@shared/types/generator';
import { createGeneratorDemoPacks } from './demoPacks';
import {
  GENERATOR_SYSTEM_TABLE_TYPES,
  type GeneratorCompositeKind,
  type GeneratorPack,
  type GeneratorTable,
} from './contracts';

export type GeneratorMergeMode = 'append' | 'overwrite' | 'replace';

export async function listGeneratorPacks(
  db: MgHelperDb,
  campaignId: string,
): Promise<GeneratorPackRecord[]> {
  return db.generatorPacks
    .where('campaignId')
    .equals(campaignId)
    .sortBy('updatedAt');
}

export async function saveGeneratorPack(db: MgHelperDb, pack: GeneratorPackRecord): Promise<void> {
  await db.generatorPacks.put(pack);
}

export async function deleteGeneratorPack(db: MgHelperDb, packId: string): Promise<void> {
  await db.generatorPacks.delete(packId);
}

export async function importGeneratorPacks(
  db: MgHelperDb,
  campaignId: string,
  packs: GeneratorPackRecord[],
  mode: GeneratorMergeMode,
): Promise<void> {
  const sanitized = packs.map((pack) => ({
    ...pack,
    campaignId,
    updatedAt: nowISO(),
  }));
  await db.transaction('rw', db.generatorPacks, async () => {
    if (mode === 'replace') {
      const existing = await db.generatorPacks.where('campaignId').equals(campaignId).toArray();
      await Promise.all(existing.map((pack) => db.generatorPacks.delete(pack.id)));
      await db.generatorPacks.bulkPut(sanitized);
      return;
    }

    if (mode === 'append') {
      await db.generatorPacks.bulkPut(sanitized);
      return;
    }

    for (const importedPack of sanitized) {
      const existing = await db.generatorPacks
        .where('campaignId')
        .equals(campaignId)
        .and((pack) => pack.name.trim().toLowerCase() === importedPack.name.trim().toLowerCase())
        .first();
      if (existing) {
        await db.generatorPacks.put({
          ...importedPack,
          id: existing.id,
          createdAt: existing.createdAt,
        });
      } else {
        await db.generatorPacks.put(importedPack);
      }
    }
  });
}

export async function seedGeneratorDemoPacks(
  db: MgHelperDb,
  campaignId: string,
): Promise<GeneratorPackRecord[]> {
  const demo = createGeneratorDemoPacks(campaignId);
  await importGeneratorPacks(db, campaignId, demo, 'append');
  return demo;
}

export async function appendGeneratorRollLog(
  db: MgHelperDb,
  input: Omit<GeneratorRollLogRecord, 'id' | 'createdAt'> & { createdAt?: string },
): Promise<GeneratorRollLogRecord> {
  const log: GeneratorRollLogRecord = {
    id: generateId(),
    createdAt: input.createdAt ?? nowISO(),
    ...input,
  };
  await db.generatorRollLogs.put(log);
  return log;
}

export async function listGeneratorRollLogs(
  db: MgHelperDb,
  campaignId: string,
  options: { sessionId?: string | null; kind?: GeneratorCompositeKind; limit?: number } = {},
): Promise<GeneratorRollLogRecord[]> {
  const limit = options.limit ?? 100;
  const rows = await db.generatorRollLogs.where('campaignId').equals(campaignId).toArray();
  return rows
    .filter((item) => (options.sessionId === undefined ? true : item.sessionId === options.sessionId))
    .filter((item) => (options.kind ? item.kind === options.kind : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function ensureDefaultGeneratorPack(
  db: MgHelperDb,
  campaignId: string,
): Promise<GeneratorPackRecord> {
  const existing = await db.generatorPacks.where('campaignId').equals(campaignId).first();
  if (existing) return existing;
  const now = nowISO();
  const pack: GeneratorPackRecord = {
    id: generateId(),
    campaignId,
    name: 'Domyslny zestaw',
    description: 'Startowy zestaw tabel systemowych dla Inspiracji.',
    isActive: true,
    tables: GENERATOR_SYSTEM_TABLE_TYPES.map((type) => createSystemTable(type, now)),
    createdAt: now,
    updatedAt: now,
  };
  await db.generatorPacks.add(pack);
  return pack;
}

function createSystemTable(type: string, timestamp: string): GeneratorPack['tables'][number] {
  return {
    id: generateId(),
    name: type,
    type: type as GeneratorTable['type'],
    entries: [],
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

