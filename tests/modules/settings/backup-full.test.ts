import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@shared/db/database';
import { addEntity, addRelation } from '@shared/db/operations';
import { saveAsset, getAsset } from '@shared/db/assets';
import { createFullBackupArchive } from '@shared/utils/exportFull';
import { importFull } from '@shared/utils/importFull';
import { importJson } from '@shared/utils/importJson';
import { BACKUP_FORMAT_VERSION } from '@shared/utils/backupContract';
import type { ProcessedImage } from '@shared/utils/imagePipeline';
import { saveGeneratorPack, appendGeneratorRollLog } from '@modules/generator/repository';

vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

function fakeProcessed(main = 1024, thumb = 128): ProcessedImage {
  const mainBytes = new Uint8Array(main);
  const thumbBytes = new Uint8Array(thumb);
  mainBytes[0] = 0x52; // placeholder
  thumbBytes[0] = 0x52;
  return {
    main: {
      blob: new Blob([mainBytes], { type: 'image/webp' }),
      width: 512,
      height: 256,
      bytes: main,
    },
    thumb: {
      blob: new Blob([thumbBytes], { type: 'image/webp' }),
      width: 128,
      height: 64,
      bytes: thumb,
    },
  };
}

beforeEach(async () => {
  await db.entities.clear();
  await db.relations.clear();
  await db.assets.clear();
  await db.generatorPacks.clear();
  await db.generatorRollLogs.clear();
});

describe('full backup round-trip (ZIP)', () => {
  it('exports and re-imports entities, relations, and image blobs', async () => {
    const assetId = await saveAsset(db, fakeProcessed(2000, 200));
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Gandalf',
      description: '<p>Mag</p>',
      tags: ['wizard'],
      data: { instinct: 'curious', motivation: 'help', imageId: assetId, imageAlt: 'Portret maga' },
    });
    const loc = await addEntity(db, {
      type: 'location',
      name: 'Rivendell',
      description: '',
      tags: [],
      data: { locationType: 'city', danger: 0, senses: {} },
    });
    await addRelation(db, { type: 'related_to', sourceId: npc.id, targetId: loc.id });

    const archive = await createFullBackupArchive(db, { campaignMeta: null });
    expect(archive.entityCount).toBe(2);
    expect(archive.relationCount).toBe(1);
    expect(archive.assetCount).toBe(1);
    expect(archive.blob.size).toBeGreaterThan(0);

    // Clear and re-import.
    await db.entities.clear();
    await db.relations.clear();
    await db.assets.clear();

    const result = await importFull(db, archive.bytes);
    expect(result.ok).toBe(true);
    expect(result.entityCount).toBe(2);
    expect(result.relationCount).toBe(1);
    expect(result.assetCount).toBe(1);

    const restoredNpc = await db.entities.get(npc.id);
    expect(restoredNpc?.data.imageId).toBe(assetId);
    expect(await getAsset(db, assetId)).toBeDefined();
  });

  it('exports and re-imports generator packs and roll logs', async () => {
    await saveGeneratorPack(db, {
      id: 'pack-full-1',
      campaignId: 'camp-full',
      name: 'Full Pack',
      description: '',
      isActive: true,
      tables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await appendGeneratorRollLog(db, {
      campaignId: 'camp-full',
      sessionId: null,
      packId: 'pack-full-1',
      kind: 'eventTable',
      resultText: 'Full test',
      sourceTableIds: [],
    });

    const archive = await createFullBackupArchive(db, { campaignMeta: null });

    await db.entities.clear();
    await db.relations.clear();
    await db.assets.clear();
    await db.generatorPacks.clear();
    await db.generatorRollLogs.clear();

    const result = await importFull(db, archive.bytes);
    expect(result.ok).toBe(true);
    expect((await db.generatorPacks.toArray()).length).toBe(1);
    expect((await db.generatorRollLogs.toArray()).length).toBe(1);
  });

  it('warns and zeroes imageId when the archive is missing the asset files', async () => {
    const assetId = await saveAsset(db, fakeProcessed());
    await addEntity(db, {
      type: 'npc',
      name: 'Dangling reference',
      description: '',
      tags: [],
      data: { imageId: assetId, imageAlt: 'nope' },
    });

    const archive = await createFullBackupArchive(db);

    // Tamper: create a fake archive with no assets/ entries by re-exporting
    // after we surgically remove the underlying asset from the DB before zip.
    // Simpler: just clear assets, re-run export — that way the JSON still
    // references assetId but the ZIP contains no assets/ folder.
    await db.assets.clear();
    // The entity is still the only consumer → archive must reflect that
    // the image is missing. We re-generate so `referenced` → assetId but
    // db.assets is empty ⇒ no files under assets/ in zip.
    const strippedArchive = await createFullBackupArchive(db);
    expect(strippedArchive.assetCount).toBe(0);

    await db.entities.clear();
    await db.relations.clear();
    await db.assets.clear();

    const result = await importFull(db, strippedArchive.bytes);
    expect(result.ok).toBe(true);
    expect(result.orphanedImageRefs.length).toBe(1);
    expect(result.warnings.length).toBeGreaterThan(0);

    const restored = await db.entities.toArray();
    expect(restored).toHaveLength(1);
    expect(restored[0]?.data.imageId).toBeNull();

    // Keep the archive reference to silence lint about unused variable.
    expect(archive.bytes.length).toBeGreaterThan(strippedArchive.bytes.length);
  });
});

describe('JSON backup version compatibility', () => {
  it('accepts a v2 payload (images absent) and imports cleanly', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      formatVersion: 2,
      appVersion: '0.1.0-alpha',
      exportedAt: now,
      campaignMeta: null,
      entities: [
        {
          id: 'npc-v2',
          type: 'npc',
          name: 'V2 character',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          data: { instinct: 'wait', motivation: 'observe' },
        },
      ],
      relations: [],
    });

    expect(result.ok).toBe(true);
    expect(result.entityCount).toBe(1);
    const restored = await db.entities.get('npc-v2');
    expect(restored?.data).not.toHaveProperty('imageId');
  });

  it('import JSON v3 clears imageId (JSON backup never includes blobs)', async () => {
    const assetId = await saveAsset(db, fakeProcessed());
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'V3 character',
      description: '',
      tags: [],
      data: { imageId: assetId, imageAlt: 'alt' },
    });

    const payload = {
      formatVersion: BACKUP_FORMAT_VERSION,
      appVersion: '0.1.0-alpha',
      exportedAt: new Date().toISOString(),
      campaignMeta: null,
      entities: [await db.entities.get(npc.id)],
      relations: [],
    };

    await db.entities.clear();
    await db.assets.clear();

    const result = await importJson(db, payload);
    expect(result.ok).toBe(true);
    const restored = await db.entities.get(npc.id);
    expect(restored?.data.imageId).toBeNull();
    expect(restored?.data.imageAlt).toBe('');
  });
});
