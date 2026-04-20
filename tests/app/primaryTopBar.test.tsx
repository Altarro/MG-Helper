import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { addEntity } from '@shared/db/operations';
import { PrimaryTopBar } from '@app/layout/PrimaryTopBar';

const TEST_ID = '__primary-topbar__';
const db = openCampaignDb(TEST_ID);

function renderTopBar(initialEntry: string) {
  return render(
    React.createElement(
      CampaignProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        React.createElement(PrimaryTopBar),
      ),
    ),
  );
}

describe('PrimaryTopBar', () => {
  beforeEach(async () => {
    setActiveCampaignId(TEST_ID);
    saveCampaign({
      id: TEST_ID,
      name: 'TopBar Test',
      description: '',
      createdAt: new Date().toISOString(),
    });
    await db.entities.clear();
    await db.relations.clear();
  });

  it('shows entity name instead of raw id on detail routes', async () => {
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Cena Ocalenia',
      description: '',
      tags: [],
      data: { color: '#6366f1', status: 'active', kind: 'main' },
    });

    renderTopBar(`/threads/${thread.id}`);

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });

    await waitFor(() => {
      expect(within(breadcrumb).getByText('Wątki')).toBeInTheDocument();
      expect(within(breadcrumb).getByText('Cena Ocalenia')).toBeInTheDocument();
    });

    expect(within(breadcrumb).queryByText(thread.id)).not.toBeInTheDocument();
  });

  it('shows parent session name for nested session routes', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 7 - Targ pod Latarnia',
      description: '',
      tags: [],
      data: { number: 7, date: '2026-04-13', summary: '' },
    });

    renderTopBar(`/sessions/${session.id}/live`);

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });

    await waitFor(() => {
      expect(within(breadcrumb).getByText('Sesje')).toBeInTheDocument();
      expect(within(breadcrumb).getByText('Sesja 7 - Targ pod Latarnia')).toBeInTheDocument();
      expect(within(breadcrumb).getByText('Na żywo')).toBeInTheDocument();
    });

    expect(within(breadcrumb).queryByText(session.id)).not.toBeInTheDocument();
  });
});
