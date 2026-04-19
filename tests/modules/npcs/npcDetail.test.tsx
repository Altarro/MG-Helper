import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render } from '@testing-library/react';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { addEntity, addRelation } from '@shared/db/operations';
import { createLocationData } from '@modules/locations/types';
import { NpcDetail } from '@modules/npcs/components/NpcDetail';

const db = openCampaignDb('__legacy__');

function renderNpcDetail(npcId: string) {
  return render(
    React.createElement(
      CampaignProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/npcs/${npcId}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: '/npcs/:id', element: React.createElement(NpcDetail) }),
        ),
      ),
    ),
  );
}

describe('NpcDetail', () => {
  beforeEach(async () => {
    setActiveCampaignId('__legacy__');
    saveCampaign({
      id: '__legacy__',
      name: 'Test Campaign',
      description: '',
      createdAt: new Date().toISOString(),
    });
    await db.entities.clear();
    await db.relations.clear();
  });

  it('shows current location and session appearances separately', async () => {
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Mira',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '', playStyle: '', isPC: false, playerName: '' },
    });
    const location = await addEntity(db, {
      type: 'location',
      name: 'Wieza',
      description: '',
      tags: [],
      data: createLocationData({ locationType: 'building' }),
    });
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 7',
      description: '',
      tags: [],
      data: { number: 7, date: '2026-04-12', summary: '' },
    });

    await addRelation(db, { type: 'contains', sourceId: location.id, targetId: npc.id });
    await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: session.id });

    renderNpcDetail(npc.id);

    await waitFor(() => {
      expect(screen.getByText('Wieza')).toBeInTheDocument();
    });

    expect(screen.getByText('Aktualna lokacja')).toBeInTheDocument();
    expect(screen.getByText('Obecność w sesjach')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Sesja 7/)).toBeInTheDocument();
    });
  });

  it('shows add-location prompt when NPC has no current location', async () => {
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Nowy NPC',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '', playStyle: '', isPC: false, playerName: '' },
    });

    renderNpcDetail(npc.id);

    await waitFor(() => {
      expect(screen.getByText('Brak aktualnej lokacji.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Dodaj lokację/i })).toBeInTheDocument();
  });
  it('shows last three seen locations and opens full history modal', async () => {
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Raven',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '', playStyle: '', isPC: false, playerName: '' },
    });
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 11',
      description: '',
      tags: [],
      data: { number: 11, date: '2026-04-12', summary: '' },
    });
    const [market, port, tower, crypt] = await Promise.all([
      addEntity(db, {
        type: 'location',
        name: 'Rynek',
        description: '',
        tags: [],
        data: createLocationData({ locationType: 'district' }),
      }),
      addEntity(db, {
        type: 'location',
        name: 'Port',
        description: '',
        tags: [],
        data: createLocationData({ locationType: 'district' }),
      }),
      addEntity(db, {
        type: 'location',
        name: 'Wieza',
        description: '',
        tags: [],
        data: createLocationData({ locationType: 'building' }),
      }),
      addEntity(db, {
        type: 'location',
        name: 'Krypta',
        description: '',
        tags: [],
        data: createLocationData({ locationType: 'building' }),
      }),
    ]);

    await Promise.all([
      addEntity(db, {
        type: 'event',
        name: 'Historia lokacji NPC',
        description: '',
        tags: [],
        data: {
          kind: 'npc_location_history',
          timestamp: '2026-04-10T09:00:00.000Z',
          text: 'Raven widziany w Rynku',
          npcId: npc.id,
          locationId: market.id,
          locationName: market.name,
        },
      }),
      addEntity(db, {
        type: 'event',
        name: 'Historia lokacji NPC',
        description: '',
        tags: [],
        data: {
          kind: 'npc_location_history',
          timestamp: '2026-04-10T12:00:00.000Z',
          text: 'Raven widziany w Porcie',
          npcId: npc.id,
          locationId: port.id,
          locationName: port.name,
        },
      }),
      addEntity(db, {
        type: 'event',
        name: 'Historia lokacji NPC',
        description: '',
        tags: [],
        data: {
          kind: 'npc_location_history',
          timestamp: '2026-04-11T18:30:00.000Z',
          text: 'Raven widziany w Wiezy',
          npcId: npc.id,
          locationId: tower.id,
          locationName: tower.name,
          sessionId: session.id,
          sessionName: session.name,
        },
      }),
      addEntity(db, {
        type: 'event',
        name: 'Historia lokacji NPC',
        description: '',
        tags: [],
        data: {
          kind: 'npc_location_history',
          timestamp: '2026-04-12T07:45:00.000Z',
          text: 'Raven widziany w Krypcie',
          npcId: npc.id,
          locationId: crypt.id,
          locationName: crypt.name,
        },
      }),
    ]);

    renderNpcDetail(npc.id);

    await waitFor(() => {
      expect(screen.getByText('Krypta')).toBeInTheDocument();
    });

    expect(screen.getByText('Wieza')).toBeInTheDocument();
    expect(screen.getByText('Port')).toBeInTheDocument();
    expect(screen.getByText('Rynek')).toBeInTheDocument();
    expect(screen.getByText(/Podczas: Sesja 11/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cala historia/i }));

    const dialog = await screen.findByRole('dialog', { name: /Historia lokacji NPC/i });
    expect(within(dialog).getByText('Rynek')).toBeInTheDocument();
    expect(within(dialog).getByText('Krypta')).toBeInTheDocument();
    expect(within(dialog).getByText(/Podczas: Sesja 11/)).toBeInTheDocument();
  });
});
