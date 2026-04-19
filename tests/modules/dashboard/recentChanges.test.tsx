import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { RecentChanges } from '@modules/dashboard/components/RecentChanges';
import type { Entity } from '@shared/types/entity';

const threatEntity: Entity = {
  id: 'threat-123',
  type: 'threat',
  name: 'Kupieni Radni',
  description: '',
  tags: [],
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-13T12:00:00.000Z',
  data: {},
};

describe('RecentChanges', () => {
  it('links threats to dedicated threat detail routes', () => {
    render(
      <MemoryRouter>
        <RecentChanges entities={[threatEntity]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Kupieni Radni/i })).toHaveAttribute(
      'href',
      '/threats/threat-123',
    );
  });
});
