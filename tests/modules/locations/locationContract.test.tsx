import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { LocationForm } from '@modules/locations/components/LocationForm';
import { createLocationData } from '@modules/locations/types';
import { useLocations } from '@modules/locations/hooks/useLocations';

vi.mock('@modules/locations/hooks/useLocations', () => ({
  useLocations: vi.fn(),
}));

vi.mock('@shared/components/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe('location contract smoke checks', () => {
  beforeEach(() => {
    vi.mocked(useLocations).mockReturnValue([]);
  });

  it('createLocationData fills default senses and does not carry parentId', () => {
    const data = createLocationData({ locationType: 'city', danger: 2 });

    expect(data).toEqual({
      locationType: 'city',
      danger: 2,
      senses: {
        see: '',
        hear: '',
        smell: '',
        feel: '',
      },
    });
    expect(data).not.toHaveProperty('parentId');
  });

  it('submits locked parent id for child location creation without showing parent picker', async () => {
    const parent = {
      id: 'parent-1',
      type: 'location',
      name: 'Miasto',
      description: '',
      tags: [],
      data: createLocationData({ locationType: 'city' }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;

    const onSubmit = vi.fn();
    renderWithProviders(
      <LocationForm
        lockedParentId={parent.id}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText(/Relacja nadrzedna zostanie ustawiona automatycznie/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nazwa/i), {
      target: { value: 'Wieza' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].parentLocationId).toBe(parent.id);
    expect(onSubmit.mock.calls[0][0].name).toBe('Wieza');
  });

  it('shows the current parent in the select when location options arrive after render', async () => {
    const parent = {
      id: 'parent-1',
      type: 'location',
      name: 'Miasto',
      description: '',
      tags: [],
      data: createLocationData({ locationType: 'city' }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;

    vi.mocked(useLocations).mockReturnValue(undefined);

    const view = renderWithProviders(
      <LocationForm
        defaultValues={{
          name: 'Wieza',
          parentLocationId: parent.id,
        }}
        onSubmit={vi.fn()}
      />,
    );

    vi.mocked(useLocations).mockReturnValue([parent]);
    view.rerender(
      <LocationForm
        defaultValues={{
          name: 'Wieza',
          parentLocationId: parent.id,
        }}
        onSubmit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Lokacja nadrzędna/i)).toHaveValue(parent.id);
    });
  });
});
