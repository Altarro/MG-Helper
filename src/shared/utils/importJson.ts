import DOMPurify from 'dompurify';
import type { MgHelperDb } from '@shared/db/database';
import {
  findContainsParentConflict,
  getRelationIntegrityKey,
} from '@shared/db/relationIntegrity';
import { isRelationAllowed } from '@shared/db/relationRules';
import {
  importedDbSchema,
  versionedBackupSchema,
  type ImportedDb,
} from '@shared/utils/validation';
import { BACKUP_FORMAT_VERSION, type BackupPayload } from './backupContract';
import { extractImageId } from '@shared/db/assets';
import { normalizeImportedEntityLifecycle } from '@shared/types/entityLifecycle';
import type { Entity } from '@shared/types/entity';

export interface ImportResult {
  ok: boolean;
  entityCount: number;
  relationCount: number;
  errors: string[];
}

export interface ImportJsonOptions {
  strategy?: 'replace_all';
}

function parseErrors(errors: { path: (string | number)[]; message: string }[]): string[] {
  return errors.map((error) => `${error.path.join('.')}: ${error.message}`);
}

function migrateLegacyBackup(legacy: ImportedDb): BackupPayload {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: 'legacy-import',
    exportedAt: new Date(0).toISOString(),
    campaignMeta: null,
    entities: legacy.entities,
    relations: legacy.relations,
    generatorPacks: [],
    generatorRollLogs: [],
  };
}

export function normalizeBackupPayload(raw: unknown):
  | { ok: true; payload: BackupPayload }
  | { ok: false; errors: string[] } {
  const formatVersion = typeof raw === 'object' && raw !== null && 'formatVersion' in raw
    ? (raw as { formatVersion?: unknown }).formatVersion
    : undefined;

  if (formatVersion === undefined) {
    const parsedLegacy = importedDbSchema.safeParse(raw);
    if (!parsedLegacy.success) {
      return {
        ok: false,
        errors: parseErrors(parsedLegacy.error.errors),
      };
    }

    return {
      ok: true,
      payload: migrateLegacyBackup(parsedLegacy.data),
    };
  }

  if (typeof formatVersion !== 'number' || !Number.isInteger(formatVersion)) {
    return {
      ok: false,
      errors: ['formatVersion: Backup musi zawierac liczbe calkowita.'],
    };
  }

  if (formatVersion > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      errors: [
        `Nieobslugiwana przyszla wersja backupu: ${formatVersion}. Ta aplikacja obsluguje maksymalnie v${BACKUP_FORMAT_VERSION}.`,
      ],
    };
  }

  if (formatVersion < BACKUP_FORMAT_VERSION) {
    if (formatVersion === 1) {
      const parsedLegacy = importedDbSchema.safeParse(raw);
      if (!parsedLegacy.success) {
        return {
          ok: false,
          errors: parseErrors(parsedLegacy.error.errors),
        };
      }

      return {
        ok: true,
        payload: migrateLegacyBackup(parsedLegacy.data),
      };
    }

    if (formatVersion === 2) {
      // v2 and v3 payloads share the same shape; the only difference is
      // that v3 entities may carry `imageId`/`imageAlt` inside `data`. The
      // v3 schema accepts both since those fields are optional/nullish.
      const upgraded = {
        ...(raw as Record<string, unknown>),
        formatVersion: BACKUP_FORMAT_VERSION,
      };
      const parsedVersionedV2 = versionedBackupSchema.safeParse(upgraded);
      if (!parsedVersionedV2.success) {
        return {
          ok: false,
          errors: parseErrors(parsedVersionedV2.error.errors),
        };
      }
      return {
        ok: true,
        payload: parsedVersionedV2.data,
      };
    }

    return {
      ok: false,
      errors: [`Nieobslugiwana stara wersja backupu: ${formatVersion}.`],
    };
  }

  const parsedVersioned = versionedBackupSchema.safeParse(raw);
  if (!parsedVersioned.success) {
    return {
      ok: false,
      errors: parseErrors(parsedVersioned.error.errors),
    };
  }

  return {
    ok: true,
    payload: parsedVersioned.data,
  };
}

/**
 * Validates and imports a JSON backup, replacing all existing data.
 * Sanitizes HTML in description fields before storing.
 * Must be called after user confirmation.
 */
