import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { BackstagePage } from '@modules/backstage/components/BackstagePage';
import { isBackstageScenarioNote } from '@modules/notes/types';

vi.mock('@shared/components/RichTextEditor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    onBlur,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="Treść sceny"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  ),
}));

const TEST_ID = '__backstage-scenario__';
const db = openCampaignDb(TEST_ID);

function renderBackstage() {
  return render(
    <CampaignProvider>
      <MemoryRouter>
        <BackstagePage />
      </MemoryRouter>
    </CampaignProvider>,
  );
}

async function getScenarioNote() {
  return db.entities
    .where('type')
    .equals('note')
    .filter(isBackstageScenarioNote)
    .first();
}

describe('Backstage scenario', () => {
  beforeEach(async () => {
    setActiveCampaignId(TEST_ID);
    saveCampaign({
      id: TEST_ID,
      name: 'Backstage Scenario Test',
      description: '',
      createdAt: new Date().toISOString(),
    });
    await db.entities.clear();
    await db.relations.clear();
  });

  it('shows Scenariusz as the first tab with preview selected by default', async () => {
    renderBackstage();

    const tabs = await screen.findAllByRole('tab');
    expect(tabs[0]).toHaveTextContent('Scenariusz');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('button', { name: 'Podgląd całości' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Napisz scenariusz swojej kampanii')).toBeInTheDocument();
  });

  it('edits scenes, saves rich text data, previews the whole scenario and deletes with confirmation', async () => {
    const user = userEvent.setup();
    renderBackstage();

    await user.click(await screen.findByRole('button', { name: 'Dodaj pierwszą scenę' }));
    const titleInput = await screen.findByLabelText('Tytuł sceny');
    await user.clear(titleInput);
    await user.type(titleInput, 'Prolog');
    fireEvent.blur(titleInput);

    const editor = screen.getByLabelText('Treść sceny');
    await user.clear(editor);
    await user.type(editor, 'Mgła nad miastem.');
    fireEvent.blur(editor);

    await waitFor(async () => {
      const note = await getScenarioNote();
      expect(note).toBeDefined();
      const scenes = note!.data.scenes as Array<{ title: string; content: string; sortOrder: number }>;
      expect(scenes[0]?.title).toBe('Prolog');
      expect(scenes[0]?.content).toContain('Mgła nad miastem');
      expect(scenes[0]?.sortOrder).toBe(0);
      expect(note!.description).toContain('<h2>Prolog</h2>');
      expect(note!.data.cleanupDecision).toBe('keep');
    });

    await user.click(screen.getByRole('button', { name: 'Dodaj scenę' }));
    const secondTitleInput = screen.getByLabelText('Tytuł sceny');
    await user.clear(secondTitleInput);
    await user.type(secondTitleInput, 'Rozdział drugi');
    fireEvent.blur(secondTitleInput);

    await waitFor(async () => {
      const note = await getScenarioNote();
      const scenes = note!.data.scenes as Array<{ title: string }>;
      expect(scenes.map((scene) => scene.title)).toEqual(['Prolog', 'Rozdział drugi']);
    });

    await user.click(screen.getByRole('button', { name: 'Podgląd całości' }));
    expect(await screen.findByRole('heading', { name: 'Prolog' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rozdział drugi' })).toBeInTheDocument();
    expect(screen.getByText('Mgła nad miastem.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edycja' }));
    await user.click(screen.getByRole('button', { name: /Rozdział drugi/ }));
    await user.click(screen.getByRole('button', { name: 'Usuń scenę' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Usuń scenę' }));

    await waitFor(async () => {
      const note = await getScenarioNote();
      const scenes = note!.data.scenes as Array<{ title: string }>;
      expect(scenes.map((scene) => scene.title)).toEqual(['Prolog']);
    }, { timeout: 3000 });
  });
});
