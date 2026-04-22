import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@shared/db/database';
import {
  saveAsset,
  getAsset,
  deleteAsset,
  cleanupOrphanAssets,
  extractImageId,
} from '@shared/db/assets';
import { addEntity, updateEntity } from '@shared/db/operations';
import type { ProcessedImage } from '@shared/utils/imagePipeline';

function fakeProcessed(mainBytes = 4096, thumbBytes = 256): ProcessedImage {
  return {
    main: {
      blob: new Blob([new Uint8Array(mainBytes)], { type: 'image/webp' }),
      width: 512,
      height: 256,
      bytes: mainBytes,
    },
    thumb: {
      blob: new Blob([new Uint8Array(thumbBytes)], { type: 'image/webp' }),
      width: 128,
      height: 64,
      bytes: thumbBytes,
    },
  };
}

beforeEach(async () => {
  await db.assets.clear();
  await db.entities.clear();
  await db.relations.clear();
});

describe('assets CRUD', () => {
  it('saveAsset persists a row and returns an id', async () => {
    const id = await saveAsset(db, fakeProcessed());
    expect(id).toBeTruthy();

    const row = await getAsset(db, id);
    expect(row).toBeDefined();
    expect(row?.mime).toBe('image/webp');
    expect(row?.width).toBe(512);
    expect(row?.thumb.width).toBe(128);
    expect(row?.createdAt).toBeTruthy();
  });

  it('deleteAsset removes a previously saved row', async () => {
    const id = await saveAsset(db, fakeProcessed());
    await deleteAsset(db, id);
    expect(await getAsset(db, id)).toBeUndefined();
  });
});

describe('extractImageId', () => {
  it('returns the id for non-empty string references', () => {
    expect(extractImageId({ data: { imageId: 'abc' } })).toBe('abc');
  });

  it('returns null for missing, empty, null or non-string values', () => {
    expect(extractImageId({ data: {} })).toBeNull();
    expect(extractImageId({ data: { imageId: '' } })).toBeNull();
    expect(extractImageId({ data: { imageId: null } })).toBeNull();
    expect(extractImageId({ data: { imageId: 42 as unknown as string } })).toBeNull();
  });
});

describe('cleanupOrphanAssets', () => {
  it('is a no-op when every asset is referenced', async () => {
    const id = await saveAsset(db, fakeProcessed());
    await addEntity(db, {
      type: 'npc',
      name: 'Referrer',
      description: '',
      tags: [],
      data: { imageId: id },
    });

    const summary = await cleanupOrphanAssets(db);
    expect(summary.removed).toBe(0);
    expect(summary.reclaimedBytes).toBe(0);
    expect(await getAsset(db, id)).toBeDefined();
  });

  it('removes unreferenced assets and reports reclaimed bytes', async () => {
    const keptId = await saveAsset(db, fakeProcessed(2000, 100));
    const orphan1 = await saveAsset(db, fakeProcessed(1500, 50));
    const orphan2 = await saveAsset(db, fakeProcessed(800, 40));

    await addEntity(db, {
      type: 'npc',
      name: 'Keeper',
      description: '',
      tags: [],
      data: { imageId: keptId },
    });

    const summary = await cleanupOrphanAssets(db);
    expect(summary.removed).toBe(2);
    expect(summary.reclaimedBytes).toBe(1500 + 50 + 800 + 40);

    expect(await getAsset(db, keptId)).toBeDefined();
    expect(await getAsset(db, orphan1)).toBeUndefined();
    expect(await getAsset(db, orphan2)).toBeUndefined();
  });

  it('treats entities whose imageId was cleared as orphan producers', async () => {
    const id = await saveAsset(db, fakeProcessed());
    const entity = await addEntity(db, {
      type: 'location',
      name: 'Loc',
      description: '',
      tags: [],
      data: { imageId: id },
    });

    await updateEntity(db, entity.id, { data: { ...entity.data, imageId: null } });

    const summary = await cleanupOrphanAssets(db);
    expect(summary.removed).toBe(1);
    expect(await getAsset(db, id)).toBeUndefined();
  });
});
