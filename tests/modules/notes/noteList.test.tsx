import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { NoteList } from '@modules/notes/components/NoteList';
import { BACKSTAGE_SCENARIO_NOTE_KIND, isNote } from '@modules/notes/types';
import { addEntity } from '@shared/db/operations';

const TEST_ID = '__note-list__';
const db = openCampaignDb(TEST_ID);

function renderNoteList() {
  return render(
    <CampaignProvider>
      <MemoryRouter>
        <NoteList />
      </MemoryRouter>
    </CampaignProvider>,
  );
}

describe('NoteList', () => {
  beforeEach(async () => {
    setActiveCampaignId(TEST_ID);
    saveCampaign({
      id: TEST_ID,
      name: 'Note List Test',
      description: '',
      createdAt: new Date().toISOString(),
    });
    await db.entities.clear();
    await db.relations.clear();
  });

  it('creates a manual note from the notes menu', async () => {
    const user = userEvent.setup();

    renderNoteList();

    await user.click(await screen.findByRole('button', { name: 'Nowa notatka' }));
    await user.type(
      screen.getByPlaceholderText('Zapisz ustalenie, pomysł albo rzecz do sprawdzenia...'),
      'Po sesji dopisać konsekwencje decyzji rady.',
    );
    await user.click(screen.getByRole('button', { name: 'Dodaj notatkę' }));

    await waitFor(async () => {
      const notes = await db.entities.where('type').equals('note').toArray();
      expect(notes).toHaveLength(1);
      const note = notes[0];
      expect(note).toBeDefined();
      expect(isNote(note!)).toBe(true);
      expect(note!.data.content).toBe('Po sesji dopisać konsekwencje decyzji rady.');
      expect(note!.data.sessionId).toBe('');
      expect(note!.data.cleanupDecision).toBe('keep');
    });
  });

  it('does not show the backstage scenario in the notes menu', async () => {
    await addEntity(db, {
      type: 'note',
      name: 'Scenariusz',
      description: '<h2>Scena 1</h2><p>Ukryta treść</p>',
      tags: [],
      data: {
        kind: BACKSTAGE_SCENARIO_NOTE_KIND,
        content: 'Ukryta treść',
        sessionId: '',
        createdAt: '2024-01-01T10:00:00Z',
        cleanupDecision: 'keep',
        scenes: [],
      },
    });

    renderNoteList();

    expect(await screen.findByText('Brak notatek')).toBeInTheDocument();
    expect(screen.queryByText('Scenariusz')).not.toBeInTheDocument();
  });
});
