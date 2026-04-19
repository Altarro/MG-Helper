import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClockVisual } from '@modules/clocks/components/ClockVisual';
import { isCompleted, isClock } from '@modules/clocks/types';
import { addEntity, updateEntity } from '@shared/db/operations';
import { db } from '@shared/db/database';
import type { Clock } from '@modules/clocks/types';

// ── ClockVisual ───────────────────────────────────────────────────────────────

describe('ClockVisual', () => {
  it('renders correct number of path segments', () => {
    const { container } = render(<ClockVisual segments={6} filled={0} />);
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(6);
  });

  it('renders correct number of segments for 12-segment clock', () => {
    const { container } = render(<ClockVisual segments={12} filled={0} />);
    expect(container.querySelectorAll('path')).toHaveLength(12);
  });

  it('shows filled/total in aria-label', () => {
    render(<ClockVisual segments={6} filled={3} />);
    expect(
      screen.getByLabelText('Zegar: 3 z 6 segmentów wypełnionych'),
    ).toBeInTheDocument();
  });

  it('calls onTick with incremented value when next segment clicked', () => {
    const onTick = vi.fn();
    const { container } = render(<ClockVisual segments={6} filled={2} onTick={onTick} />);
    // segment index 2 is the next unfilled segment
    const paths = container.querySelectorAll('path');
    fireEvent.click(paths[2]);
    expect(onTick).toHaveBeenCalledWith(3);
  });

  it('calls onTick with decremented value when last filled segment clicked', () => {
    const onTick = vi.fn();
    const { container } = render(<ClockVisual segments={6} filled={3} onTick={onTick} />);
    // segment index 2 is the last filled (0-based)
    const paths = container.querySelectorAll('path');
    fireEvent.click(paths[2]);
    expect(onTick).toHaveBeenCalledWith(2);
  });

  it('does not call onTick when onTick is not provided', () => {
    const { container } = render(<ClockVisual segments={4} filled={1} />);
    const paths = container.querySelectorAll('path');
    // Should not throw
    expect(() => fireEvent.click(paths[1])).not.toThrow();
  });
});

// ── Tick / Reset logic ────────────────────────────────────────────────────────

describe('Clock tick and reset via updateEntity', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  async function createClock(segments: number, filled = 0): Promise<string> {
    const entity = await addEntity(db, {
      type: 'clock',
      name: 'Test Clock',
      description: '',
      tags: [],
      data: { segments, filled },
    });
    return entity.id;
  }

  it('tick increments filled count', async () => {
    const id = await createClock(6, 2);
    await updateEntity(db, id, { data: { segments: 6, filled: 3 } });
    const entity = await db.entities.get(id);
    expect((entity!.data as { filled: number }).filled).toBe(3);
  });

  it('reset sets filled to 0', async () => {
    const id = await createClock(6, 4);
    await updateEntity(db, id, { data: { segments: 6, filled: 0 } });
    const entity = await db.entities.get(id);
    expect((entity!.data as { filled: number }).filled).toBe(0);
  });

  it('isCompleted returns true when filled === segments', async () => {
    const id = await createClock(4, 4);
    const entity = await db.entities.get(id);
    expect(isClock(entity!)).toBe(true);
    expect(isCompleted(entity as Clock)).toBe(true);
  });

  it('isCompleted returns false when not full', async () => {
    const id = await createClock(6, 3);
    const entity = await db.entities.get(id);
    expect(isCompleted(entity as Clock)).toBe(false);
  });
});
