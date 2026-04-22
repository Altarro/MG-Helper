import { zipSync } from 'fflate';
import type { MgHelperDb } from '@shared/db/database';
import type { CampaignMeta } from '@shared/types';
import { createExportPayload } from './exportJson';
import { extractImageId } from '@shared/db/assets';
import { markBackupDone } from '@shared/hooks/useBackupReminder';

export interface ExportFullOptions {
  campaignMeta?: CampaignMeta | null;
  /**
   * When provided, updates the "last backup at" timestamp for this campaign
   * so the reminder toast is dismissed for the next 24h.
   */
  campaignId?: string | null;
}

export interface ExportFullResult {
  blob: Blob;
  /** Raw archive bytes. Exposed primarily for tests / round-trip utilities. */
  bytes: Uint8Array;
  fileName: string;
  entityCount: number;
  relationCount: number;
  assetCount: number;
  approximateBytes: number;
}

/**
 * fflate's `zipSync` uses `value instanceof Uint8Array` (see `fltn`). In Vitest
 * + jsdom, `TextEncoder.encode` can return a typed array that fails that check,
 * so the library mis-treats file bodies as nested directories. Copying into a
 * fresh `Uint8Array` keeps archives compatible everywhere.
 */
function toZipFileBytes(source: Uint8Array): Uint8Array {
  const out = new Uint8Array(source.byteLength);
  out.set(source);
  return out;
}

function utf8JsonToZipBytes(json: string): Uint8Array {
  return toZipFileBytes(new TextEncoder().encode(json));
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  let raw: Uint8Array | undefined;
  if (typeof blob.arrayBuffer === 'function') {
    try {
      raw = new Uint8Array(await blob.arrayBuffer());
    } catch {
      // fall through
    }
  }
  if (!raw) {
    try {
      raw = new Uint8Array(await new Response(blob).arrayBuffer());
    } catch {
      // fall through
    }
  }
  if (!raw) {
    raw = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
      reader.onload = () => {
        const result = reader.result;
        if (result instanceof ArrayBuffer) {
          resolve(new Uint8Array(result));
        } else {
          reject(new Error('FileReader returned unexpected result'));
        }
      };
      reader.readAsArrayBuffer(blob);
    });
  }
  return toZipFileBytes(raw);
}

/**
 * Builds a full archive containing the v3 JSON backup + all image assets
 * (main + thumbnail) referenced by entities. Assets not referenced anywhere
 * are skipped (use `cleanupOrphanAssets` beforehand if you want them gone).
 */
export async function createFullBackupArchive(
  db: MgHelperDb,
  options: ExportFullOptions = {},
): Promise<ExportFullResult> {
  const payload = await createExportPayload(db, options);

  const referenced = new Set<string>();
  for (const entity of payload.entities) {
    const id = extractImageId(entity);
    if (id) referenced.add(id);
  }

  const assets = referenced.size > 0
    ? await db.assets.where('id').anyOf([...referenced]).toArray()
    : [];

  const backupJsonBytes = utf8JsonToZipBytes(JSON.stringify(payload, null, 2));
  const files: Record<string, Uint8Array> = {
    'backup.json': backupJsonBytes,
  };

  let approximateBytes = backupJsonBytes.byteLength;
  for (const asset of assets) {
    const [mainBytes, thumbBytes] = await Promise.all([
      blobToUint8Array(asset.blob),
      blobToUint8Array(asset.thumb.blob),
    ]);
    files[`assets/${asset.id}.webp`] = mainBytes;
    files[`assets/${asset.id}.thumb.webp`] = thumbBytes;
    approximateBytes += mainBytes.byteLength + thumbBytes.byteLength;
  }

  const zipped = zipSync(files);
  const blob = new Blob([new Uint8Array(zipped)], { type: 'application/zip' });
  const datePart = new Date().toISOString().slice(0, 10);
  const fileName = `mg-helper-full-${datePart}.zip`;

  return {
    blob,
    bytes: zipped,
    fileName,
    entityCount: payload.entities.length,
    relationCount: payload.relations.length,
    assetCount: assets.length,
    approximateBytes,
  };
}

/**
 * Triggers a browser download of the full ZIP backup. Returns the metadata so
 * callers can display a toast / update `lastBackupAt`.
 */
export async function exportFull(
  db: MgHelperDb,
  options: ExportFullOptions = {},
): Promise<ExportFullResult> {
  const archive = await createFullBackupArchive(db, options);
  const url = URL.createObjectURL(archive.blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = archive.fileName;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
  if (options.campaignId) {
    markBackupDone(options.campaignId);
  }
  return archive;
}
