import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@shared/db/database';
import { addEntity } from '@shared/db/operations';
import { ensureSessionDraftLocation, getDraftLocationId, getSessionDraftLocation } from '@modules/sessions/utils/draftScene';

describe('draftScene helpers', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('creates a draft location with the expected contract and appears_in relation', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja robocza',
      description: '',
      tags: [],
      data: { number: 1, summary: '' },
    });

    const draft = await ensureSessionDraftLocation(db, session.id);

    expect(draft.id).toBe(getDraftLocationId(session.id));
    expect(draft.type).toBe('location');
    expect(draft.data.locationType).toBe('room');
    expect(draft.data.isDraft).toBe(true);
    expect(draft.data.senses).toEqual({
      see: '',
      hear: '',
      smell: '',
      feel: '',
    });

    const appearsInRelations = await db.relations
      .where('sourceId')
      .equals(draft.id)
      .filter((relation) => relation.type === 'appears_in' && relation.targetId === session.id)
      .toArray();

    expect(appearsInRelations).toHaveLength(1);
  });

  it('reuses the same draft location id without duplicating appears_in relation', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja robocza',
      description: '',
      tags: [],
      data: { number: 1, summary: '' },
    });

    const firstDraft = await ensureSessionDraftLocation(db, session.id);
    const secondDraft = await ensureSessionDraftLocation(db, session.id);

    expect(secondDraft.id).toBe(firstDraft.id);

    const appearsInRelations = await db.relations
      .where('sourceId')
      .equals(firstDraft.id)
      .filter((relation) => relation.type === 'appears_in' && relation.targetId === session.id)
      .toArray();

    expect(appearsInRelations).toHaveLength(1);
  });

  it('returns null when the draft location does not exist yet', async () => {
    await expect(getSessionDraftLocation(db, 'missing-session')).resolves.toBeNull();
  });
});
