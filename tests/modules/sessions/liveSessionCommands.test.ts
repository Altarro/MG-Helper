import { beforeEach, describe, expect, it } from 'vitest';
import { openCampaignDb } from '@shared/db/database';
import { addEntity, assignContainment } from '@shared/db/operations';
import { getNpcLocationHistory } from '@modules/npcs/locationHistory';
import {
  createNamedSceneFromDraft,
  ensureEntityAppearsInSession,
  ensureEntitiesAppearInSession,
  moveNpcToLocation,
  removeEntityFromSession,
  setNpcCurrentLocation,
} from '@modules/sessions/utils/liveSessionCommands';
import { ensureSessionDraftLocation } from '@modules/sessions/utils/draftScene';

const db = openCampaignDb('__session-live-commands__');

describe('liveSessionCommands', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('adds appears_in only once for the same entity and session', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja komend',
      description: '',
      tags: [],
      data: { number: 7, date: '2025-02-12', summary: '' },
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Marta',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });

    await ensureEntityAppearsInSession(db, npc.id, session.id);
    await ensureEntityAppearsInSession(db, npc.id, session.id);

    const relations = await db.relations
      .where('sourceId')
      .equals(npc.id)
      .filter((relation) => relation.type === 'appears_in' && relation.targetId === session.id)
      .toArray();

    expect(relations).toHaveLength(1);
  });

  it('adds only missing entities in batch mode and reports correct count', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja batch',
      description: '',
      tags: [],
      data: { number: 10, date: '2025-02-15', summary: '' },
    });
    const npcA = await addEntity(db, {
      type: 'npc',
      name: 'Ala',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    const npcB = await addEntity(db, {
      type: 'npc',
      name: 'Borys',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });

    await ensureEntityAppearsInSession(db, npcA.id, session.id);

    const addedCount = await ensureEntitiesAppearInSession(db, [npcA.id, npcB.id], session.id);

    const relations = await db.relations
      .where('targetId')
      .equals(session.id)
      .filter((relation) => relation.type === 'appears_in')
      .toArray();

    expect(addedCount).toBe(1);
    expect(relations).toHaveLength(2);
  });

  it('removes appears_in relation for entity detached from session', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja detach',
      description: '',
      tags: [],
      data: { number: 11, date: '2025-02-16', summary: '' },
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Rena',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });

    await ensureEntityAppearsInSession(db, npc.id, session.id);

    const removed = await removeEntityFromSession(db, npc.id, session.id);

    const relation = await db.relations
      .where('sourceId')
      .equals(npc.id)
      .filter((item) => item.type === 'appears_in' && item.targetId === session.id)
      .first();

    expect(removed).toBe(true);
    expect(relation).toBeUndefined();
  });

  it('returns false when trying to detach entity without appears_in relation', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja bez relacji',
      description: '',
      tags: [],
      data: { number: 12, date: '2025-02-17', summary: '' },
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Nina',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });

    const removed = await removeEntityFromSession(db, npc.id, session.id);

    expect(removed).toBe(false);
  });

  it('moves NPC between locations and clears current location on demand', async () => {
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Witek',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    const inn = await addEntity(db, {
      type: 'location',
      name: 'Karczma',
      description: '',
      tags: [],
      data: { locationType: 'building', danger: 1, senses: { see: '', hear: '', smell: '', feel: '' } },
    });
    const tower = await addEntity(db, {
      type: 'location',
      name: 'Wieża',
      description: '',
      tags: [],
      data: { locationType: 'building', danger: 2, senses: { see: '', hear: '', smell: '', feel: '' } },
    });

    await assignContainment(db, { sourceId: inn.id, targetId: npc.id });
    await moveNpcToLocation(db, { npcId: npc.id, toLocationId: tower.id, fromLocationId: inn.id });

    let relations = await db.relations
      .where('targetId')
      .equals(npc.id)
      .filter((relation) => relation.type === 'contains')
      .toArray();

    expect(relations).toHaveLength(1);
    expect(relations[0]?.sourceId).toBe(tower.id);

    await setNpcCurrentLocation(db, npc.id, null);

    relations = await db.relations
      .where('targetId')
      .equals(npc.id)
      .filter((relation) => relation.type === 'contains')
      .toArray();

    expect(relations).toHaveLength(0);
  });

  it('stores location history without duplicating consecutive entries', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja historia',
      description: '',
      tags: [],
      data: { number: 9, date: '2025-02-14', summary: '' },
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Rena',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    const inn = await addEntity(db, {
      type: 'location',
      name: 'Karczma pod Wilkiem',
      description: '',
      tags: [],
      data: { locationType: 'building', danger: 1, senses: { see: '', hear: '', smell: '', feel: '' } },
    });
    const tower = await addEntity(db, {
      type: 'location',
      name: 'Stara Wieza',
      description: '',
      tags: [],
      data: { locationType: 'building', danger: 2, senses: { see: '', hear: '', smell: '', feel: '' } },
    });

    await setNpcCurrentLocation(db, npc.id, inn.id, session.id);
    await setNpcCurrentLocation(db, npc.id, inn.id, session.id);
    await setNpcCurrentLocation(db, npc.id, tower.id, session.id);

    const history = await getNpcLocationHistory(db, npc.id);

    expect(history).toHaveLength(2);
    expect(history[0]?.data.locationName).toBe('Stara Wieza');
    expect(history[0]?.data.sessionId).toBe(session.id);
    expect(history[1]?.data.locationName).toBe('Karczma pod Wilkiem');
  });

  it('creates a named scene from draft and reattaches draft NPCs', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja scena',
      description: '',
      tags: [],
      data: { number: 8, date: '2025-02-13', summary: '' },
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Helena',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    const draft = await ensureSessionDraftLocation(db, session.id);
    await assignContainment(db, { sourceId: draft.id, targetId: npc.id });

    const scene = await createNamedSceneFromDraft(db, session.id, 'Nowa scena');

    const containsRelations = await db.relations
      .where('targetId')
      .equals(npc.id)
      .filter((relation) => relation.type === 'contains')
      .toArray();
    const appearsInRelations = await db.relations
      .where('sourceId')
      .equals(scene.id)
      .filter((relation) => relation.type === 'appears_in' && relation.targetId === session.id)
      .toArray();

    expect(scene.name).toBe('Nowa scena');
    expect(containsRelations).toHaveLength(1);
    expect(containsRelations[0]?.sourceId).toBe(scene.id);
    expect(appearsInRelations).toHaveLength(1);
  });
});
