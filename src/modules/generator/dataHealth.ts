import type { MgHelperDb } from '@shared/db/database';
import { generateId } from '@shared/utils/id';
import { nowISO } from '@shared/utils/date';
import type { GeneratorPackRecord, GeneratorRollLogRecord } from '@shared/types/generator';
import { GENERATOR_COMPOSITE_KINDS, GENERATOR_SYSTEM_TABLE_TYPES } from './contracts';
import { GENERATOR_IMPORT_LIMITS } from './schemas';

export interface GeneratorIntegrityReport {
  repaired: boolean;
  droppedPacks: number;
  droppedLogs: number;
  normalizedPacks: number;
  normalizedLogs: number;
}

interface GeneratorRepairBackupPayload {
  generatorPacks: unknown[];
  generatorRollLogs: unknown[];
  reason?: string;
}

function normalizeText(value: unknown, fallback: string, max: number): string {
  if (typeof value !== 'string') return fallback;
  const next = value.trim();
  if (!next) return fallback;
  return next.slice(0, max);
}

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const tag = item.trim().slice(0, GENERATOR_IMPORT_LIMITS.maxTagLength);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= GENERATOR_IMPORT_LIMITS.maxEntryTags) break;
  }
  return out;
}

function normalizePack(raw: unknown, campaignId: string, timestamp: string): GeneratorPackRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const pack = raw as Partial<GeneratorPackRecord>;
  const tablesRaw = Array.isArray(pack.tables) ? pack.tables : [];
  const tables = tablesRaw
    .slice(0, GENERATOR_IMPORT_LIMITS.maxTablesPerPack)
    .map((tableRaw) => {
      if (!tableRaw || typeof tableRaw !== 'object') return null;
      const table = tableRaw as GeneratorPackRecord['tables'][number];
      const entriesRaw = Array.isArray(table.entries) ? table.entries : [];
      const entries = entriesRaw
        .slice(0, GENERATOR_IMPORT_LIMITS.maxEntriesPerTable)
        .map((entryRaw) => {
          if (!entryRaw || typeof entryRaw !== 'object') return null;
          const entry = entryRaw as GeneratorPackRecord['tables'][number]['entries'][number];
          const value = normalizeText(entry.value, '', GENERATOR_IMPORT_LIMITS.maxEntryValueLength);
          if (!value) return null;
          const weight = typeof entry.weight === 'number' && Number.isFinite(entry.weight) && entry.weight > 0
            ? Math.min(entry.weight, 1000)
            : 1;
          return {
            id: typeof entry.id === 'string' && entry.id ? entry.id : generateId(),
            value,
            weight,
            tags: normalizeTags(entry.tags),
            isActive: entry.isActive !== false,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
      const typeCandidate = typeof table.type === 'string' ? table.type.trim() : '';
      const systemType = GENERATOR_SYSTEM_TABLE_TYPES.includes(typeCandidate as (typeof GENERATOR_SYSTEM_TABLE_TYPES)[number]);
      const customType = /^custom:[a-z0-9][a-z0-9_-]{1,62}$/i.test(typeCandidate);
      if (!systemType && !customType) return null;
      return {
        id: typeof table.id === 'string' && table.id ? table.id : generateId(),
        name: normalizeText(table.name, typeCandidate, 120),
        type: typeCandidate,
        entries,
        isActive: table.isActive !== false,
        createdAt: typeof table.createdAt === 'string' && table.createdAt ? table.createdAt : timestamp,
        updatedAt: typeof table.updatedAt === 'string' && table.updatedAt ? table.updatedAt : timestamp,
      };
    })
    .filter((table): table is NonNullable<typeof table> => Boolean(table));

  const name = normalizeText(pack.name, 'Recovered pack', 120);
  return {
    id: typeof pack.id === 'string' && pack.id ? pack.id : generateId(),
    campaignId,
    name,
    description: normalizeText(pack.description, '', 2000),
    isActive: pack.isActive !== false,
    tables,
    createdAt: typeof pack.createdAt === 'string' && pack.createdAt ? pack.createdAt : timestamp,
    updatedAt: typeof pack.updatedAt === 'string' && pack.updatedAt ? pack.updatedAt : timestamp,
  };
}

function normalizeLog(
  raw: unknown,
  campaignId: string,
  validPackIds: Set<string>,
  timestamp: string,
): GeneratorRollLogRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const log = raw as Partial<GeneratorRollLogRecord>;
  if (typeof log.packId !== 'string' || !validPackIds.has(log.packId)) return null;
  const kind = typeof log.kind === 'string' ? log.kind : '';
  if (!GENERATOR_COMPOSITE_KINDS.includes(kind as (typeof GENERATOR_COMPOSITE_KINDS)[number])) return null;
  const resultText = normalizeText(log.resultText, '', 300);
  if (!resultText) return null;
  const sourceTableIds = Array.isArray(log.sourceTableIds)
    ? log.sourceTableIds.filter((item): item is string => typeof item === 'string' && item.length > 0).slice(0, 20)
    : [];
  return {
    id: typeof log.id === 'string' && log.id ? log.id : generateId(),
    campaignId,
    sessionId: typeof log.sessionId === 'string' ? log.sessionId : null,
    packId: log.packId,
    kind,
    resultText,
    sourceTableIds,
    createdAt: typeof log.createdAt === 'string' && log.createdAt ? log.createdAt : timestamp,
  };
}

export async function ensureGeneratorDataIntegrity(
  db: MgHelperDb,
  campaignId: string,
): Promise<GeneratorIntegrityReport> {
  const timestamp = nowISO();
  const [rawPacks, rawLogs] = await Promise.all([
    db.generatorPacks.where('campaignId').equals(campaignId).toArray(),
    db.generatorRollLogs.where('campaignId').equals(campaignId).toArray(),
  ]);

  const normalizedPacks = rawPacks
    .map((pack) => normalizePack(pack, campaignId, timestamp))
    .filter((pack): pack is GeneratorPackRecord => Boolean(pack));
  const validPackIds = new Set(normalizedPacks.map((pack) => pack.id));
  const normalizedLogs = rawLogs
    .map((log) => normalizeLog(log, campaignId, validPackIds, timestamp))
    .filter((log): log is GeneratorRollLogRecord => Boolean(log));

  const hadChanges = normalizedPacks.length !== rawPacks.length
    || normalizedLogs.length !== rawLogs.length
    || JSON.stringify(rawPacks) !== JSON.stringify(normalizedPacks)
    || JSON.stringify(rawLogs) !== JSON.stringify(normalizedLogs);

  if (!hadChanges) {
    return {
      repaired: false,
      droppedPacks: 0,
      droppedLogs: 0,
      normalizedPacks: 0,
      normalizedLogs: 0,
    };
  }

  await db.transaction(
    'rw',
    db.migrationBackups,
    db.generatorPacks,
    db.generatorRollLogs,
    async () => {
      await db.migrationBackups.add({
        id: generateId(),
        campaignId,
        kind: 'generator_repair',
        createdAt: timestamp,
        payload: {
          generatorPacks: rawPacks,
          generatorRollLogs: rawLogs,
          reason: 'Automatic generator integrity repair before startup.',
        },
      });
      await db.generatorPacks.where('campaignId').equals(campaignId).delete();
      await db.generatorRollLogs.where('campaignId').equals(campaignId).delete();
      if (normalizedPacks.length > 0) {
        await db.generatorPacks.bulkAdd(normalizedPacks);
      }
      if (normalizedLogs.length > 0) {
        await db.generatorRollLogs.bulkAdd(normalizedLogs);
      }
    },
  );

  return {
    repaired: true,
    droppedPacks: Math.max(0, rawPacks.length - normalizedPacks.length),
    droppedLogs: Math.max(0, rawLogs.length - normalizedLogs.length),
    normalizedPacks: normalizedPacks.length,
    normalizedLogs: normalizedLogs.length,
  };
}

export async function listGeneratorMigrationBackups(db: MgHelperDb, campaignId: string) {
  const rows = await db.migrationBackups
    .where('campaignId')
    .equals(campaignId)
    .and((item) => item.kind === 'generator_repair')
    .toArray();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function parseRepairPayload(payload: unknown): GeneratorRepairBackupPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Partial<GeneratorRepairBackupPayload>;
  if (!Array.isArray(candidate.generatorPacks) || !Array.isArray(candidate.generatorRollLogs)) {
    return null;
  }
  return {
    generatorPacks: candidate.generatorPacks,
    generatorRollLogs: candidate.generatorRollLogs,
    reason: typeof candidate.reason === 'string' ? candidate.reason : undefined,
  };
}

export async function restoreGeneratorFromMigrationBackup(
  db: MgHelperDb,
  campaignId: string,
  backupId: string,
): Promise<{ ok: true; restoredPacks: number; restoredLogs: number } | { ok: false; error: string }> {
  const backup = await db.migrationBackups.get(backupId);
  if (!backup || backup.campaignId !== campaignId || backup.kind !== 'generator_repair') {
    return { ok: false, error: 'Nie znaleziono backupu migracyjnego generatora.' };
  }
  const parsed = parseRepairPayload(backup.payload);
  if (!parsed) {
    return { ok: false, error: 'Backup migracyjny ma nieprawidlowy format.' };
  }
  const timestamp = nowISO();
  const packs = parsed.generatorPacks
    .map((raw) => normalizePack(raw, campaignId, timestamp))
    .filter((pack): pack is GeneratorPackRecord => Boolean(pack));
  const validPackIds = new Set(packs.map((pack) => pack.id));
  const logs = parsed.generatorRollLogs
    .map((raw) => normalizeLog(raw, campaignId, validPackIds, timestamp))
    .filter((log): log is GeneratorRollLogRecord => Boolean(log));
  await db.transaction('rw', db.generatorPacks, db.generatorRollLogs, async () => {
    await db.generatorPacks.where('campaignId').equals(campaignId).delete();
    await db.generatorRollLogs.where('campaignId').equals(campaignId).delete();
    if (packs.length > 0) await db.generatorPacks.bulkAdd(packs);
    if (logs.length > 0) await db.generatorRollLogs.bulkAdd(logs);
  });
  return { ok: true, restoredPacks: packs.length, restoredLogs: logs.length };
}
