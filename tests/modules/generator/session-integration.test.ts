import { describe, expect, it, vi } from 'vitest';
import { createLocationFromRoll } from '@modules/generator/sessionIntegration';

const addEntityMock = vi.fn();
const addRelationMock = vi.fn();

vi.mock('@shared/db/operations', () => ({
  addEntity: (...args: unknown[]) => addEntityMock(...args),
  addRelation: (...args: unknown[]) => addRelationMock(...args),
}));

vi.mock('@modules/locations/types', () => ({
  createLocationData: (input: unknown) => input,
}));

function createFakeDb() {
  return {
    entities: {
      where: () => ({
        anyOf: () => ({
          toArray: async () => [],
        }),
      }),
    },
    relations: {
      where: () => ({
        equals: () => ({
          filter: () => ({
            toArray: async () => [],
          }),
        }),
      }),
    },
    transaction: vi.fn(async (_mode: string, _entities: unknown, _relations: unknown, cb: () => Promise<unknown>) => cb()),
  };
}

describe('sessionIntegration', () => {
  it('preserves location name after first ":" separator', async () => {
    const db = createFakeDb();
    addEntityMock.mockResolvedValueOnce({
      id: 'loc-1',
      type: 'location',
      name: 'Rynek: Stara Dzielnica',
      tags: [],
      description: '',
      data: {},
    });
    addRelationMock.mockResolvedValueOnce(undefined);

    await createLocationFromRoll({
      db: db as never,
      sessionId: 'session-1',
      roll: {
        id: 'roll-1',
        packId: 'pack-1',
        kind: 'location',
        sourceTableIds: [],
        resultText: 'Miasto: Rynek: Stara Dzielnica',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });

    expect(addEntityMock).toHaveBeenCalledTimes(1);
    const payload = addEntityMock.mock.calls[0]?.[1] as { name: string };
    expect(payload.name).toBe('Rynek: Stara Dzielnica');
  });

  it('runs location creation in a transaction', async () => {
    const db = createFakeDb();
    addEntityMock.mockResolvedValueOnce({
      id: 'loc-2',
      type: 'location',
      name: 'Port',
      tags: [],
      description: '',
      data: {},
    });
    addRelationMock.mockResolvedValueOnce(undefined);

    await createLocationFromRoll({
      db: db as never,
      sessionId: 'session-1',
      roll: {
        id: 'roll-2',
        packId: 'pack-1',
        kind: 'location',
        sourceTableIds: [],
        resultText: 'Port',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
  });
});

