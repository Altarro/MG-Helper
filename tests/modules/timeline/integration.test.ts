import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { addEntity, addRelation } from '@shared/db/operations';
import { openCampaignDb } from '@shared/db/database';
import { setActiveCampaignId, saveCampaign } from '@shared/db/campaignStore';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { useTimeline } from '@modules/timeline/hooks/useTimeline';
import React from 'react';

const TEST_ID = '__timeline-test__';
const db = openCampaignDb(TEST_ID);

setActiveCampaignId(TEST_ID);
saveCampaign({ id: TEST_ID, name: 'Timeline Test', description: '', createdAt: new Date().toISOString() });

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CampaignProvider, null, children);
}

describe('useTimeline', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('returns empty arrays when no data', async () => {
    const { result } = renderHook(() => useTimeline(), { wrapper });
    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current!.sessions).toHaveLength(0);
    expect(result.current!.threads).toHaveLength(0);
    expect(result.current!.threadSessionIds.size).toBe(0);
  });

  it('returns sessions sorted by number', async () => {
    await addEntity(db, {
      type: 'session', name: 'Sesja 3', description: '', tags: [],
      data: { number: 3, date: '2026-03-01', summary: '' },
    });
    await addEntity(db, {
      type: 'session', name: 'Sesja 1', description: '', tags: [],
      data: { number: 1, date: '2026-01-01', summary: '' },
    });
    await addEntity(db, {
      type: 'session', name: 'Sesja 2', description: '', tags: [],
      data: { number: 2, date: '2026-02-01', summary: '' },
    });

    const { result } = renderHook(() => useTimeline(), { wrapper });
    await waitFor(() => expect(result.current?.sessions.length).toBe(3));

    const numbers = result.current!.sessions.map((s) => s.data.number);
    expect(numbers).toEqual([1, 2, 3]);
  });

  it('correctly maps threads to sessions via threadSessionIds', async () => {
    const thread = await addEntity(db, {
      type: 'thread', name: 'Alfa', description: '', tags: [],
      data: { color: '#ef4444', status: 'active' },
    });
    const s1 = await addEntity(db, {
      type: 'session', name: 'S1', description: '', tags: [],
      data: { number: 1, date: '2026-01-01', summary: '' },
    });
    const s2 = await addEntity(db, {
      type: 'session', name: 'S2', description: '', tags: [],
      data: { number: 2, date: '2026-02-01', summary: '' },
    });
    await addRelation(db, { type: 'appears_in', sourceId: thread.id, targetId: s1.id });

    const { result } = renderHook(() => useTimeline(), { wrapper });
    await waitFor(() => expect(result.current?.threads.length).toBe(1));

    const sessionIds = result.current!.threadSessionIds.get(thread.id)!;
    expect(sessionIds.has(s1.id)).toBe(true);
    expect(sessionIds.has(s2.id)).toBe(false);
  });

  it('thread with no appearances has an empty set', async () => {
    const thread = await addEntity(db, {
      type: 'thread', name: 'Beta', description: '', tags: [],
      data: { color: '#6366f1', status: 'active' },
    });
    await addEntity(db, {
      type: 'session', name: 'S1', description: '', tags: [],
      data: { number: 1, date: '2026-01-01', summary: '' },
    });

    const { result } = renderHook(() => useTimeline(), { wrapper });
    await waitFor(() => expect(result.current).toBeDefined());

    const sessionIds = result.current!.threadSessionIds.get(thread.id)!;
    expect(sessionIds.size).toBe(0);
  });

  it('threads sorted alphabetically by name', async () => {
    await addEntity(db, {
      type: 'thread', name: 'Zeta', description: '', tags: [],
      data: { color: '#f59e0b', status: 'active' },
    });
    await addEntity(db, {
      type: 'thread', name: 'Alpha', description: '', tags: [],
      data: { color: '#10b981', status: 'active' },
    });
    await addEntity(db, {
      type: 'thread', name: 'Mu', description: '', tags: [],
      data: { color: '#3b82f6', status: 'active' },
    });

    const { result } = renderHook(() => useTimeline(), { wrapper });
    await waitFor(() => expect(result.current?.threads.length).toBe(3));

    const names = result.current!.threads.map((t) => t.name);
    expect(names).toEqual(['Alpha', 'Mu', 'Zeta']);
  });
});
