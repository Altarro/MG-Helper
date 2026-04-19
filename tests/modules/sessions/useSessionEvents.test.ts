import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { addEntity } from '@shared/db/operations';
import { openCampaignDb } from '@shared/db/database';
import { setActiveCampaignId, saveCampaign } from '@shared/db/campaignStore';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { useSessionEvents } from '@modules/sessions/hooks/useSessionEvents';
import { isSessionEvent } from '@modules/sessions/types';

const TEST_ID = '__session-events-test__';
const db = openCampaignDb(TEST_ID);
setActiveCampaignId(TEST_ID);
saveCampaign({ id: TEST_ID, name: 'Session Events Test', description: '', createdAt: new Date().toISOString() });

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CampaignProvider, null, children);
}

describe('useSessionEvents', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('returns empty list when session has no events', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 1',
      description: '',
      tags: [],
      data: { number: 1, date: '2024-01-01', summary: '' },
    });

    const { result } = renderHook(() => useSessionEvents(session.id), { wrapper });
    await waitFor(() => expect(result.current.events).toBeDefined());
    expect(result.current.events).toHaveLength(0);
  });

  it('addEvent creates an entity of type event with appears_in relation', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 2',
      description: '',
      tags: [],
      data: { number: 2, date: '2024-01-02', summary: '' },
    });

    const { result } = renderHook(() => useSessionEvents(session.id), { wrapper });
    await waitFor(() => expect(result.current.events).toBeDefined());

    await act(async () => {
      await result.current.addEvent('Bohaterowie weszli do wieży');
    });
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    // Check entity in DB
    const events = await db.entities.where('type').equals('event').toArray();
    expect(events).toHaveLength(1);
    expect(isSessionEvent(events[0])).toBe(true);
    expect((events[0].data as { text: string }).text).toBe('Bohaterowie weszli do wieży');

    // Check relation
    const rel = await db.relations
      .where('targetId')
      .equals(session.id)
      .filter((r) => r.type === 'appears_in' && r.sourceId === events[0].id)
      .first();
    expect(rel).toBeDefined();
  });

  it('addEvent returns event entity and appears in reactive list', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 3',
      description: '',
      tags: [],
      data: { number: 3, date: '2024-01-03', summary: '' },
    });

    const { result } = renderHook(() => useSessionEvents(session.id), { wrapper });
    await waitFor(() => expect(result.current.events).toBeDefined());

    await act(async () => {
      await result.current.addEvent('Pierwszy event');
      await result.current.addEvent('Drugi event');
    });

    await waitFor(() => expect(result.current.events).toHaveLength(2));
    expect(result.current.events[0].name).toBe('Pierwszy event');
    expect(result.current.events[1].name).toBe('Drugi event');
  });

  it('removeEvent deletes the entity and its relation', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 4',
      description: '',
      tags: [],
      data: { number: 4, date: '2024-01-04', summary: '' },
    });

    const { result } = renderHook(() => useSessionEvents(session.id), { wrapper });
    await waitFor(() => expect(result.current.events).toBeDefined());

    let eventId = '';
    await act(async () => {
      const created = await result.current.addEvent('Do usunięcia');
      eventId = created!.id;
    });

    await waitFor(() => expect(result.current.events).toHaveLength(1));

    await act(async () => {
      await result.current.removeEvent(eventId);
    });

    await waitFor(() => expect(result.current.events).toHaveLength(0));

    // Entity removed from DB
    const entity = await db.entities.get(eventId);
    expect(entity).toBeUndefined();

    // Relation also removed (cascade)
    const rels = await db.relations.where('sourceId').equals(eventId).toArray();
    expect(rels).toHaveLength(0);
  });
});
