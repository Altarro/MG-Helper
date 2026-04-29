import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { addEntity, addRelation } from '@shared/db/operations';
import { SessionCluesPanel } from '@modules/sessions/components/SessionCluesPanel';

const TEST_ID = '__session-clues-panel__';
const db = openCampaignDb(TEST_ID);

function renderInCampaign(ui: React.ReactElement) {
  return render(
    <CampaignProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </CampaignProvider>,
  );
}

describe('SessionCluesPanel', () => {
  beforeEach(async () => {
    setActiveCampaignId(TEST_ID);
    saveCampaign({
      id: TEST_ID,
      name: 'Session Clues',
      description: '',
      createdAt: new Date().toISOString(),
    });
    await db.entities.clear();
    await db.relations.clear();
  });

  it('groups clues by threat and keeps free clues section', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja Clues',
      description: '',
      tags: [],
      data: { number: 1, date: '2026-04-24', summary: '' },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Czarny Kult',
      description: '',
      tags: [],
      data: { kind: 'danger' },
    });
    const linkedClue = await addEntity(db, {
      type: 'clue',
      name: 'Czarna pieczec',
      description: '',
      tags: [],
      data: { discovered: true, hint: 'Znak na drzwiach' },
    });
    const freeClue = await addEntity(db, {
      type: 'clue',
      name: 'Szmer w kanale',
      description: '',
      tags: [],
      data: { discovered: false, hint: '' },
    });

    await addRelation(db, { type: 'appears_in', sourceId: threat.id, targetId: session.id });
    await addRelation(db, { type: 'appears_in', sourceId: linkedClue.id, targetId: session.id });
    await addRelation(db, { type: 'appears_in', sourceId: freeClue.id, targetId: session.id });
    await addRelation(db, { type: 'clues_for', sourceId: linkedClue.id, targetId: threat.id });

    renderInCampaign(<SessionCluesPanel sessionId={session.id} />);

    expect(await screen.findByText('Czarna pieczec')).toBeInTheDocument();
    expect(screen.getByText('Zagrożenie')).toBeInTheDocument();
    expect(screen.getByText('Wolne')).toBeInTheDocument();
    expect(screen.getByText('Szmer w kanale')).toBeInTheDocument();
  });
});

