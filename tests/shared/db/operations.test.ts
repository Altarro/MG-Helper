import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@shared/db/database';
import {
  addEntity,
  updateEntity,
  deleteEntity,
  addRelation,
  assignContainment,
  deleteRelation,
  getRelationsFor,
  removeContainment,
  updateRelation,
  ContainsParentConflictError,
  DuplicateRelationError,
  RelationNotAllowedError,
} from '@shared/db/operations';

const npcBase = { type: 'npc' as const, name: 'Aldric', description: '', tags: [], data: {} };
const locationBase = { type: 'location' as const, name: 'Karczma', description: '', tags: [], data: {} };
const clockBase = { type: 'clock' as const, name: 'Zegar zagłady', description: '', tags: [], data: { segments: 6, filled: 0 } };
const frontBase = { type: 'front' as const, name: 'Front mroku', description: '', tags: [], data: {} };
const threatBase = { type: 'threat' as const, name: 'Zamach', description: '', tags: [], data: {} };

beforeEach(async () => {
  await db.entities.clear();
  await db.relations.clear();
});

// ─── Entity CRUD ─────────────────────────────────────────────────────────────

describe('addEntity', () => {
  it('creates entity with generated id and timestamps', async () => {
    const entity = await addEntity(db, npcBase);
    expect(entity.id).toBeTruthy();
    expect(entity.createdAt).toBeTruthy();
    expect(entity.updatedAt).toEqual(entity.createdAt);
    expect(await db.entities.get(entity.id)).toBeDefined();
  });

  it('sanitizes description HTML on create', async () => {
    const entity = await addEntity(db, {
      ...npcBase,
      description: '<script>alert("xss")</script><p>Opis</p>',
    });
    expect(entity.description).not.toContain('<script>');
    expect(entity.description).toContain('<p>Opis</p>');
  });
});

describe('updateEntity', () => {
  it('updates fields and bumps updatedAt', async () => {
    const entity = await addEntity(db, npcBase);
    await new Promise((r) => setTimeout(r, 5)); // ensure time passes
    await updateEntity(db, entity.id, { name: 'Aldric Stary' });
    const updated = await db.entities.get(entity.id);
    expect(updated?.name).toBe('Aldric Stary');
    expect(updated?.updatedAt).not.toEqual(entity.updatedAt);
  });

  it('sanitizes description HTML on update', async () => {
    const entity = await addEntity(db, npcBase);
    await updateEntity(db, entity.id, { description: '<img src="x" onerror="evil()"><p>ok</p>' });
    const updated = await db.entities.get(entity.id);
    expect(updated?.description).not.toContain('onerror');
    expect(updated?.description).toContain('<p>ok</p>');
  });
});

describe('deleteEntity', () => {
  it('removes entity from DB', async () => {
    const entity = await addEntity(db, npcBase);
    await deleteEntity(db, entity.id);
    expect(await db.entities.get(entity.id)).toBeUndefined();
  });

  it('cascades deletion to relations', async () => {
    const npc = await addEntity(db, npcBase);
    const loc = await addEntity(db, locationBase);
    await addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' });

    await deleteEntity(db, npc.id);
    const remaining = await db.relations.toArray();
    expect(remaining).toHaveLength(0);
  });
});

// ─── Relations ────────────────────────────────────────────────────────────────

