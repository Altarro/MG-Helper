import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GeneratorSettingsPanel } from '@modules/settings/components/GeneratorSettingsPanel';

const saveGeneratorPackMock = vi.fn(async () => undefined);

vi.mock('@modules/generator/repository', async () => {
  const actual = await vi.importActual<object>('@modules/generator/repository');
  return {
    ...actual,
    saveGeneratorPack: (...args: unknown[]) => saveGeneratorPackMock(...args),
    importGeneratorPacks: vi.fn(async () => undefined),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('generator UX smoke', () => {
  it('runs basic editor flow without crash', async () => {
    render(
      <GeneratorSettingsPanel
        db={{} as never}
        campaignId="camp-1"
        generatorPacks={[
          {
            id: 'pack-1',
            campaignId: 'camp-1',
            name: 'Smoke Pack',
            description: '',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            tables: [],
          },
        ]}
      />,
    );

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'pack-1' } });
    fireEvent.change(screen.getByPlaceholderText('Nowa tabela...'), { target: { value: 'Smoke Table' } });
    fireEvent.change(screen.getByPlaceholderText('custom:nazwa'), { target: { value: 'smoke' } });
    fireEvent.click(screen.getByText('Dodaj'));

    await waitFor(() => {
      expect(saveGeneratorPackMock).toHaveBeenCalled();
    });
  });
});

