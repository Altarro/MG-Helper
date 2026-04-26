import { describe, expect, it } from 'vitest';
import type { Entity } from '@shared/types/entity';
import {
  deriveLifecycleStatus,
  normalizeImportedEntityLifecycle,
  withLifecycleStatus,
} from '@shared/types/entityLifecycle';

describe('deriveLifecycleStatus', () => {
  it('returns explicit active or completed', () => {
    expect(deriveLifecycleStatus('active')).toBe('active');
    expect(deriveLifecycleStatus('completed')).toBe('completed');
  });

  it('defaults to active when missing or invalid', () => {
    expect(deriveLifecycleStatus(undefined)).toBe('active');
    expect(deriveLifecycleStatus('bogus' as never)).toBe('active');
  });
});

describe('withLifecycleStatus', () => {
  it('sets status and strips legacy boolean fields', () => {
    const base = {
      instinct: 'x',
      isDead: true,
      isDestroyed: true,
      isDisbanded: true,
    };
    const out = withLifecycleStatus(base, 'active');
    expect(out.status).toBe('active');
    expect(out).not.toHaveProperty('isDead');
    expect(out).not.toHaveProperty('isDestroyed');
    expect(out).not.toHaveProperty('isDisbanded');
    expect((out as { instinct: string }).instinct).toBe('x');
  });
});

function entityOf(type: Entity['type'], data: Record<string, unknown>): Entity {
  return {
    id: 'e1',
    type,
    name: 'Test',
    description: '',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    data,
  };
}

describe('normalizeImportedEntityLifecycle', () => {
  it('leaves non-lifecycle entity types unchanged', () => {
    const threat = entityOf('threat', { impulse: 'x', moves: [] });
    expect(normalizeImportedEntityLifecycle(threat)).toEqual(threat);
  });

  it('removes legacy flags; uses explicit status when valid', () => {
    const npc = entityOf('npc', { instinct: 'i', isDead: true, status: 'completed' });
    const out = normalizeImportedEntityLifecycle(npc);
    expect((out.data as { status?: string; isDead?: boolean }).status).toBe('completed');
    expect((out.data as { isDead?: boolean }).isDead).toBeUndefined();
  });

  it('removes legacy flags without inferring completed from bool alone', () => {
    const npc = entityOf('npc', { instinct: 'i', isDead: true });
    const out = normalizeImportedEntityLifecycle(npc);
    expect((out.data as { status?: string }).status).toBe('active');
    expect((out.data as { isDead?: boolean }).isDead).toBeUndefined();
  });

  it('strips faction/location/item legacy keys', () => {
    const f = entityOf('faction', { goals: [], resources: [], isDisbanded: true });
    const fOut = normalizeImportedEntityLifecycle(f);
    expect((fOut.data as { status?: string; isDisbanded?: boolean }).status).toBe('active');
    expect((fOut.data as { isDisbanded?: boolean }).isDisbanded).toBeUndefined();

    const loc = entityOf('location', { locationType: 'city', isDestroyed: true });
    const locOut = normalizeImportedEntityLifecycle(loc);
    expect((locOut.data as { status?: string }).status).toBe('active');

    const item = entityOf('item', { itemType: 'misc', properties: [], isDestroyed: true });
    const itemOut = normalizeImportedEntityLifecycle(item);
    expect((itemOut.data as { status?: string }).status).toBe('active');
  });

  it('sets active when no status', () => {
    const npc = entityOf('npc', { instinct: 'i' });
    const out = normalizeImportedEntityLifecycle(npc);
    expect((out.data as { status?: string }).status).toBe('active');
  });

  it('when status is explicit, strips legacy flags only', () => {
    const npc = entityOf('npc', {
      instinct: 'i',
      status: 'active',
      isDead: true,
    });
    const out = normalizeImportedEntityLifecycle(npc);
    expect((out.data as { status: string }).status).toBe('active');
    expect((out.data as { isDead?: boolean }).isDead).toBeUndefined();
  });

  it('coerces invalid status to active', () => {
    const npc = entityOf('npc', { instinct: 'i', status: 'pending' });
    const out = normalizeImportedEntityLifecycle(npc);
    expect((out.data as { status: string }).status).toBe('active');
  });
});
