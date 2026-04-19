import { describe, it, expect, beforeEach } from 'vitest';
import { openCampaignDb } from '@shared/db/database';
import { addEntity, addRelation } from '@shared/db/operations';
import { renderHook, waitFor } from '@testing-library/react';
import { useEntityById } from '@shared/hooks/useEntityById';
import { useEntitiesByType } from '@shared/hooks/useEntitiesByType';
import { useRelations } from '@shared/hooks/useRelations';
import { useContained } from '@shared/hooks/useContained';
import { useAncestors } from '@shared/hooks/useAncestors';
import { useRelatedEntities } from '@shared/hooks/useRelatedEntities';
import { useThreatDetailPath } from '@shared/hooks/useThreatDetailPath';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { setActiveCampaignId, saveCampaign } from '@shared/db/campaignStore';
import React from 'react';

// Use a dedicated test campaign – provider will call openCampaignDb('__hooks-test__')
// which returns the same cached instance we use below for data setup.
const TEST_CAMPAIGN_ID = '__hooks-test__';
const db = openCampaignDb(TEST_CAMPAIGN_ID);

setActiveCampaignId(TEST_CAMPAIGN_ID);
saveCampaign({ id: TEST_CAMPAIGN_ID, name: 'Test', description: '', createdAt: new Date().toISOString() });

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CampaignProvider, null, children);
}

const npcBase = { type: 'npc' as const, name: 'Aldric', description: '', tags: ['hero'], data: {} };
const locBase = { type: 'location' as const, name: 'Karczma', description: '', tags: [], data: {} };
const loc2Base = { type: 'location' as const, name: 'Miasto', description: '', tags: [], data: {} };

beforeEach(async () => {
  await db.entities.clear();
  await db.relations.clear();
});

describe('useEntityById', () => {
  it('returns entity when it exists', async () => {
    const entity = await addEntity(db, npcBase);
    const { result } = renderHook(() => useEntityById(entity.id), { wrapper });
    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current?.name).toBe('Aldric');
  });

  it('returns undefined for unknown id', async () => {
    const { result } = renderHook(() => useEntityById('nonexistent'), { wrapper });
    await waitFor(() => expect(result.current).toBeUndefined());
  });
});

describe('useEntitiesByType', () => {
  it('returns only entities of the requested type', async () => {
    await addEntity(db, npcBase);
    await addEntity(db, locBase);
    const { result } = renderHook(() => useEntitiesByType('npc'), { wrapper });
    await waitFor(() => expect(result.current.length).toBe(1));
    expect(result.current[0]?.name).toBe('Aldric');
  });

  it('returns empty array when no entities of type', async () => {
    const { result } = renderHook(() => useEntitiesByType('clock'), { wrapper });
    await waitFor(() => expect(result.current).toEqual([]));
  });
});

describe('useRelations', () => {
  it('returns relations as both source and target', async () => {
    const npc = await addEntity(db, npcBase);
    const loc = await addEntity(db, locBase);
    await addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' });

    const { result } = renderHook(() => useRelations(npc.id), { wrapper });
    await waitFor(() => expect(result.current.length).toBe(1));
    expect(result.current[0]?.type).toBe('contains');
  });
});

describe('useRelatedEntities', () => {
  it('returns domain-linked entities filtered by relation type', async () => {
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Sprawa z portu',
      description: '',
      tags: [],
      data: { color: '#6366f1', status: 'active', kind: 'main' },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Przemytnicy',
      description: '',
      tags: [],
      data: { threatType: 'ambitious_organization', impulse: 'Rosnac w sile', moves: [] },
    });
    await addRelation(db, { sourceId: thread.id, targetId: threat.id, type: 'affects' });

    const { result } = renderHook(
      () => useRelatedEntities(thread.id, {
        relationTypes: ['affects'],
        direction: 'both',
        otherTypes: ['threat'],
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current?.length).toBe(1));
    expect(result.current?.[0]?.entity.id).toBe(threat.id);
  });
});

describe('useThreatDetailPath', () => {
  it('builds a direct threat detail path', async () => {
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Kult pod miastem',
      description: '',
      tags: [],
      data: { threatType: 'dark_entity', impulse: 'Obudzic cos starego', moves: [] },
    });
    const { result } = renderHook(() => useThreatDetailPath(threat.id), { wrapper });

    await waitFor(() => expect(result.current).toBe(`/threats/${threat.id}`));
  });
});

describe('useContained', () => {
  it('returns entities linked via contains from given entity', async () => {
    const loc = await addEntity(db, locBase);
    const npc = await addEntity(db, npcBase);
    await addRelation(db, { sourceId: loc.id, targetId: npc.id, type: 'contains' });

    const { result } = renderHook(() => useContained(loc.id), { wrapper });
    await waitFor(() => expect(result.current.length).toBe(1));
    expect(result.current[0]?.id).toBe(npc.id);
  });
});

describe('useAncestors', () => {
  it('returns empty array for entity with no parent', async () => {
    const loc = await addEntity(db, locBase);
    const { result } = renderHook(() => useAncestors(loc.id), { wrapper });
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('returns parent chain root-first', async () => {
    const city = await addEntity(db, loc2Base);
    const tavern = await addEntity(db, locBase);
    await addRelation(db, { sourceId: city.id, targetId: tavern.id, type: 'contains' });

    const { result } = renderHook(() => useAncestors(tavern.id), { wrapper });
    await waitFor(() => expect(result.current.length).toBe(1));
    expect(result.current[0]?.id).toBe(city.id);
  });
});
