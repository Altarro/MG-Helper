import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addRelation, deleteEntity } from '@shared/db/operations';
import { db } from '@shared/db/database';
import { isSession } from '@modules/sessions/types';

describe('Session integration', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('creates a session and reads it back as Session type', async () => {
    const entity = await addEntity(db, {
      type: 'session',
      name: 'Sesja 1',
      description: '',
      tags: ['epic'],
      data: { number: 1, date: '2024-01-15', summary: 'Bohaterowie dotarli do wieży.' },
    });
    const stored = await db.entities.get(entity.id);
    expect(stored).toBeDefined();
    expect(isSession(stored!)).toBe(true);
    expect((stored!.data as { number: number }).number).toBe(1);
    expect((stored!.data as { date: string }).date).toBe('2024-01-15');
  });

  it('quick-add NPC creates appears_in relation to session', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 2',
      description: '',
      tags: [],
      data: { number: 2, date: '2024-02-01', summary: '' },
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Grabber',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: session.id });

    const rel = await db.relations
      .where('sourceId')
      .equals(npc.id)
      .filter((r) => r.type === 'appears_in')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(session.id);
  });

  it('quick-add location creates appears_in relation to session', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 3',
      description: '',
      tags: [],
      data: { number: 3, date: '2024-03-01', summary: '' },
    });
    const location = await addEntity(db, {
      type: 'location',
      name: 'Burning Village',
      description: '',
      tags: [],
      data: {
        locationType: 'city',
        danger: 4,
        senses: { see: '', hear: '', smell: '', feel: '' },
      },
    });
    await addRelation(db, { type: 'appears_in', sourceId: location.id, targetId: session.id });

    const rels = await db.relations.where('targetId').equals(session.id).toArray();
    expect(rels.some((r) => r.sourceId === location.id && r.type === 'appears_in')).toBe(true);
  });

  it('deletes session and cascades all appears_in relations', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja X',
      description: '',
      tags: [],
      data: { number: 99, date: '2024-12-31', summary: '' },
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Villager',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: session.id });

    await deleteEntity(db, session.id);

    const rels = await db.relations.where('targetId').equals(session.id).toArray();
    expect(rels).toHaveLength(0);
  });

  it('isSession returns false for non-session entity', async () => {
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Guard',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    const stored = await db.entities.get(npc.id);
    expect(isSession(stored!)).toBe(false);
  });
});
