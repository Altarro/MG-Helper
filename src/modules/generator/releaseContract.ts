import type { GeneratorPackRecord } from '@shared/types/generator';

export const REQUIRED_AI_KEYWORDS = [
  'typ tabeli',
  'klimat',
  'domena',
  'tagi osiowe',
  'jezyk',
  'format output',
] as const;

const CONTROLLED_TAG_SYNONYMS: Record<string, string> = {
  cities: 'city',
  citys: 'city',
  miasta: 'city',
  miejski: 'city',
  mrok: 'dark',
  darkfantasy: 'dark',
  fantasydark: 'dark',
  polityczne: 'politics',
  polityka: 'politics',
  intrygi: 'intrigue',
  intryga: 'intrigue',
  ports: 'port',
  porty: 'port',
  dzielnice: 'district',
  dzielnica: 'district',
};

export function getMissingAiKeywords(description: string): string[] {
  const normalized = description.toLowerCase();
  return REQUIRED_AI_KEYWORDS.filter((keyword) => !normalized.includes(keyword));
}

export function normalizeControlledTag(tag: string): string {
  const cleaned = tag.trim().toLowerCase();
  if (!cleaned) return '';
  let singularized = cleaned;
  if (cleaned.endsWith('ies') && cleaned.length > 4) {
    singularized = `${cleaned.slice(0, -3)}y`;
  } else if (cleaned.endsWith('s') && cleaned.length > 3) {
    singularized = cleaned.slice(0, -1);
  }
  return CONTROLLED_TAG_SYNONYMS[singularized] ?? singularized;
}

export function normalizeTagList(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const tag of tags) {
    const next = normalizeControlledTag(tag);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    normalized.push(next);
  }
  return normalized;
}

export function normalizePackTags(pack: GeneratorPackRecord): GeneratorPackRecord {
  return {
    ...pack,
    tables: pack.tables.map((table) => ({
      ...table,
      entries: table.entries.map((entry) => ({
        ...entry,
        tags: normalizeTagList(entry.tags),
      })),
    })),
  };
}

export function validateLinkedTableTagCompatibility(pack: GeneratorPackRecord): string[] {
  const locationTypeTable = pack.tables.find((table) => table.type === 'locationType');
  const locationNameTable = pack.tables.find((table) => table.type === 'locationName');
  if (!locationTypeTable || !locationNameTable) return [];

  const sourceTags = new Set(
    locationTypeTable.entries.flatMap((entry) => entry.tags).map((tag) => normalizeControlledTag(tag)),
  );
  const targetTags = new Set(
    locationNameTable.entries.flatMap((entry) => entry.tags).map((tag) => normalizeControlledTag(tag)),
  );
  if (sourceTags.size === 0 || targetTags.size === 0) return [];

  const hasOverlap = [...sourceTags].some((tag) => targetTags.has(tag));
  if (hasOverlap) return [];

  return [
    'Brak kompatybilnych tagow miedzy tabelami locationType i locationName. Dodaj wspolne tagi osiowe.',
  ];
}

