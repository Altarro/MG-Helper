import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TickProgress } from '@shared/components/TickProgress';

describe('TickProgress', () => {
  it('shows only the next label when no segments are filled', () => {
    render(
      <TickProgress
        tickLabels={['Pierwszy niestabilny blysk nad portem', 'Drugi blysk nad portem']}
        filled={0}
        segments={2}
      />,
    );

    expect(screen.queryByText(/Teraz:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Następnie:/)).toBeInTheDocument();
    expect(screen.getByText('Pierwszy niestabilny blysk nad portem')).toBeInTheDocument();
  });

  it('shows current and next labels when progress is in the middle', () => {
    render(
      <TickProgress
        tickLabels={['Pierwszy', 'Drugi', 'Trzeci']}
        filled={1}
        segments={3}
      />,
    );

    expect(screen.getByText(/Teraz:/)).toBeInTheDocument();
    expect(screen.getByText(/Następnie:/)).toBeInTheDocument();
    expect(screen.getByText('Pierwszy')).toBeInTheDocument();
    expect(screen.getByText('Drugi')).toBeInTheDocument();
  });

  it('shows only the current label when the clock is complete', () => {
    render(
      <TickProgress
        tickLabels={['Pierwszy', 'Drugi', 'Trzeci']}
        filled={3}
        segments={3}
      />,
    );

    expect(screen.getByText(/Teraz:/)).toBeInTheDocument();
    expect(screen.getByText('Trzeci')).toBeInTheDocument();
    expect(screen.queryByText(/Następnie:/)).not.toBeInTheDocument();
  });
});
