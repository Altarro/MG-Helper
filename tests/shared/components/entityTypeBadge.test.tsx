import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EntityTypeBadge } from '@shared/components/EntityTypeBadge';

describe('EntityTypeBadge', () => {
  it('renders as clickable control when onClick is provided', () => {
    const onClick = vi.fn();

    render(
      <EntityTypeBadge
        type="threat"
        onClick={onClick}
        ariaLabel="Otworz detail zagrozenia"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Otworz detail zagrozenia' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
