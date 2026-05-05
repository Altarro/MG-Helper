export const GENERATOR_SYSTEM_TABLE_TYPES = [
  'firstName',
  'lastName',
  'nickname',
  'locationType',
  'locationName',
  'event',
] as const;

export type GeneratorSystemTableType = (typeof GENERATOR_SYSTEM_TABLE_TYPES)[number];

export const GENERATOR_COMPOSITE_KINDS = [
  'character',
  'location',
  'eventTable',
  'customTable',
] as const;

export type GeneratorCompositeKind = (typeof GENERATOR_COMPOSITE_KINDS)[number];

export interface GeneratorEntry {
  id: string;
  value: string;
  weight: number;
  tags: string[];
  isActive: boolean;
}

export interface GeneratorTable {
  id: string;
  name: string;
  type: GeneratorSystemTableType | `custom:${string}`;
  entries: GeneratorEntry[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratorPack {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  isActive: boolean;
  tables: GeneratorTable[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneratorRollResult {
  id: string;
  packId: string;
  kind: GeneratorCompositeKind;
  sourceTableIds: string[];
  resultText: string;
  createdAt: string;
}

export interface GeneratorRollEngineOptions {
  seed?: string | number;
  withoutRepetition?: boolean;
  previousEntryIds?: string[];
  evo?: {
    enabled?: boolean;
    /** Kontekst kampanii/sesji, np. tagi aktywnych encji. */
    contextTags?: string[];
    /** Ostatnie wyniki losowań, żeby promować świeżość. */
    previousResults?: string[];
    /** 0..1 — im wyżej, tym częściej mutacje/eksploracja. */
    explorationRate?: number;
    /** Liczba kroków selekcji; małe wartości dla wydajności UI. */
    generations?: number;
  };
}

export interface GeneratorRollLog {
  id: string;
  campaignId: string;
  sessionId?: string | null;
  packId: string;
  kind: GeneratorCompositeKind;
  resultText: string;
  sourceTableIds: string[];
  createdAt: string;
}

export interface GeneratorCsvRow {
  value: string;
  weight?: number;
  tags?: string[];
}

export interface GeneratorJsonImportPayload {
  packs: GeneratorPack[];
}

