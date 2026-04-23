import { describe, expect, it } from 'vitest';
import {
  getMissingAiKeywords,
  normalizeTagList,
  validateLinkedTableTagCompatibility,
} from '@modules/generator/releaseContract';

describe('generator release contract', () => {
  it('detects missing required AI keywords', () => {
    const missing = getMissingAiKeywords('klimat: mrok; domena: port');
    expect(missing.length).toBeGreaterThan(0);
    expect(missing).toContain('typ tabeli');
  });

  it('normalizes controlled tag synonyms and plurals', () => {
    const tags = normalizeTagList(['Cities', 'miasta', 'mrok', 'ports', 'PORT']);
    expect(tags).toEqual(['city', 'dark', 'port']);
  });

  it('validates compatibility between locationType and locationName tags', () => {
    const errors = validateLinkedTableTagCompatibility({
      id: 'pack-1',
      campaignId: 'camp-1',
      name: 'Pack',
      description: '',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      tables: [
        {
          id: 't1',
          name: 'locationType',
          type: 'locationType',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          entries: [{ id: 'e1', value: 'Port', weight: 1, tags: ['port'], isActive: true }],
        },
        {
          id: 't2',
          name: 'locationName',
          type: 'locationName',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          entries: [{ id: 'e2', value: 'Czarny Pomost', weight: 1, tags: ['city'], isActive: true }],
        },
      ],
    });
    expect(errors[0]).toContain('locationType i locationName');
  });
});

