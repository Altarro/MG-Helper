import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addRelation, deleteEntity } from '@shared/db/operations';
import { db } from '@shared/db/database';
import { isFaction } from '@modules/factions/types';
import { isItem } from '@modules/items/types';

describe('Factions + Items integration', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('creates a faction and reads it back as Faction type', async () => {
    const entity = await addEntity(db, {
      type: 'faction',
      name: 'Gilda Złodziei',
      description: '',
      tags: ['underground'],
      data: { goals: ['kontrola rynku'], resources: ['sieć szpiegów'] },
    });
    const stored = await db.entities.get(entity.id);
    expect(stored).toBeDefined();
    expect(isFaction(stored!)).toBe(true);
    expect((stored!.data as { goals: string[] }).goals).toEqual(['kontrola rynku']);
    expect((stored!.data as { resources: string[] }).resources).toEqual(['sieć szpiegów']);
  });

  it('creates an item and reads it back as Item type', async () => {
    const entity = await addEntity(db, {
      type: 'item',
      name: 'Miecz Runiczny',
      description: '',
      tags: ['rare'],
      data: { itemType: 'weapon', properties: ['magiczny', 'starożytny'] },
    });
    const stored = await db.entities.get(entity.id);
    expect(stored).toBeDefined();
    expect(isItem(stored!)).toBe(true);
    expect((stored!.data as { itemType: string }).itemType).toBe('weapon');
    expect((stored!.data as { properties: string[] }).properties).toEqual(['magiczny', 'starożytny']);
  });

  it('assigns NPC to faction via belongs_to', async () => {
    const faction = await addEntity(db, {
      type: 'faction',
      name: 'Bractwo Cienia',
      description: '',
      tags: [],
      data: { goals: [], resources: [] },
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Mroczny Łowca',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    await addRelation(db, { type: 'belongs_to', sourceId: npc.id, targetId: faction.id });
    const rel = await db.relations
      .where('sourceId')
      .equals(npc.id)
      .filter((r) => r.type === 'belongs_to')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(faction.id);
  });

  it('assigns item to NPC via owns', async () => {
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Rycerz',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    const item = await addEntity(db, {
      type: 'item',
      name: 'Tarcza Królewska',
      description: '',
      tags: [],
      data: { itemType: 'armor', properties: ['wzmocniona'] },
    });
    await addRelation(db, { type: 'owns', sourceId: npc.id, targetId: item.id });
    const rel = await db.relations
      .where('sourceId')
      .equals(npc.id)
      .filter((r) => r.type === 'owns')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(item.id);
  });

  it('item appears_in session', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 7',
      description: '',
      tags: [],
      data: { number: 7, date: '2024-07-01', summary: '' },
    });
    const item = await addEntity(db, {
      type: 'item',
      name: 'Tajemniczy Klucz',
      description: '',
      tags: [],
      data: { itemType: 'key', properties: [] },
    });
    await addRelation(db, { type: 'appears_in', sourceId: item.id, targetId: session.id });
    const rel = await db.relations
      .where('sourceId')
      .equals(item.id)
      .filter((r) => r.type === 'appears_in')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(session.id);
  });

  it('deleting faction cascades relations', async () => {
    const faction = await addEntity(db, {
      type: 'faction',
      name: 'Zakon Świtu',
      description: '',
      tags: [],
      data: { goals: [], resources: [] },
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Paladyn',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    await addRelation(db, { type: 'belongs_to', sourceId: npc.id, targetId: faction.id });
    await deleteEntity(db, faction.id);
    const remaining = await db.relations.toArray();
    expect(remaining.length).toBe(0);
  });

  it('isFaction returns false for non-faction entity', async () => {
    const entity = await addEntity(db, {
      type: 'npc',
      name: 'Test',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    expect(isFaction(entity)).toBe(false);
  });

  it('isItem returns false for non-item entity', async () => {
    const entity = await addEntity(db, {
      type: 'location',
      name: 'Test',
      description: '',
      tags: [],
      data: {},
    });
    expect(isItem(entity)).toBe(false);
  });
});
