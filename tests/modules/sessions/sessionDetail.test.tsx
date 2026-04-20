import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { addEntity, addRelation } from '@shared/db/operations';
import { createLocationData } from '@modules/locations/types';
import { SessionDetail } from '@modules/sessions/components/SessionDetail';

const TEST_ID = '__session-detail__';
const db = openCampaignDb(TEST_ID);

function renderSessionDetail(sessionId: string) {
  return render(
    React.createElement(
      CampaignProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/sessions/${sessionId}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/sessions/:id',
            element: React.createElement(SessionDetail),
          }),
        ),
      ),
    ),
  );
}

describe('SessionDetail', () => {
  beforeEach(async () => {
    setActiveCampaignId(TEST_ID);
    saveCampaign({
      id: TEST_ID,
      name: 'Session Detail Test',
      description: '',
      createdAt: new Date().toISOString(),
    });

    await db.entities.clear();
    await db.relations.clear();
  });

  it('shows remove actions for all session entity columns', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 21',
      description: '',
      tags: [],
      data: { number: 21, date: '2026-04-20', summary: '' },
    });

    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Mira',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });
    const location = await addEntity(db, {
      type: 'location',
      name: 'Wieża',
      description: '',
      tags: [],
      data: createLocationData({ locationType: 'building' }),
    });
    const item = await addEntity(db, {
      type: 'item',
      name: 'Relikt',
      description: '',
      tags: [],
      data: { itemType: 'artifact', properties: [] },
    });
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Czarna Nić',
      description: '',
      tags: [],
      data: { color: '#6366f1', status: 'active', kind: 'main' },
    });
    const clue = await addEntity(db, {
      type: 'clue',
      name: 'Szyfr',
      description: '',
      tags: [],
      data: { clueType: 'event', hint: 'Ukryty w marginesie', discovered: false },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Bunt Kupców',
      description: '',
      tags: [],
      data: { threatType: 'ambitious_organization', impulse: 'Przejąć rynek', moves: [] },
    });

    await Promise.all([
      addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: session.id }),
      addRelation(db, { type: 'appears_in', sourceId: location.id, targetId: session.id }),
      addRelation(db, { type: 'appears_in', sourceId: item.id, targetId: session.id }),
      addRelation(db, { type: 'appears_in', sourceId: thread.id, targetId: session.id }),
      addRelation(db, { type: 'appears_in', sourceId: clue.id, targetId: session.id }),
      addRelation(db, { type: 'appears_in', sourceId: threat.id, targetId: session.id }),
    ]);

    renderSessionDetail(session.id);

    await waitFor(() => {
      expect(screen.getByText('Sesja 21')).toBeInTheDocument();
    });

    expect(await screen.findByRole('button', { name: 'Usuń z sesji: Mira' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Usuń z sesji: Wieża' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Usuń z sesji: Relikt' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Usuń z sesji: Czarna Nić' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Usuń z sesji: Szyfr' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Usuń z sesji: Bunt Kupców' })).toBeInTheDocument();
  });

  it('detaches NPC from session after clicking remove action', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 22',
      description: '',
      tags: [],
      data: { number: 22, date: '2026-04-20', summary: '' },
    });

    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Raven',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });

    await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: session.id });

    renderSessionDetail(session.id);

    const removeButton = await screen.findByRole('button', { name: 'Usuń z sesji: Raven' });
    fireEvent.click(removeButton);

    await waitFor(async () => {
      const relation = await db.relations
        .where('sourceId')
        .equals(npc.id)
        .filter((item) => item.type === 'appears_in' && item.targetId === session.id)
        .first();
      expect(relation).toBeUndefined();
    });
  });
});
