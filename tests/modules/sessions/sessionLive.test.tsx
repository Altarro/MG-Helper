import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  window.HTMLElement.prototype.setPointerCapture = () => {};
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

  it('opens Inspirations panel from SessionLive rail', async () => {
    const user = userEvent.setup();
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja Inspiracje',
      description: '',
      tags: [],
      data: { number: 2, date: '2026-04-24', summary: '' },
    });

    renderLive(session.id);
    await waitFor(() => {
      expect(screen.getByText(/Sesja Inspiracje/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Rozwiń menu boczne' }));
    await user.click(screen.getByRole('button', { name: 'Inspiracje' }));

    await waitFor(() => {
      expect(screen.getByText('Generator podpowiedzi do improwizacji: postacie, lokacje, zdarzenia i tabele wlasne.')).toBeInTheDocument();
    });
  });

  it('does not trigger hook-order errors when toggling right rail sections', async () => {
    const user = userEvent.setup();
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja Hook Order',
      description: '',
      tags: [],
      data: { number: 3, date: '2026-04-24', summary: '' },
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderLive(session.id);
    await waitFor(() => {
      expect(screen.getByText(/Sesja Hook Order/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Rozwiń menu boczne' }));
    await user.click(screen.getByRole('button', { name: 'Inspiracje' }));
    await user.click(screen.getByRole('button', { name: 'Wyszukaj' }));
    await user.click(screen.getByRole('button', { name: 'Wątki' }));
    await user.click(screen.getByRole('button', { name: 'Inspiracje' }));

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Rendered more hooks than during the previous render'),
    );
    consoleErrorSpy.mockRestore();
  });

  it('supports rail keyboard navigation and pointer drag without breaking section click', async () => {
    const user = userEvent.setup();
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja Rail UX',
      description: '',
      tags: [],
      data: { number: 4, date: '2026-04-24', summary: '' },
    });

    const { container } = renderLive(session.id);
    await waitFor(() => {
      expect(screen.getByText(/Sesja Rail UX/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Rozwiń menu boczne' }));
    const threadsButton = screen.getByRole('button', { name: 'Wątki' });
    threadsButton.focus();
    fireEvent.keyDown(threadsButton, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: 'Wskazówki' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Inspiracje' }));
    const railScroll = container.querySelector('.rail-scroll');
    expect(railScroll).toBeTruthy();
    if (!railScroll) return;

    fireEvent.pointerDown(railScroll, { pointerId: 1, clientY: 140 });
    fireEvent.pointerMove(railScroll, { pointerId: 1, clientY: 80 });
    fireEvent.pointerUp(railScroll, { pointerId: 1, clientY: 80 });

    await user.click(screen.getByRole('button', { name: 'Wyszukaj' }));
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Szukaj encji w sesji' })).toBeInTheDocument();
    });
  });

  it('renders rail and panel correctly on small and large viewport widths', async () => {
    const user = userEvent.setup();
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja Viewport',
      description: '',
      tags: [],
      data: { number: 5, date: '2026-04-24', summary: '' },
    });

    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 });
    window.dispatchEvent(new Event('resize'));

    renderLive(session.id);
    await waitFor(() => {
      expect(screen.getByText(/Sesja Viewport/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Rozwiń menu boczne' }));
    await user.click(screen.getByRole('button', { name: 'Inspiracje' }));
    expect(screen.getByText('Generator podpowiedzi do improwizacji: postacie, lokacje, zdarzenia i tabele wlasne.')).toBeInTheDocument();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
    window.dispatchEvent(new Event('resize'));
    await user.click(screen.getByRole('button', { name: 'Wyszukaj' }));
    expect(screen.getByRole('textbox', { name: 'Szukaj encji w sesji' })).toBeInTheDocument();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    window.dispatchEvent(new Event('resize'));
  });
});
