import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { addEntity, addRelation } from '@shared/db/operations';
import { ThreadDetail } from '@modules/threads/components/ThreadDetail';

const TEST_ID = '__thread-detail__';
const db = openCampaignDb(TEST_ID);

function renderThreadDetail(threadId: string) {
  return render(
    React.createElement(
      CampaignProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/threads/${threadId}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: '/threads/:id', element: React.createElement(ThreadDetail) }),
        ),
      ),
    ),
  );
}

describe('ThreadDetail', () => {
  beforeEach(async () => {
    setActiveCampaignId(TEST_ID);
    saveCampaign({
      id: TEST_ID,
      name: 'Thread Detail Test',
      description: '',
      createdAt: new Date().toISOString(),
    });
    await db.entities.clear();
    await db.relations.clear();
  });

  it('renders questline, clue and threat context and blocks already linked child threads in picker', async () => {
    const currentThread = await addEntity(db, {
      type: 'thread',
      name: 'Cena Ocalenia',
      description: '<p>Stol musi zdecydowac, komu oddac artefakt.</p>',
      tags: ['stol'],
      data: { color: '#6366f1', status: 'active', kind: 'main', priority: 'high', resolution: '' },
    });
    const parentThread = await addEntity(db, {
      type: 'thread',
      name: 'Czarny Przyplyw',
      description: '',
      tags: [],
      data: { color: '#ef4444', status: 'active', kind: 'main' },
    });
    const childThread = await addEntity(db, {
      type: 'thread',
      name: 'Dziennik Strazniczki',
      description: '',
      tags: [],
      data: { color: '#f97316', status: 'active', kind: 'side' },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Kupieni Radni',
      description: '',
      tags: [],
      data: { threatType: 'ambitious_organization', impulse: 'Przejac rade miasta', moves: [] },
    });
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 4',
      description: '',
      tags: [],
      data: { number: 4, date: '2026-04-12', summary: '' },
    });
    const clue = await addEntity(db, {
      type: 'clue',
      name: 'Zakrwawiony manifest',
      description: '',
      tags: [],
      data: { clueType: 'event', hint: 'Prowadzi prosto do portowego skladu', discovered: false },
    });

    await addRelation(db, {
      type: 'derives_from',
      sourceId: currentThread.id,
      targetId: parentThread.id,
      meta: { threadDerivationKind: 'followup' },
    });
    await addRelation(db, {
      type: 'derives_from',
      sourceId: childThread.id,
      targetId: currentThread.id,
      meta: { threadDerivationKind: 'consequence' },
    });
    await addRelation(db, { type: 'affects', sourceId: currentThread.id, targetId: threat.id });
    await addRelation(db, { type: 'appears_in', sourceId: currentThread.id, targetId: session.id });
    await addRelation(db, {
      type: 'clues_for',
      sourceId: clue.id,
      targetId: currentThread.id,
      meta: { clueStrength: 'strong' },
    });

    renderThreadDetail(currentThread.id);

    await waitFor(() => {
      expect(screen.getByText('Cena Ocalenia')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByText('Kupieni Radni').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Czarny Przyplyw').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Konsekwencja').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Dziennik Strazniczki').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Zakrwawiony manifest').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mocna wskazowka').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /\+ Konsekwencja/i }));

    const dialog = await screen.findByRole('dialog', { name: /Podepnij istniejacy watek pochodny/i });
    expect(within(dialog).getByText(/Watki juz podpiete do tego miejsca questline sa zablokowane/i)).toBeInTheDocument();

    const linkedThreadButton = await within(dialog).findByRole('button', { name: /Dziennik Strazniczki/i });
    expect(linkedThreadButton).toBeDisabled();
    expect(within(dialog).getByText(/Juz powiazane jako: Konsekwencja/i)).toBeInTheDocument();
  });

  it('shows clear empty states for a free thread without story links yet', async () => {
    const freeThread = await addEntity(db, {
      type: 'thread',
      name: 'Wolny Trop',
      description: '',
      tags: [],
      data: { color: '#22c55e', status: 'active', kind: 'side' },
    });

    renderThreadDetail(freeThread.id);

    await waitFor(() => {
      expect(screen.getByText('Wolny Trop')).toBeInTheDocument();
    });

    expect(screen.getByText(/Ten watek nie ma jeszcze jawnie podpietych zagrozen/i)).toBeInTheDocument();
    expect(screen.getByText(/Ten watek nie wynika jeszcze z innego watku/i)).toBeInTheDocument();
    expect(screen.getByText(/Ten watek nie ma jeszcze odnog ani nastepstw/i)).toBeInTheDocument();
  });
});
