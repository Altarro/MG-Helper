import type { MgHelperDb } from './database';
import type { Asset, Entity } from '@shared/types';
import { generateId } from '@shared/utils/id';
import { nowISO } from '@shared/utils/date';
import type { ProcessedImage } from '@shared/utils/imagePipeline';

/**
 * Persists a processed image pair (main + thumbnail) as a new row in the
 * `assets` table and returns the generated id to store on the owning entity.
 *
 * `main` i `thumb` mogą pochodzić z różnych kadrowanych źródeł (np. osobne 1:1
 * dla pełnego obrazu i dla listy) — ważne, żeby współdzieliły ten sam `id` wiersza.
 */
export async function saveAsset(db: MgHelperDb, processed: ProcessedImage): Promise<string> {
  const id = generateId();
  const asset: Asset = {
    id,
    mime: 'image/webp',
    width: processed.main.width,
    height: processed.main.height,
    bytes: processed.main.bytes,
    blob: processed.main.blob,
    thumb: {
      blob: processed.thumb.blob,
      width: processed.thumb.width,
      height: processed.thumb.height,
      bytes: processed.thumb.bytes,
    },
    createdAt: nowISO(),
  };
  await db.assets.add(asset);
  return id;
}

export async function getAsset(db: MgHelperDb, id: string): Promise<Asset | undefined> {
  return db.assets.get(id);
}

export async function deleteAsset(db: MgHelperDb, id: string): Promise<void> {
  await db.assets.delete(id);
}

/**
 * Deletes several assets at once. Silently skips ids that don't exist so callers
 * can run this defensively during cascade cleanup.
 */
export async function bulkDeleteAssets(db: MgHelperDb, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.assets.bulkDelete(ids);
}

export interface OrphanCleanupSummary {
  removed: number;
  reclaimedBytes: number;
}

/**
 * Scans the `assets` store for rows that are no longer referenced by any
 * `entity.data.imageId` and deletes them. Returns the number of rows removed
 * and an estimated number of reclaimed bytes (main + thumb).
 *
 * Cheap because:
 *   1. We load only ids/sizes for assets (one pass).
 *   2. We load only `id, data.imageId` surface from entities.
 */
export async function cleanupOrphanAssets(db: MgHelperDb): Promise<OrphanCleanupSummary> {
  const [assets, entities] = await Promise.all([
    db.assets.toArray(),
    db.entities.toArray(),
  ]);

  const referenced = new Set<string>();
  for (const entity of entities) {
    const ref = extractImageId(entity);
    if (ref) referenced.add(ref);
  }

  const orphans = assets.filter((asset) => !referenced.has(asset.id));
  if (orphans.length === 0) return { removed: 0, reclaimedBytes: 0 };

  const reclaimedBytes = orphans.reduce(
    (sum, asset) => sum + (asset.bytes ?? 0) + (asset.thumb?.bytes ?? 0),
    0,
  );

  await db.assets.bulkDelete(orphans.map((asset) => asset.id));
  return { removed: orphans.length, reclaimedBytes };
}

/**
 * Safely reads the optional `data.imageId` slot on an entity. The field is
 * nullable in the schema; treat only non-empty strings as real references.
 */
export function extractImageId(entity: Pick<Entity, 'data'>): string | null {
  const raw = (entity.data as Record<string, unknown> | undefined)?.imageId;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}
