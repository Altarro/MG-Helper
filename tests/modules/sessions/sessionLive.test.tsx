import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { openCampaignDb } from '@shared/db/database';
import { setActiveCampaignId, saveCampaign } from '@shared/db/campaignStore';
import { addEntity } from '@shared/db/operations';
import { render } from '@testing-library/react';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { SessionLive } from '@modules/sessions/components/SessionLive';

// jsdom doesn't implement scrollIntoView — stub it so SessionTimeline doesn't crash
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = () => {};
});

const TEST_ID = '__session-live-smoke__';
const db = openCampaignDb(TEST_ID);
setActiveCampaignId(TEST_ID);
saveCampaign({ id: TEST_ID, name: 'Live Smoke', description: '', createdAt: new Date().toISOString() });

beforeEach(async () => {
  await db.entities.clear();
  await db.relations.clear();
});

function renderLive(sessionId: string) {
  return render(
    React.createElement(
      CampaignProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/sessions/${sessionId}/live`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: '/sessions/:id/live', element: React.createElement(SessionLive) }),
        ),
      ),
    ),
  );
}

describe('SessionLive smoke tests', () => {
  it('renders without crashing for a valid session', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja próbna',
      description: '',
      tags: [],
      data: { number: 1, date: '2024-01-01', summary: '' },
    });

    renderLive(session.id);

    await waitFor(() => {
      expect(screen.getByText(/Sesja próbna/)).toBeInTheDocument();
    });
  });

  it('renders a loading spinner while session is being fetched', () => {
    // useSessionById returns undefined (loading) for an unknown id
    // — useLiveQuery cannot distinguish loading from not-found
    renderLive('non-existent-id-xyz');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