describe('addRelation', () => {
  it('creates a valid relation', async () => {
    const loc = await addEntity(db, locationBase);
    const npc = await addEntity(db, npcBase);
    const rel = await addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' });
    expect(rel.id).toBeTruthy();
    expect(await db.relations.get(rel.id)).toBeDefined();
  });

  it('throws RelationNotAllowedError for invalid pair', async () => {
    const npc = await addEntity(db, npcBase);
    const clock = await addEntity(db, clockBase);
    await expect(
      addRelation(db, { sourceId: npc.id, targetId: clock.id, type: 'contains' }),
    ).rejects.toThrow(RelationNotAllowedError);
  });

  it('allows threat → clock via "tracks"', async () => {
    const threat = await addEntity(db, threatBase);
    const clock = await addEntity(db, clockBase);
    const rel = await addRelation(db, { sourceId: threat.id, targetId: clock.id, type: 'tracks' });
    expect(rel.type).toBe('tracks');
  });

  it('allows threat → front via "belongs_to"', async () => {
    const threat = await addEntity(db, threatBase);
    const front = await addEntity(db, frontBase);
    const rel = await addRelation(db, { sourceId: threat.id, targetId: front.id, type: 'belongs_to' });
    expect(rel.type).toBe('belongs_to');
  });

  it('throws DuplicateRelationError for the same logical relation', async () => {
    const loc = await addEntity(db, locationBase);
    const npc = await addEntity(db, npcBase);
    await addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' });

    await expect(
      addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' }),
    ).rejects.toThrow(DuplicateRelationError);
  });

  it('throws ContainsParentConflictError when contains target already has another parent', async () => {
    const city = await addEntity(db, { ...locationBase, name: 'Miasto' });
    const tower = await addEntity(db, { ...locationBase, name: 'Wieza' });
    const npc = await addEntity(db, npcBase);

    await addRelation(db, { sourceId: city.id, targetId: npc.id, type: 'contains' });

    await expect(
      addRelation(db, { sourceId: tower.id, targetId: npc.id, type: 'contains' }),
    ).rejects.toThrow(ContainsParentConflictError);
  });
});

describe('containment helpers', () => {
  it('assignContainment moves target to a new parent without duplicating contains', async () => {
    const city = await addEntity(db, { ...locationBase, name: 'Miasto' });
    const tower = await addEntity(db, { ...locationBase, name: 'Wieza' });
    const npc = await addEntity(db, npcBase);

    await assignContainment(db, { sourceId: city.id, targetId: npc.id });
    await assignContainment(db, { sourceId: tower.id, targetId: npc.id });

    const containsRelations = await db.relations
      .where('targetId')
      .equals(npc.id)
      .filter((relation) => relation.type === 'contains')
      .toArray();

    expect(containsRelations).toHaveLength(1);
    expect(containsRelations[0]?.sourceId).toBe(tower.id);
  });

  it('removeContainment removes only matching contains relations', async () => {
    const city = await addEntity(db, { ...locationBase, name: 'Miasto' });
    const npc = await addEntity(db, npcBase);

    await assignContainment(db, { sourceId: city.id, targetId: npc.id });

    await expect(removeContainment(db, npc.id, city.id)).resolves.toBe(1);
    await expect(removeContainment(db, npc.id, city.id)).resolves.toBe(0);

    const containsRelations = await db.relations
      .where('targetId')
      .equals(npc.id)
      .filter((relation) => relation.type === 'contains')
      .toArray();

    expect(containsRelations).toHaveLength(0);
  });
});

describe('deleteRelation', () => {
  it('removes only the specified relation', async () => {
    const loc = await addEntity(db, locationBase);
    const npc = await addEntity(db, npcBase);
    const rel = await addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' });
    await deleteRelation(db, rel.id);
    expect(await db.relations.get(rel.id)).toBeUndefined();
  });
});

describe('updateRelation', () => {
  it('updates relation fields while keeping id and createdAt', async () => {
    const loc = await addEntity(db, locationBase);
    const npc = await addEntity(db, npcBase);
    const rel = await addRelation(db, {
      sourceId: loc.id,
      targetId: npc.id,
      type: 'contains',
      label: 'stare',
    });

    const updated = await updateRelation(db, rel.id, { label: 'nowe' });

    expect(updated.id).toBe(rel.id);
    expect(updated.createdAt).toBe(rel.createdAt);
    expect(updated.label).toBe('nowe');
    await expect(db.relations.get(rel.id)).resolves.toMatchObject({ label: 'nowe' });
  });

  it('validates edited relation against duplicate relations', async () => {
    const loc = await addEntity(db, locationBase);
    const npc = await addEntity(db, npcBase);
    const rel = await addRelation(db, {
      sourceId: loc.id,
      targetId: npc.id,
      type: 'contains',
      label: 'wariant',
    });
    await addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' });

    await expect(updateRelation(db, rel.id, { label: undefined })).rejects.toThrow(DuplicateRelationError);
  });
});

describe('getRelationsFor', () => {
  it('returns relations where entity is source or target', async () => {
    const loc = await addEntity(db, locationBase);
    const npc = await addEntity(db, npcBase);
    await addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' });

    const locRels = await getRelationsFor(db, loc.id);
    const npcRels = await getRelationsFor(db, npc.id);
    expect(locRels).toHaveLength(1);
    expect(npcRels).toHaveLength(1);
  });
});
