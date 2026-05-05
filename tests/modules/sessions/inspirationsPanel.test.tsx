import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { SessionInspirationsPanel } from '@modules/sessions/components/SessionInspirationsPanel';

const createSessionNoteFromRollMock = vi.fn(async () => undefined);
const createNpcFromRollMock = vi.fn(async () => ({ id: 'npc-1', name: 'Ada Lis', type: 'npc' }));
const appendGeneratorRollLogMock = vi.fn(async () => undefined);
const rollMock = vi.fn();
const rollAgainMock = vi.fn();
const submitGeneratorFeedbackMock = vi.fn();
const trackGeneratorEventMock = vi.fn();

let mockedLastRoll: {
  id: string;
  packId: string;
  kind: 'character' | 'location' | 'eventTable' | 'customTable';
  sourceTableIds: string[];
  resultText: string;
  createdAt: string;
} | null = null;

vi.mock('@shared/db/CampaignContext', () => ({
  useCampaign: () => ({ db: {}, campaignId: 'camp-1' }),
}));

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => [],
}));

vi.mock('@modules/generator/repository', () => ({
  appendGeneratorRollLog: (...args: unknown[]) => appendGeneratorRollLogMock(...args),
}));

vi.mock('@modules/generator/telemetry', () => ({
  submitGeneratorFeedback: (...args: unknown[]) => submitGeneratorFeedbackMock(...args),
  trackGeneratorEvent: (...args: unknown[]) => trackGeneratorEventMock(...args),
}));

vi.mock('@modules/generator/hooks/useGeneratorPacks', () => ({
  useGeneratorPacks: () => ({
    activePack: { id: 'pack-1', name: 'Pack' },
    filteredCustomTables: [{ id: 'custom-1', name: 'Plotki' }],
    getTableById: () => ({ name: 'Plotki' }),
    isBootstrapping: false,
    bootstrapDefaultPack: vi.fn(async () => undefined),
  }),
}));

vi.mock('@modules/generator/hooks/useGeneratorRoll', () => ({
  useGeneratorRoll: () => ({
    mode: 'character',
    setMode: vi.fn(),
    customTableId: '',
    setCustomTableId: vi.fn(),
    seed: '',
    setSeed: vi.fn(),
    withoutRepetition: false,
    setWithoutRepetition: vi.fn(),
    evoEnabled: true,
    setEvoEnabled: vi.fn(),
    evoContextTags: [],
    setEvoContextTags: vi.fn(),
    isCommitting: false,
    lastRoll: mockedLastRoll,
    rollHistory: mockedLastRoll ? [mockedLastRoll] : [],
    roll: rollMock,
    preview: () => mockedLastRoll,
    rollAgain: rollAgainMock,
    modeIconName: 'character',
  }),
}));

vi.mock('@modules/generator/sessionIntegration', () => ({
  createSessionNoteFromRoll: (...args: unknown[]) => createSessionNoteFromRollMock(...args),
  createNpcFromRoll: (...args: unknown[]) => createNpcFromRollMock(...args),
  createLocationFromRoll: vi.fn(async () => ({ id: 'loc-1', name: 'Port' })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SessionInspirationsPanel', () => {
  beforeEach(() => {
    mockedLastRoll = null;
    createSessionNoteFromRollMock.mockClear();
    createNpcFromRollMock.mockClear();
    appendGeneratorRollLogMock.mockClear();
    rollMock.mockClear();
    rollAgainMock.mockClear();
    submitGeneratorFeedbackMock.mockClear();
    trackGeneratorEventMock.mockClear();
  });

  it('supports flow roll result -> session note', async () => {
    mockedLastRoll = {
      id: 'roll-1',
      packId: 'pack-1',
      kind: 'eventTable',
      sourceTableIds: ['custom-1'],
      resultText: 'Alarm na rynku',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SessionInspirationsPanel sessionId="session-1" currentLocationId={null} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Dodaj do notatki sesji' }));

    expect(createSessionNoteFromRollMock).toHaveBeenCalledTimes(1);
  });

  it('supports flow roll result -> entity creation for character', async () => {
    mockedLastRoll = {
      id: 'roll-2',
      packId: 'pack-1',
      kind: 'character',
      sourceTableIds: ['custom-1'],
      resultText: 'Ada Lis Kowal',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SessionInspirationsPanel sessionId="session-1" currentLocationId="loc-1" />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Utworz encje z wyniku' }));

    expect(createNpcFromRollMock).toHaveBeenCalledTimes(1);
  });

  it('submits feedback directly from inspirations panel', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SessionInspirationsPanel sessionId="session-feedback" currentLocationId={null} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Feedback o inspiracjach/i }));
    await user.selectOptions(screen.getByDisplayValue('UX'), 'quality');
    await user.selectOptions(screen.getByDisplayValue('4/5'), '5');
    await user.type(
      screen.getByPlaceholderText('Co najbardziej przeszkadza w panelu Inspiracje?'),
      'Bardzo przydatne podczas impro.',
    );
    await user.click(screen.getByRole('button', { name: 'Wyslij feedback' }));

    expect(submitGeneratorFeedbackMock).toHaveBeenCalledTimes(1);
    expect(trackGeneratorEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'generator_feedback_submitted', sessionId: 'session-feedback' }),
    );
  });
});

