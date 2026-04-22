import { unzipSync, strFromU8 } from 'fflate';
import DOMPurify from 'dompurify';
import type { MgHelperDb } from '@shared/db/database';
import type { Asset, Entity, Relation } from '@shared/types';
import {
  findContainsParentConflict,
  getRelationIntegrityKey,
} from '@shared/db/relationIntegrity';
import { isRelationAllowed } from '@shared/db/relationRules';
import { extractImageId } from '@shared/db/assets';
import { nowISO } from './date';
import { normalizeBackupPayload } from './importJson';

export interface ImportFullResult {
  ok: boolean;
  entityCount: number;
  relationCount: number;
  assetCount: number;
  /** Entities whose imageId pointed to an asset that couldn't be restored. */
  orphanedImageRefs: string[];
  errors: string[];
  warnings: string[];
}

interface RawAssetPair {
  main?: Uint8Array;
  thumb?: Uint8Array;
}

async function blobDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob);
      try {
        return { width: bitmap.width, height: bitmap.height };
      } finally {
        bitmap.close?.();
      }
    }
  } catch {
    // ignore and fall back to zeros
  }
  return { width: 0, height: 0 };
}

function collectAssetPairs(files: Record<string, Uint8Array>): Map<string, RawAssetPair> {
  const pairs = new Map<string, RawAssetPair>();
  for (const [path, bytes] of Object.entries(files)) {
    if (!path.startsWith('assets/')) continue;
    const rest = path.slice('assets/'.length);
    const thumbMatch = rest.match(/^(.+)\.thumb\.webp$/);
    const mainMatch = rest.match(/^(.+)\.webp$/);
    if (thumbMatch?.[1]) {
      const id = thumbMatch[1];
      const current = pairs.get(id) ?? {};
      current.thumb = bytes;
      pairs.set(id, current);
      continue;
    }
    if (mainMatch?.[1]) {
      const id = mainMatch[1];
      const current = pairs.get(id) ?? {};
      current.main = bytes;
      pairs.set(id, current);
    }
  }
  return pairs;
}

/**
 * Imports a full backup archive (ZIP) replacing all existing data in the
 * target database. The archive must contain a valid `backup.json` (v1/v2/v3)
 * at its root; any `assets/<id>.webp` and `assets/<id>.thumb.webp` files are
 * loaded into the `assets` store. Image references pointing at missing assets
 * are silently zeroed out with a warning.
 */
async function readAllBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    try {
      const ab = await blob.arrayBuffer();
      return new Uint8Array(ab);
    } catch {
      // fall through
    }
  }
  try {
    const ab = await new Response(blob).arrayBuffer();
    return new Uint8Array(ab);
  } catch {
    // fall through
  }
  return await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) resolve(new Uint8Array(result));
      else reject(new Error('FileReader returned unexpected result'));
    };
    reader.readAsArrayBuffer(blob);
  });
}

