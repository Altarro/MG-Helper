import type { Entity } from '@shared/types/entity';

export const DEFAULT_CLUE_TYPES = ['character', 'location', 'event', 'item'] as const;
export const CLUE_TYPES = DEFAULT_CLUE_TYPES;
export type DefaultClueType = (typeof DEFAULT_CLUE_TYPES)[number];
export type ClueType = DefaultClueType | `custom:${string}`;

export const CLUE_TYPE_LABELS: Record<string, string> = {
  character: 'Postać',
  location: 'Lokacja',
  event: 'Zdarzenie',
  item: 'Przedmiot',
};

export function getClueTypeLabel(clueType: ClueType): string {
  if ((CLUE_TYPES as readonly string[]).includes(clueType)) return CLUE_TYPE_LABELS[clueType] ?? clueType;
  return clueType.startsWith('custom:') ? clueType.slice('custom:'.length) : clueType;
}

export interface ClueData {
  // Clue is an atomic piece of information. It may stay free or point to a story object.
  clueTypes: ClueType[];
  // Backward compatibility for older records and imports.
  clueType?: ClueType;
  hint: string;
  discovered: boolean;
}

export type Clue = Entity & { type: 'clue'; data: ClueData };

export function normalizeClueTypes(raw: unknown): ClueType[] {
  const fromArray = Array.isArray(raw)
    ? raw.filter(
        (value): value is ClueType =>
          typeof value === 'string' &&
          ((CLUE_TYPES as readonly string[]).includes(value) || value.startsWith('custom:')),
      )
    : [];
  const unique = [...new Set(fromArray)];
  return unique.length > 0 ? unique : ['event'];
}

export function getPrimaryClueType(data: Partial<ClueData> | Record<string, unknown>): ClueType {
  if (Array.isArray(data.clueTypes)) {
    const normalized = normalizeClueTypes(data.clueTypes);
    if (normalized.length > 0) return normalized[0] ?? 'event';
  }
  if (
    typeof data.clueType === 'string' &&
    ((CLUE_TYPES as readonly string[]).includes(data.clueType) || data.clueType.startsWith('custom:'))
  ) {
    return data.clueType as ClueType;
  }
  return 'event';
}

export function normalizeClueData(data: Record<string, unknown>): ClueData {
  const clueTypes: ClueType[] = Array.isArray(data.clueTypes)
    ? normalizeClueTypes(data.clueTypes)
    : typeof data.clueType === 'string' &&
        ((CLUE_TYPES as readonly string[]).includes(data.clueType) || data.clueType.startsWith('custom:'))
      ? [data.clueType as ClueType]
      : ['event'];
  return {
    ...data,
    clueType: clueTypes[0],
    clueTypes,
    hint: typeof data.hint === 'string' ? data.hint : '',
    discovered: data.discovered === true,
  };
}

export function toClue(entity: Entity): Clue | null {
  if (entity.type !== 'clue') return null;
  const normalizedData = normalizeClueData(entity.data as Record<string, unknown>);
  return {
    ...entity,
    type: 'clue',
    data: normalizedData as Record<string, unknown> & ClueData,
  };
}

export function isClue(entity: Entity): entity is Clue {
  return entity.type === 'clue';
}