export async function importJson(
  db: MgHelperDb,
  raw: unknown,
  options: ImportJsonOptions = {},
): Promise<ImportResult> {
  const strategy = options.strategy ?? 'replace_all';
  const normalized = normalizeBackupPayload(raw);
  if (!normalized.ok) {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      errors: normalized.errors,
    };
  }

  if (strategy !== 'replace_all') {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      errors: [`Nieobslugiwana strategia importu: ${strategy}.`],
    };
  }

  const { entities, relations, generatorPacks, generatorRollLogs } = normalized.payload;

  // Validate relation references
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity] as const));
  const badRelations = relations.filter((relation) => {
    const source = entitiesById.get(relation.sourceId);
    const target = entitiesById.get(relation.targetId);
    return !source || !target;
  });
  if (badRelations.length > 0) {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      errors: badRelations.map(
        (r) => `Relacja ${r.id} wskazuje na nieistniejące encje (${r.sourceId} → ${r.targetId})`,
      ),
    };
  }

  const notAllowedRelations = relations.filter((relation) => {
    const source = entitiesById.get(relation.sourceId);
    const target = entitiesById.get(relation.targetId);
    if (!source || !target) return false;
    return !isRelationAllowed(source.type, target.type, relation.type);
  });
  if (notAllowedRelations.length > 0) {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      errors: notAllowedRelations.map((relation) => {
        const source = entitiesById.get(relation.sourceId);
        const target = entitiesById.get(relation.targetId);
        return `Relacja ${relation.id} ma niedozwolony kontrakt: ${source?.type ?? 'unknown'} -> ${target?.type ?? 'unknown'} (${relation.type})`;
      }),
    };
  }

  const seenRelationKeys = new Set<string>();
  const duplicateRelationErrors: string[] = [];
  for (const relation of relations) {
    const integrityKey = getRelationIntegrityKey(relation);
    if (seenRelationKeys.has(integrityKey)) {
      duplicateRelationErrors.push(`Relacja ${relation.id} duplikuje istniejacy kontrakt relacji.`);
      continue;
    }
    seenRelationKeys.add(integrityKey);
  }

  if (duplicateRelationErrors.length > 0) {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      errors: duplicateRelationErrors,
    };
  }

  const containsParentConflicts: string[] = [];
  const validatedRelations: typeof relations = [];
  for (const relation of relations) {
    const conflict = findContainsParentConflict(validatedRelations, relation);
    if (conflict) {
      containsParentConflicts.push(
        `Relacja ${relation.id} narusza polityke contains: ${relation.targetId} ma juz rodzica ${conflict.sourceId}.`,
      );
      continue;
    }
    validatedRelations.push(relation);
  }

  if (containsParentConflicts.length > 0) {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      errors: containsParentConflicts,
    };
  }

  // Sanitize HTML in descriptions (security: prevent XSS from imported data)
  const sanitized = entities.map((e) => ({
    ...e,
    description: DOMPurify.sanitize(e.description ?? ''),
  }));

  // JSON backups never carry blobs — `imageId` would dangle after we clear `assets`.
  const typesWithPortrait = new Set(['npc', 'location', 'item', 'faction']);
  const sanitizedForStore = sanitized.map((e) => {
    if (!typesWithPortrait.has(e.type)) return e;
    if (!extractImageId(e)) return e;
    return {
      ...e,
      data: {
        ...(e.data as Record<string, unknown>),
        imageId: null,
        imageAlt: '',
      },
    };
  });

  const lifecycleNormalized = sanitizedForStore.map((e) =>
    normalizeImportedEntityLifecycle(e as Entity),
  );

  await db.transaction(
    'rw',
    [db.entities, db.relations, db.assets, db.generatorPacks, db.generatorRollLogs],
    async () => {
    await db.entities.clear();
    await db.relations.clear();
    await db.assets.clear();
    await db.generatorPacks.clear();
    await db.generatorRollLogs.clear();
    await db.entities.bulkAdd(lifecycleNormalized as Parameters<typeof db.entities.bulkAdd>[0]);
    await db.relations.bulkAdd(relations as Parameters<typeof db.relations.bulkAdd>[0]);
    if (generatorPacks.length > 0) {
      await db.generatorPacks.bulkAdd(generatorPacks as Parameters<typeof db.generatorPacks.bulkAdd>[0]);
    }
    if (generatorRollLogs.length > 0) {
      await db.generatorRollLogs.bulkAdd(
        generatorRollLogs as Parameters<typeof db.generatorRollLogs.bulkAdd>[0],
      );
    }
  });

  return {
    ok: true,
    entityCount: entities.length,
    relationCount: relations.length,
    errors: [],
  };
}