export async function importFull(
  db: MgHelperDb,
  file: File | Blob | Uint8Array,
): Promise<ImportFullResult> {
  const bytes = file instanceof Uint8Array ? file : await readAllBytes(file);
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      assetCount: 0,
      orphanedImageRefs: [],
      errors: ['Plik nie jest prawidlowym archiwum ZIP.'],
      warnings: [],
    };
  }

  const backupBytes = files['backup.json'];
  if (!backupBytes) {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      assetCount: 0,
      orphanedImageRefs: [],
      errors: ['Archiwum nie zawiera pliku backup.json.'],
      warnings: [],
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(strFromU8(backupBytes));
  } catch {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      assetCount: 0,
      orphanedImageRefs: [],
      errors: ['backup.json nie jest prawidlowym JSON-em.'],
      warnings: [],
    };
  }

  const normalized = normalizeBackupPayload(raw);
  if (!normalized.ok) {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      assetCount: 0,
      orphanedImageRefs: [],
      errors: normalized.errors,
      warnings: [],
    };
  }

  const { entities, relations } = normalized.payload;

  // Standard referential/integrity checks, mirroring importJson.
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity] as const));
  const badRelations = relations.filter((relation) => {
    return !entitiesById.has(relation.sourceId) || !entitiesById.has(relation.targetId);
  });
  if (badRelations.length > 0) {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      assetCount: 0,
      orphanedImageRefs: [],
      errors: badRelations.map(
        (r) => `Relacja ${r.id} wskazuje na nieistniejace encje (${r.sourceId} -> ${r.targetId})`,
      ),
      warnings: [],
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
      assetCount: 0,
      orphanedImageRefs: [],
      errors: notAllowedRelations.map((relation) => {
        const source = entitiesById.get(relation.sourceId);
        const target = entitiesById.get(relation.targetId);
        return `Relacja ${relation.id} ma niedozwolony kontrakt: ${source?.type ?? 'unknown'} -> ${target?.type ?? 'unknown'} (${relation.type})`;
      }),
      warnings: [],
    };
  }

  const seen = new Set<string>();
  const duplicateRelationErrors: string[] = [];
  for (const relation of relations) {
    const integrityKey = getRelationIntegrityKey(relation);
    if (seen.has(integrityKey)) {
      duplicateRelationErrors.push(`Relacja ${relation.id} duplikuje istniejacy kontrakt relacji.`);
      continue;
    }
    seen.add(integrityKey);
  }
  if (duplicateRelationErrors.length > 0) {
    return {
      ok: false,
      entityCount: 0,
      relationCount: 0,
      assetCount: 0,
      orphanedImageRefs: [],
      errors: duplicateRelationErrors,
      warnings: [],
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
      assetCount: 0,
      orphanedImageRefs: [],
      errors: containsParentConflicts,
      warnings: [],
    };
  }

  // Resolve image assets.
  const pairs = collectAssetPairs(files);
  const warnings: string[] = [];
  const orphanedImageRefs: string[] = [];

  const sanitizedEntities = entities.map((entity) => ({
    ...entity,
    description: DOMPurify.sanitize(entity.description ?? ''),
  }));

  for (const entity of sanitizedEntities) {
    const imageId = extractImageId(entity);
    if (!imageId) continue;
    const pair = pairs.get(imageId);
    if (!pair?.main || !pair.thumb) {
      orphanedImageRefs.push(entity.id);
      warnings.push(
        `Brak pary plikow obrazka dla encji "${entity.name}" (${entity.id}); pole imageId zostalo wyczyszczone.`,
      );
      // Drop the imageId so we don't persist dangling references.
      entity.data = { ...(entity.data as Record<string, unknown>), imageId: null };
    }
  }

  const newAssets: Asset[] = [];
  for (const [id, pair] of pairs) {
    if (!pair.main || !pair.thumb) {
      warnings.push(`Niekompletna para plikow dla zasobu ${id}; pomijam.`);
      continue;
    }
    const mainBlob = new Blob([new Uint8Array(pair.main)], { type: 'image/webp' });
    const thumbBlob = new Blob([new Uint8Array(pair.thumb)], { type: 'image/webp' });
    const [mainDims, thumbDims] = await Promise.all([
      blobDimensions(mainBlob),
      blobDimensions(thumbBlob),
    ]);
    newAssets.push({
      id,
      mime: 'image/webp',
      width: mainDims.width,
      height: mainDims.height,
      bytes: mainBlob.size,
      blob: mainBlob,
      thumb: {
        blob: thumbBlob,
        width: thumbDims.width,
        height: thumbDims.height,
        bytes: thumbBlob.size,
      },
      createdAt: nowISO(),
    });
  }

  await db.transaction('rw', db.entities, db.relations, db.assets, async () => {
    await db.entities.clear();
    await db.relations.clear();
    await db.assets.clear();
    await db.entities.bulkAdd(sanitizedEntities as unknown as Entity[]);
    await db.relations.bulkAdd(relations as unknown as Relation[]);
    if (newAssets.length > 0) {
      await db.assets.bulkAdd(newAssets);
    }
  });

  return {
    ok: true,
    entityCount: sanitizedEntities.length,
    relationCount: relations.length,
    assetCount: newAssets.length,
    orphanedImageRefs,
    errors: [],
    warnings,
  };
}
