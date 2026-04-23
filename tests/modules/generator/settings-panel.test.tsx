import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GeneratorSettingsPanel } from '@modules/settings/components/GeneratorSettingsPanel';

const saveGeneratorPackMock = vi.fn(async () => undefined);
const importGeneratorPacksMock = vi.fn(async () => undefined);

vi.mock('@modules/generator/repository', async () => {
  const actual = await vi.importActual<object>('@modules/generator/repository');
  return {
    ...actual,
    saveGeneratorPack: (...args: unknown[]) => saveGeneratorPackMock(...args),
    importGeneratorPacks: (...args: unknown[]) => importGeneratorPacksMock(...args),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const packs = [
  {
    id: 'pack-1',
    campaignId: 'camp-1',
    name: 'Pack One',
    description: '',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tables: [
      {
        id: 'table-1',
        name: 'Rumors',
        type: 'custom:rumors',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        entries: [{ id: 'entry-1', value: 'Plotka', weight: 1, tags: ['city'], isActive: true }],
      },
    ],
  },
];

describe('GeneratorSettingsPanel', () => {
  beforeEach(() => {
    saveGeneratorPackMock.mockClear();
    importGeneratorPacksMock.mockClear();
    vi.unstubAllGlobals();
  });

  it('creates a custom table and validates input', async () => {
    render(<GeneratorSettingsPanel db={{} as never} campaignId="camp-1" generatorPacks={packs} />);

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'pack-1' } });
    fireEvent.change(screen.getByPlaceholderText('Nowa tabela...'), { target: { value: 'Secrets' } });
    fireEvent.change(screen.getByPlaceholderText('custom:nazwa'), { target: { value: 'secrets' } });
    fireEvent.click(screen.getByText('Dodaj'));

    await waitFor(() => {
      expect(saveGeneratorPackMock).toHaveBeenCalledTimes(1);
    });
  });

  it('supports import preview and apply for JSON', async () => {
    render(<GeneratorSettingsPanel db={{} as never} campaignId="camp-1" generatorPacks={packs} />);

    fireEvent.change(screen.getByPlaceholderText('{"packs":[...]}'), {
      target: {
        value:
          '{"packs":[{"id":"p2","campaignId":"camp-1","name":"Imported","description":"","isActive":true,"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z","tables":[]}]}',
      },
    });
    fireEvent.click(screen.getByText('Podglad'));
    fireEvent.click(screen.getByText('Zastosuj import'));

    await waitFor(() => {
      expect(importGeneratorPacksMock).toHaveBeenCalledTimes(1);
    });
  });

  it('asks for confirmation before replace import', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    render(<GeneratorSettingsPanel db={{} as never} campaignId="camp-1" generatorPacks={packs} />);

    fireEvent.change(screen.getByPlaceholderText('{"packs":[...]}'), {
      target: {
        value:
          '{"packs":[{"id":"p3","campaignId":"camp-1","name":"Imported","description":"","isActive":true,"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z","tables":[]}]}',
      },
    });
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'replace' } });
    fireEvent.click(screen.getByText('Zastosuj import'));

    await waitFor(() => {
      expect(importGeneratorPacksMock).not.toHaveBeenCalled();
    });
  });

  it('does not apply import when payload is invalid JSON', async () => {
    render(<GeneratorSettingsPanel db={{} as never} campaignId="camp-1" generatorPacks={packs} />);

    fireEvent.change(screen.getByPlaceholderText('{"packs":[...]}'), {
      target: { value: '{"packs":[}' },
    });
    fireEvent.click(screen.getByText('Zastosuj import'));

    await waitFor(() => {
      expect(importGeneratorPacksMock).not.toHaveBeenCalled();
    });
    expect(screen.getAllByText(/Nieprawidlowy JSON/).length).toBeGreaterThan(0);
  });
});

