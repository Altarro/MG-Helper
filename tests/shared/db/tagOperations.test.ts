import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@shared/db/database';
import { addEntity } from '@shared/db/operations';
import { deleteTagEverywhere, listTagUsage, renameTag } from '@shared/db/tagOperations';

beforeEach(async () => {
  await db.entities.clear();
  await db.relations.clear();
});

describe('tagOperations', () => {
  it('lists tag usage across entities', async () => {
    await addEntity(db, { type: 'npc', name: 'Ala', description: '', tags: ['port', 'port'], data: {} });
    await addEntity(db, { type: 'location', name: 'Dok', description: '', tags: ['port'], data: {} });

    await expect(listTagUsage(db)).resolves.toContainEqual({ tag: 'port', count: 2 });
  });

  it('renames a tag everywhere and deduplicates target tags', async () => {
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Ala',
      description: '',
      tags: ['port', 'miasto'],
      data: {},
    });
    await addEntity(db, {
      type: 'location',
      name: 'Dok',
      description: '',
      tags: ['port'],
      data: {},
    });

    await expect(renameTag(db, 'port', 'miasto')).resolves.toBe(2);
    await expect(db.entities.get(npc.id)).resolves.toMatchObject({ tags: ['miasto'] });
  });

  it('deletes a tag from every entity', async () => {
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Ala',
      description: '',
      tags: ['port', 'kontakt'],
      data: {},
    });

    await expect(deleteTagEverywhere(db, 'port')).resolves.toBe(1);
    await expect(db.entities.get(npc.id)).resolves.toMatchObject({ tags: ['kontakt'] });
  });
});
