import { beforeEach, describe, expect, it } from 'vitest';
import { openCampaignDb } from '@shared/db/database';
import { addEntity, addRelation, assignContainment } from '@shared/db/operations';
import {
  getContainedNpcIds,
  getSessionNpcPanelData,
  getSessionThreadBoardData,
  getSessionThreatCount,
  getSessionThreads,
} from '@modules/sessions/utils/liveSessionData';

const db = openCampaignDb('__session-live-data__');

describe('liveSessionData', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('returns sorted session threads and zero threat count for valid session data', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja danych',
      description: '',
      tags: [],
      data: { number: 4, date: '2025-02-10', summary: '' },
    });
    const threadB = await addEntity(db, {
      type: 'thread',
      name: 'Zamieć',
      description: '',
      tags: [],
      data: { color: '#111111', status: 'active' },
    });
    const threadA = await addEntity(db, {
      type: 'thread',
      name: 'Afera',
      description: '',
      tags: [],
      data: { color: '#222222', status: 'completed' },
    });
    await Promise.all([
      addRelation(db, { type: 'appears_in', sourceId: threadB.id, targetId: session.id }),
      addRelation(db, { type: 'appears_in', sourceId: threadA.id, targetId: session.id }),
    ]);

    const threads = await getSessionThreads(db, session.id);
    const threatCount = await getSessionThreatCount(db, session.id);

    expect(threads.map((thread) => thread.name)).toEqual(['Afera', 'Zamieć']);
    expect(threatCount).toBe(0);
  });

  it('builds NPC panel data from session and containment relations', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja NPC',
      description: '',
      tags: [],
      data: { number: 5, date: '2025-02-11', summary: '' },
    });
    const location = await addEntity(db, {
      type: 'location',
      name: 'Rynek',
      description: '',
      tags: [],
      data: { locationType: 'district', danger: 1, senses: { see: '', hear: '', smell: '', feel: '' } },
    });
    const npcOne = await addEntity(db, {
      type: 'npc',
      name: 'Ada',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    const npcTwo = await addEntity(db, {
      type: 'npc',
      name: 'Borys',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });

    await Promise.all([
      addRelation(db, { type: 'appears_in', sourceId: npcOne.id, targetId: session.id }),
      addRelation(db, { type: 'appears_in', sourceId: npcTwo.id, targetId: session.id }),
      assignContainment(db, { sourceId: location.id, targetId: npcOne.id }),
    ]);

    const containedNpcIds = await getContainedNpcIds(db, location.id);
    const panelData = await getSessionNpcPanelData(db, session.id, location.id);

    expect(containedNpcIds).toEqual([npcOne.id]);
    expect(panelData.npcs.map((npc) => npc.name)).toEqual(['Ada', 'Borys']);
    expect(panelData.locationRelIds.has(npcOne.id)).toBe(true);
    expect(panelData.locationRelIds.has(npcTwo.id)).toBe(false);
  });

  it('groups only session threads by related threats and keeps free threads separate', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja watkow',
      description: '',
      tags: [],
      data: { number: 6, date: '2025-02-12', summary: '' },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Kult z portu',
      description: '',
      tags: [],
      data: { threatType: 'religious_institution', impulse: '', moves: [], trigger: '' },
    });
    const groupedThread = await addEntity(db, {
      type: 'thread',
      name: 'Dzwony pod woda',
      description: '',
      tags: [],
      data: { color: '#111111', status: 'active', kind: 'main' },
    });
    const reverseGroupedThread = await addEntity(db, {
      type: 'thread',
      name: 'Nocne transporty',
      description: '',
      tags: [],
      data: { color: '#222222', status: 'active', kind: 'side' },
    });
    const freeThread = await addEntity(db, {
      type: 'thread',
      name: 'Plotka z karczmy',
      description: '',
      tags: [],
      data: { color: '#333333', status: 'completed', kind: 'side' },
    });
    const threadOutsideSession = await addEntity(db, {
      type: 'thread',
      name: 'Poza sesja',
      description: '',
      tags: [],
      data: { color: '#444444', status: 'active', kind: 'personal' },
    });

    await Promise.all([
      addRelation(db, { type: 'appears_in', sourceId: groupedThread.id, targetId: session.id }),
      addRelation(db, { type: 'appears_in', sourceId: reverseGroupedThread.id, targetId: session.id }),
      addRelation(db, { type: 'appears_in', sourceId: freeThread.id, targetId: session.id }),
      addRelation(db, { type: 'affects', sourceId: groupedThread.id, targetId: threat.id }),
      addRelation(db, { type: 'affects', sourceId: threat.id, targetId: reverseGroupedThread.id }),
      addRelation(db, { type: 'affects', sourceId: threadOutsideSession.id, targetId: threat.id }),
    ]);

    const board = await getSessionThreadBoardData(db, session.id);

    expect(board.threatGroups).toHaveLength(1);
    expect(board.threatGroups[0]?.threat.name).toBe('Kult z portu');
    expect(board.threatGroups[0]?.threads.map((thread) => thread.name)).toEqual([
      'Dzwony pod woda',
      'Nocne transporty',
    ]);
    expect(board.freeThreads.map((thread) => thread.name)).toEqual(['Plotka z karczmy']);
  });
});
