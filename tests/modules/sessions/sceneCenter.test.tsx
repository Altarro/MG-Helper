import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { openCampaignDb } from '@shared/db/database';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { addEntity, addRelation } from '@shared/db/operations';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { createLocationData } from '@modules/locations/types';
import { SceneCenter } from '@modules/sessions/components/SceneCenter';

const TEST_ID = '__scene-center__';
const db = openCampaignDb(TEST_ID);

function renderSceneCenter(sessionId: string, currentLocationId: string) {
  return render(
    React.createElement(
      CampaignProvider,
      null,
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(SceneCenter, {
          sessionId,
          currentLocationId,
          openCardIds: [],
          onLocationChange: () => {},
          onCloseCard: () => {},
        }),
      ),
    ),
  );
}

describe('SceneCenter', () => {
  beforeEach(async () => {
    setActiveCampaignId(TEST_ID);
    saveCampaign({
      id: TEST_ID,
      name: 'Scene Center Test',
      description: '',
      createdAt: new Date().toISOString(),
    });
    await db.entities.clear();
    await db.relations.clear();
  });

  it('opens the NPC detail modal from the inline scene card', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 15',
      description: '',
      tags: [],
      data: { number: 15, date: '2026-04-12', summary: '' },
    });
    const location = await addEntity(db, {
      type: 'location',
      name: 'Stary Port',
      description: '',
      tags: [],
      data: createLocationData({ locationType: 'district' }),
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Iria Fen',
      description: '<p>Pełny opis Iria Fen do modala.</p>',
      tags: [],
      data: {
        instinct: 'Wślizgnąć się tam, gdzie inni widzą tylko zamknięte drzwi',
        motivation: 'Oczyścić imię ojca',
        appearance: 'Lekki płaszcz i czujne spojrzenie',
        playStyle: 'Mówi szybko i obserwuje każdy detal',
        isPC: true,
        playerName: 'Kasia',
      },
    });

    await addRelation(db, { type: 'appears_in', sourceId: location.id, targetId: session.id });
    await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: session.id });
    await addRelation(db, { type: 'contains', sourceId: location.id, targetId: npc.id });

    renderSceneCenter(session.id, location.id);

    await waitFor(() => {
      expect(screen.getByText('Iria Fen')).toBeInTheDocument();
    });

    const expandButton = screen.getByLabelText(/Rozwi.*Iria Fen/i);
    const expandIcon = expandButton.querySelector('svg');

    expect(expandIcon).not.toBeNull();
    fireEvent.pointerDown(expandIcon!);
    fireEvent.click(expandIcon!);

    const dialog = await screen.findByRole('dialog', { name: /Kontekst postaci Iria Fen/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/opis Iria Fen do modala/i)).toBeInTheDocument();
  });
});
