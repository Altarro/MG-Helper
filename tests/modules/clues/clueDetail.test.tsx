import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { addEntity, addRelation } from '@shared/db/operations';
import { ClueDetail } from '@modules/clues/components/ClueDetail';

const TEST_ID = '__clue-detail__';
const db = openCampaignDb(TEST_ID);

function renderClueDetail(clueId: string) {
  return render(
    React.createElement(
      CampaignProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/clues/${clueId}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: '/clues/:id', element: React.createElement(ClueDetail) }),
        ),
      ),
    ),
  );
}

describe('ClueDetail', () => {
  beforeEach(async () => {
    setActiveCampaignId(TEST_ID);
    saveCampaign({
      id: TEST_ID,
      name: 'Clue Detail Test',
      description: '',
      createdAt: new Date().toISOString(),
    });
    await db.entities.clear();
    await db.relations.clear();
  });

  it('shows story targets for thread, threat and front together with clue strength labels', async () => {
    const clue = await addEntity(db, {
      type: 'clue',
      name: 'Szyfr z opactwa',
      description: '<p>To trop, ktory spina kilka warstw fabuly.</p>',
      tags: [],
      data: { clueType: 'event', hint: 'Powtarza sie w raportach i modlitwach', discovered: false },
    });
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Cicha Rebelia w Opactwie',
      description: '',
      tags: [],
      data: { color: '#6366f1', status: 'active', kind: 'main' },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Opactwo Przyzwania',
      description: '',
      tags: [],
      data: { threatType: 'religious_institution', impulse: 'Przyzwac cos starszego od miasta', moves: [] },
    });
    const front = await addEntity(db, {
      type: 'front',
      name: 'Ksiaze i Sekrety Miasta',
      description: '',
      tags: [],
      data: { category: 'campaign', goal: '', stakes: [] },
    });

    await addRelation(db, {
      type: 'clues_for',
      sourceId: clue.id,
      targetId: thread.id,
      meta: { clueStrength: 'strong' },
    });
    await addRelation(db, {
      type: 'clues_for',
      sourceId: clue.id,
      targetId: threat.id,
      meta: { clueStrength: 'standard' },
    });
    await addRelation(db, {
      type: 'clues_for',
      sourceId: clue.id,
      targetId: front.id,
      meta: { clueStrength: 'weak' },
    });

    renderClueDetail(clue.id);

    await waitFor(() => {
      expect(screen.getByText('Szyfr z opactwa')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Cicha Rebelia w Opactwie')).toBeInTheDocument();
      expect(screen.getByText('Opactwo Przyzwania')).toBeInTheDocument();
      expect(screen.getByText('Ksiaze i Sekrety Miasta')).toBeInTheDocument();

      expect(screen.getByText(/Mocna wskazowka: 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Standardowa wskazowka: 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Luzny trop: 1/i)).toBeInTheDocument();
    });
  });
});
