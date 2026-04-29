import { describe, expect, it } from 'vitest';
import { parseGeneratorCsv, parseGeneratorJson } from '@modules/generator/importFormats';

describe('generator import formats', () => {
  it('accepts json payload with single pack via auto-wrap', () => {
    const parsed = parseGeneratorJson({
      pack: {
        id: 'pack-1',
        campaignId: 'camp-1',
        name: 'Pack',
        description: '',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        tables: [],
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.packs).toHaveLength(1);
    expect(parsed.data.packs[0]?.name).toBe('Pack');
  });

  it('rejects csv row with tag longer than max', () => {
    const longTag = 'x'.repeat(41);
    const parsed = parseGeneratorCsv(`value,weight,tags\nEntry,1,${longTag}`);

    expect(parsed.ok).toBe(false);
    expect(parsed.errors[0]).toContain('przekracza 40 znakow');
  });
});

