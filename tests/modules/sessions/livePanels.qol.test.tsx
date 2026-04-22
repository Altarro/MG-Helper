import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { addEntity, addRelation } from '@shared/db/operations';
import { createLocationData } from '@modules/locations/types';
import { SessionNpcPanel } from '@modules/sessions/components/SessionNpcPanel';
import { SessionHudTray } from '@modules/sessions/components/SessionHudTray';
import { SessionSearchPanel } from '@modules/sessions/components/SessionSearchPanel';
import type { SpotlightState } from '@modules/sessions/types';
import { getSessionNpcPanelData } from '@modules/sessions/utils/liveSessionData';

const TEST_ID = '__session-live-panels-qol__';
const db = openCampaignDb(TEST_ID);

function renderInCampaign(ui: React.ReactElement) {
  return render(
    <CampaignProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </CampaignProvider>,
  );
}

function createSpotlightState(): SpotlightState {
  return {
    mgActive: false,
    mgTimer: { elapsed: 0, startedAt: null },
    mgTotalActiveTimer: { elapsed: 0, startedAt: null },
    players: [],
    isPaused: false,
    sessionStarted: false,
  };
}

describe('Session live panels QoL regressions', () => {
  beforeEach(async () => {
    setActiveCampaignId(TEST_ID);
    saveCampaign({
      id: TEST_ID,
      name: 'Session Panels QOL',
      description: '',
      createdAt: new Date().toISOString(),
    });

    await db.entities.clear();
    await db.relations.clear();
    await db.assets.clear();
    sessionStorage.clear();
    localStorage.removeItem('mg-live-session');
  });

  it('covers add/remove and pin/unpin flows in SessionNpcPanel with keyboard activation', async () => {
    const user = userEvent.setup();

    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja NPC',
      description: '',
      tags: [],
      data: { number: 31, date: '2026-04-20', summary: '' },
    });
    const location = await addEntity(db, {
      type: 'location',
      name: 'Port',
      description: '',
      tags: [],
      data: createLocationData({ locationType: 'district' }),
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Mira',
      description: '',
      tags: [],
      data: { instinct: '', motivation: '', appearance: '' },
    });

    await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: session.id });
    await addRelation(db, { type: 'contains', sourceId: location.id, targetId: npc.id });

    const panelData = await getSessionNpcPanelData(db, session.id, location.id);
    expect(panelData.npcs, 'getSessionNpcPanelData should see NPC in session').toHaveLength(1);

    renderInCampaign(
      <SessionNpcPanel sessionId={session.id} currentLocationId={location.id} />,
    );

    const unpinButton = await screen.findByRole('button', { name: 'Odepnij ze sceny: Mira' });
    await user.click(unpinButton);

    await waitFor(async () => {
      const relation = await db.relations
        .where('sourceId')
        .equals(location.id)
        .filter((item) => item.type === 'contains' && item.targetId === npc.id)
        .first();
      expect(relation).toBeUndefined();
    });

    const pinButton = await screen.findByRole('button', { name: 'Przypnij do sceny: Mira' });
    await user.click(pinButton);

    await waitFor(async () => {
      const relation = await db.relations
        .where('sourceId')
        .equals(location.id)
        .filter((item) => item.type === 'contains' && item.targetId === npc.id)
        .first();
      expect(relation).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: 'Dodaj NPC' }));
    await user.type(screen.getByPlaceholderText('Imię NPC...'), 'Kira{Enter}');

    const removeNewNpc = await screen.findByRole('button', { name: 'Usuń z sesji: Kira' });
    removeNewNpc.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Usuń z sesji: Kira' })).not.toBeInTheDocument();
    });

    const kira = await db.entities.where('name').equals('Kira').first();
    expect(kira).toBeDefined();
    if (!kira) {
      throw new Error('Missing quick-added NPC entity.');
    }

    const appearsRelation = await db.relations
      .where('sourceId')
      .equals(kira.id)
      .filter((item) => item.type === 'appears_in' && item.targetId === session.id)
      .first();
    expect(appearsRelation).toBeUndefined();
  });

  it('covers add/remove and status change in SessionHudTray threads panel with aria labels', async () => {
    const user = userEvent.setup();

    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja Wątki',
      description: '',
      tags: [],
      data: { number: 32, date: '2026-04-20', summary: '' },
    });
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Czarna Nić',
      description: '',
      tags: [],
      data: { color: '#6366f1', status: 'active', kind: 'main' },
    });

    await addRelation(db, { type: 'appears_in', sourceId: thread.id, targetId: session.id });

    renderInCampaign(
      <SessionHudTray
        sessionId={session.id}
        currentLocationId={null}
        onLocationChange={() => {}}
        spotlightState={createSpotlightState()}
        onSpotlightChange={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Wątki' }));
    await screen.findByText('Czarna Nić');

    expect(screen.getByRole('link', { name: 'Otwórz detal wątku: Czarna Nić' })).toBeInTheDocument();

    const statusButton = screen.getByRole('button', { name: 'Oznacz jako zakończony: Czarna Nić' });
    statusButton.focus();
    await user.keyboard('{Enter}');

    await waitFor(async () => {
      const updated = await db.entities.get(thread.id);
      const status = updated?.data && typeof updated.data === 'object'
        ? (updated.data as { status?: string }).status
        : undefined;
      expect(status).toBe('completed');
    });

    await user.click(screen.getByRole('button', { name: 'Dodaj do sesji' }));
    await user.type(screen.getByPlaceholderText('Nazwa wątku do sesji...'), 'Nowy Trop{Enter}');

    const removeNewThread = await screen.findByRole('button', { name: 'Usuń z sesji: Nowy Trop' });
    removeNewThread.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Usuń z sesji: Nowy Trop' })).not.toBeInTheDocument();
    });

    const newThread = await db.entities.where('name').equals('Nowy Trop').first();
    expect(newThread).toBeDefined();
    if (!newThread) {
      throw new Error('Missing quick-added thread entity.');
    }

    const appearsRelation = await db.relations
      .where('sourceId')
      .equals(newThread.id)
      .filter((item) => item.type === 'appears_in' && item.targetId === session.id)
      .first();
    expect(appearsRelation).toBeUndefined();
  });

  it('covers pin/unpin and quick preview in SessionSearchPanel, including Escape close', async () => {
    const user = userEvent.setup();

    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja Search',
      description: '',
      tags: [],
      data: { number: 33, date: '2026-04-20', summary: '' },
    });
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Szkarłatny Trop',
      description: 'Opis testowy',
      tags: [],
      data: { color: '#ef4444', status: 'active', kind: 'side' },
    });

    await addRelation(db, { type: 'appears_in', sourceId: thread.id, targetId: session.id });

    renderInCampaign(<SessionSearchPanel sessionId={session.id} />);

    expect(screen.getByRole('textbox', { name: 'Szukaj encji w sesji' })).toBeInTheDocument();

    const pinButton = await screen.findByRole('button', { name: 'Przypnij do sceny: Szkarłatny Trop' });
    pinButton.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      const raw = sessionStorage.getItem(`session-live-${session.id}`);
      const parsed = raw ? (JSON.parse(raw) as { openCardIds?: string[] }) : null;
      expect(parsed?.openCardIds).toContain(thread.id);
    });

    await user.click(screen.getByRole('button', { name: 'Szybki podgląd: Szkarłatny Trop' }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('heading', { name: 'Szkarłatny Trop' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const unpinButton = await screen.findByRole('button', { name: 'Odepnij ze sceny: Szkarłatny Trop' });
    unpinButton.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      const raw = sessionStorage.getItem(`session-live-${session.id}`);
      const parsed = raw ? (JSON.parse(raw) as { openCardIds?: string[] }) : null;
      expect(parsed?.openCardIds ?? []).not.toContain(thread.id);
    });
  });
});
