import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGeneratorRoll } from '@modules/generator/hooks/useGeneratorRoll';
import type { GeneratorPack } from '@modules/generator/contracts';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const pack: GeneratorPack = {
  id: 'pack-1',
  campaignId: 'camp-1',
  name: 'Pack',
  description: '',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  tables: [
    {
      id: 'first',
      name: 'firstName',
      type: 'firstName',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      entries: [{ id: 'e1', value: 'Ada', weight: 1, tags: [], isActive: true }],
    },
    {
      id: 'nick',
      name: 'nickname',
      type: 'nickname',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      entries: [{ id: 'n1', value: 'Lis', weight: 1, tags: [], isActive: true }],
    },
    {
      id: 'last',
      name: 'lastName',
      type: 'lastName',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      entries: [{ id: 'l1', value: 'Kowal', weight: 1, tags: [], isActive: true }],
    },
  ],
};

describe('useGeneratorRoll', () => {
  it('updates history optimistically before commit resolves', async () => {
    let resolveCommit: (() => void) | null = null;
    const onCommit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCommit = resolve;
        }),
    );
    const { result } = renderHook(() => useGeneratorRoll({ activePack: pack, onCommit }));
    act(() => result.current.rollCharacter());
    expect(result.current.rollHistory.length).toBe(1);
    expect(result.current.isCommitting).toBe(true);
    resolveCommit?.();
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isCommitting).toBe(false);
  });

  it('keeps committing state true until all pending commits finish', async () => {
    let resolveFirst: (() => void) | null = null;
    let resolveSecond: (() => void) | null = null;
    const onCommit = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    const { result } = renderHook(() => useGeneratorRoll({ activePack: pack, onCommit }));

    act(() => {
      result.current.rollCharacter();
      result.current.rollCharacter();
    });
    expect(result.current.isCommitting).toBe(true);

    resolveFirst?.();
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isCommitting).toBe(true);

    resolveSecond?.();
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isCommitting).toBe(false);
  });

  it('rolls back optimistic history on commit error', async () => {
    const onCommit = vi.fn(async () => {
      throw new Error('boom');
    });
    const { result } = renderHook(() => useGeneratorRoll({ activePack: pack, onCommit }));

    act(() => {
      result.current.rollCharacter();
    });
    expect(result.current.rollHistory.length).toBe(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.rollHistory.length).toBe(0);
    expect(result.current.lastRoll).toBeNull();
  });
});

