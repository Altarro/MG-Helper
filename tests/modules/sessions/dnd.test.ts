import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@shared/db/database';
import {
  addEntity,
  addRelation,
  assignContainment,
  getRelationsFor,
  removeContainment,
  updateSortOrders,
} from '@shared/db/operations';
import { reorderEntities } from '@shared/utils/dnd';

// ── F.3.6a — reorderEntities ──────────────────────────────────────────────────

describe('reorderEntities', () => {
  const items = [
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Bravo' },
    { id: 'c', name: 'Charlie' },
  ];

  it('moves item from first to last position', () => {
    const result = reorderEntities(items, 'a', 'c');
    expect(result.map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('moves item from last to first position', () => {
    const result = reorderEntities(items, 'c', 'a');
    expect(result.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('moves item one step forward', () => {
    const result = reorderEntities(items, 'a', 'b');
    expect(result.map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('returns the same array reference when activeId === overId', () => {
    const result = reorderEntities(items, 'b', 'b');
    expect(result).toBe(items);
  });

  it('returns the same array reference when activeId is not found', () => {
    const result = reorderEntities(items, 'x', 'b');
    expect(result).toBe(items);
  });

  it('returns the same array reference when overId is not found', () => {
    const result = reorderEntities(items, 'a', 'z');
    expect(result).toBe(items);
  });

  it('does not mutate the original array', () => {
    const copy = [...items];
    reorderEntities(items, 'a', 'c');
    expect(items).toEqual(copy);
  });

  it('works with a two-element array', () => {
    const two = [{ id: 'x' }, { id: 'y' }];
    const result = reorderEntities(two, 'x', 'y');
    expect(result.map((i) => i.id)).toEqual(['y', 'x']);
  });
});

// ── F.3.6b — updateSortOrders ─────────────────────────────────────────────────

describe('updateSortOrders', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('writes sortOrder index into each entity data field', async () => {
    const s1 = await addEntity(db, { type: 'session', name: 'Sesja 1', description: '', tags: [], data: { number: 1 } });
    const s2 = await addEntity(db, { type: 'session', name: 'Sesja 2', description: '', tags: [], data: { number: 2 } });
    const s3 = await addEntity(db, { type: 'session', name: 'Sesja 3', description: '', tags: [], data: { number: 3 } });

    await updateSortOrders(db, [s3.id, s1.id, s2.id]);

    const [r1, r2, r3] = await Promise.all([
      db.entities.get(s1.id),
      db.entities.get(s2.id),
      db.entities.get(s3.id),
    ]);

    expect((r3!.data as Record<string, unknown>).sortOrder).toBe(0);
    expect((r1!.data as Record<string, unknown>).sortOrder).toBe(1);
    expect((r2!.data as Record<string, unknown>).sortOrder).toBe(2);
  });

  it('preserves other data fields when writing sortOrder', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja X',
      description: '',
      tags: [],
      data: { number: 5, summary: 'ważna sesja' },
    });

    await updateSortOrders(db, [session.id]);

    const updated = await db.entities.get(session.id);
    const data = updated!.data as Record<string, unknown>;
    expect(data.number).toBe(5);
    expect(data.summary).toBe('ważna sesja');
    expect(data.sortOrder).toBe(0);
  });

  it('handles empty ids array without error', async () => {
    await expect(updateSortOrders(db, [])).resolves.toBeUndefined();
  });

  it('ignores ids that do not correspond to existing entities', async () => {
    const session = await addEntity(db, { type: 'session', name: 'Real', description: '', tags: [], data: { number: 1 } });
    // ghost id should be silently skipped, real session gets index
    await expect(updateSortOrders(db, ['ghost-id-xyz', session.id])).resolves.toBeUndefined();
    const updated = await db.entities.get(session.id);
    // sortOrder is the index in the provided ids array where the entity was found
    expect((updated!.data as Record<string, unknown>).sortOrder).toBe(1);
  });
});

// ── F.3.6c — NPC drag between locations ──────────────────────────────────────

describe('NPC drag between locations (contains relation swap)', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  async function moveNpcToLocation(npcId: string, fromLocationId: string, toLocationId: string) {
    await removeContainment(db, npcId, fromLocationId);
    await assignContainment(db, { sourceId: toLocationId, targetId: npcId });
  }

  it('removes contains from old location and adds to new location', async () => {
    const npc = await addEntity(db, { type: 'npc', name: 'Aldric', description: '', tags: [], data: {} });
    const loc1 = await addEntity(db, { type: 'location', name: 'Karczma', description: '', tags: [], data: {} });
    const loc2 = await addEntity(db, { type: 'location', name: 'Wieża', description: '', tags: [], data: {} });

    await addRelation(db, { type: 'contains', sourceId: loc1.id, targetId: npc.id });

    await moveNpcToLocation(npc.id, loc1.id, loc2.id);

    const loc1Relations = await getRelationsFor(db, loc1.id);
    const stillInLoc1 = loc1Relations.some(
      (r) => r.type === 'contains' && r.targetId === npc.id,
    );
    expect(stillInLoc1).toBe(false);

    const loc2Relations = await db.relations
      .where('sourceId')
      .equals(loc2.id)
      .filter((r) => r.type === 'contains' && r.targetId === npc.id)
      .toArray();
    expect(loc2Relations).toHaveLength(1);
  });

  it('does not create duplicate contains if NPC dropped on same location', async () => {
    const npc = await addEntity(db, { type: 'npc', name: 'Maja', description: '', tags: [], data: {} });
    const loc = await addEntity(db, { type: 'location', name: 'Salon', description: '', tags: [], data: {} });

    await addRelation(db, { type: 'contains', sourceId: loc.id, targetId: npc.id });

    // Dropping on same location: fromLocationId === toLocationId, so no-op in UI
    // But if attempted: old relation removed, new one added → still exactly 1
    await moveNpcToLocation(npc.id, loc.id, loc.id);

    const rels = await db.relations
      .where('sourceId')
      .equals(loc.id)
      .filter((r) => r.type === 'contains' && r.targetId === npc.id)
      .toArray();
    expect(rels).toHaveLength(1);
  });
});

// ── F.3.6d — Idempotent NPC drop to session ───────────────────────────────────

describe('NPC drop to session (appears_in idempotency)', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  async function dropNpcToSession(npcId: string, sessionId: string) {
    const existing = await getRelationsFor(db, npcId);
    const alreadyLinked = existing.some(
      (r) => r.type === 'appears_in' && r.sourceId === npcId && r.targetId === sessionId,
    );
    if (!alreadyLinked) {
      await addRelation(db, { type: 'appears_in', sourceId: npcId, targetId: sessionId });
    }
  }

  it('creates appears_in relation when NPC dropped on session', async () => {
    const npc = await addEntity(db, { type: 'npc', name: 'Zax', description: '', tags: [], data: {} });
    const session = await addEntity(db, { type: 'session', name: 'S1', description: '', tags: [], data: { number: 1 } });

    await dropNpcToSession(npc.id, session.id);

    const rels = await db.relations
      .where('sourceId')
      .equals(npc.id)
      .filter((r) => r.type === 'appears_in' && r.targetId === session.id)
      .toArray();
    expect(rels).toHaveLength(1);
  });

  it('does not create a duplicate appears_in on second drop', async () => {
    const npc = await addEntity(db, { type: 'npc', name: 'Zax', description: '', tags: [], data: {} });
    const session = await addEntity(db, { type: 'session', name: 'S1', description: '', tags: [], data: { number: 1 } });

    await dropNpcToSession(npc.id, session.id);
    await dropNpcToSession(npc.id, session.id);
    await dropNpcToSession(npc.id, session.id);

    const rels = await db.relations
      .where('sourceId')
      .equals(npc.id)
      .filter((r) => r.type === 'appears_in' && r.targetId === session.id)
      .toArray();
    expect(rels).toHaveLength(1);
  });

  it('can appear_in multiple different sessions independently', async () => {
    const npc = await addEntity(db, { type: 'npc', name: 'Multi', description: '', tags: [], data: {} });
    const s1 = await addEntity(db, { type: 'session', name: 'S1', description: '', tags: [], data: { number: 1 } });
    const s2 = await addEntity(db, { type: 'session', name: 'S2', description: '', tags: [], data: { number: 2 } });

    await dropNpcToSession(npc.id, s1.id);
    await dropNpcToSession(npc.id, s2.id);

    const rels = await getRelationsFor(db, npc.id);
    const sessionRels = rels.filter((r) => r.type === 'appears_in');
    expect(sessionRels).toHaveLength(2);
  });
});
