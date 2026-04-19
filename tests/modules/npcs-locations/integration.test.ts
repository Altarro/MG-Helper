import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addRelation, deleteEntity } from '@shared/db/operations';
import { db } from '@shared/db/database';
import { isNpc } from '@modules/npcs/types';
import { isLocation } from '@modules/locations/types';

describe('NPC integration', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('creates an NPC and reads it back as Npc type', async () => {
    const entity = await addEntity(db, {
      type: 'npc',
      name: 'Gareth',
      description: '',
      tags: ['guard'],
      data: { instinct: 'Protect the gate', motivation: 'Loyalty', appearance: 'Tall' },
    });
    const stored = await db.entities.get(entity.id);
    expect(stored).toBeDefined();
    expect(isNpc(stored!)).toBe(true);
    expect(stored!.name).toBe('Gareth');
    expect((stored!.data as { instinct: string }).instinct).toBe('Protect the gate');
  });

  it('deletes NPC and cascades relations', async () => {
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Bandit',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    const loc = await addEntity(db, {
      type: 'location',
      name: 'Forest',
      description: '',
      tags: [],
      data: { locationType: 'wilderness', danger: 2, senses: { see: '', hear: '', smell: '', feel: '' } },
    });
    await addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' });

    await deleteEntity(db, npc.id);
    const relations = await db.relations.where('targetId').equals(npc.id).toArray();
    expect(relations).toHaveLength(0);
  });
});

describe('Location hierarchy (contains)', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  async function makeLocation(name: string) {
    return addEntity(db, {
      type: 'location',
      name,
      description: '',
      tags: [],
      data: { locationType: 'region', danger: 0, senses: { see: '', hear: '', smell: '', feel: '' } },
    });
  }

  it('creates parent-child location via contains relation', async () => {
    const parent = await makeLocation('Silverwood');
    const child = await makeLocation('Abandoned Camp');
    await addRelation(db, { sourceId: parent.id, targetId: child.id, type: 'contains' });

    const rel = await db.relations
      .where('sourceId')
      .equals(parent.id)
      .filter((r) => r.type === 'contains')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(child.id);
  });

  it('NPC assigned to location via contains is found in contained query', async () => {
    const loc = await makeLocation('Tavern');
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Innkeeper',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    await addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' });

    const rels = await db.relations
      .where('sourceId')
      .equals(loc.id)
      .filter((r) => r.type === 'contains')
      .toArray();
    const ids = rels.map((r) => r.targetId);
    const npcFound = ids.includes(npc.id);
    expect(npcFound).toBe(true);
  });

  it('isLocation type guard works correctly', async () => {
    const loc = await makeLocation('TestLoc');
    const stored = await db.entities.get(loc.id);
    expect(isLocation(stored!)).toBe(true);
  });

  it('deleting parent location cascades relations', async () => {
    const parent = await makeLocation('Dungeon');
    const child = await makeLocation('Room 1');
    await addRelation(db, { sourceId: parent.id, targetId: child.id, type: 'contains' });

    await deleteEntity(db, parent.id);
    const rels = await db.relations.where('sourceId').equals(parent.id).toArray();
    expect(rels).toHaveLength(0);
  });
});
