import type {
  GeneratorCompositeKind,
  GeneratorRollEngineOptions,
  GeneratorPack,
  GeneratorRollResult,
  GeneratorTable,
} from './contracts';

export interface GeneratorRollRequest {
  pack: GeneratorPack;
  kind: GeneratorCompositeKind;
  customTableId?: string;
  options?: GeneratorRollEngineOptions;
}

export function rollFromPack(request: GeneratorRollRequest): GeneratorRollResult {
  return commitRollFromPack(request);
}

export function previewRollFromPack(request: GeneratorRollRequest): GeneratorRollResult {
  return createRoll(request);
}

export function commitRollFromPack(request: GeneratorRollRequest): GeneratorRollResult {
  return createRoll(request);
}

function createRoll(request: GeneratorRollRequest): GeneratorRollResult {
  const now = new Date().toISOString();
  const { pack, kind, customTableId, options } = request;
  const rng = createRng(options?.seed);

  if (kind === 'character') {
    const firstName = pickFromTable(pack.tables, 'firstName', rng, options);
    const nickname = pickFromTable(pack.tables, 'nickname', rng, options);
    const lastName = pickFromTable(pack.tables, 'lastName', rng, options);
    return {
      id: `roll-${cryptoRandomId()}`,
      packId: pack.id,
      kind,
      sourceTableIds: [firstName.tableId, nickname.tableId, lastName.tableId].filter(
        (tableId): tableId is string => Boolean(tableId),
      ),
      resultText: [firstName.value, nickname.value, lastName.value].filter(Boolean).join(' '),
      createdAt: now,
    };
  }

  if (kind === 'location') {
    const locationType = pickFromTable(pack.tables, 'locationType', rng, options);
    const locationName = pickFromTable(pack.tables, 'locationName', rng, options);
    return {
      id: `roll-${cryptoRandomId()}`,
      packId: pack.id,
      kind,
      sourceTableIds: [locationType.tableId, locationName.tableId].filter(
        (tableId): tableId is string => Boolean(tableId),
      ),
      resultText: [locationType.value, locationName.value].filter(Boolean).join(': '),
      createdAt: now,
    };
  }

  if (kind === 'eventTable') {
    const event = pickFromTable(pack.tables, 'event', rng, options);
    return {
      id: `roll-${cryptoRandomId()}`,
      packId: pack.id,
      kind,
      sourceTableIds: event.tableId ? [event.tableId] : [],
      resultText: event.value || 'Brak wpisow w tabeli zdarzen.',
      createdAt: now,
    };
  }

  const custom = pack.tables.find((table) => table.id === customTableId);
  const customValue = pickWeighted(custom, rng, options);
  return {
    id: `roll-${cryptoRandomId()}`,
    packId: pack.id,
    kind,
    sourceTableIds: custom ? [custom.id] : [],
    resultText: customValue ?? 'Brak wpisow w wybranej tabeli.',
    createdAt: now,
  };
}

function pickFromTable(
  tables: GeneratorTable[],
  type: string,
  rng: () => number,
  options?: GeneratorRollEngineOptions,
): { value: string; tableId: string | null } {
  const table = tables.find((item) => item.type === type && item.isActive);
  if (!table) return { value: '', tableId: null };
  const value = pickWeighted(table, rng, options);
  return { value: value ?? '', tableId: table.id };
}

function pickWeighted(
  table: GeneratorTable | undefined,
  rng: () => number,
  options?: GeneratorRollEngineOptions,
): string | null {
  if (!table) return null;
  const activeEntries = table.entries.filter((entry) => {
    if (!entry.isActive) return false;
    if (!options?.withoutRepetition) return true;
    return !(options.previousEntryIds ?? []).includes(entry.id);
  });
  if (activeEntries.length === 0) return null;

  const totalWeight = activeEntries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (totalWeight <= 0) {
    return activeEntries[Math.floor(rng() * activeEntries.length)]?.value ?? null;
  }

  let roll = rng() * totalWeight;
  for (const entry of activeEntries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry.value;
  }
  return activeEntries[activeEntries.length - 1]?.value ?? null;
}

export function createRng(seed?: string | number): () => number {
  if (seed === undefined || seed === null) {
    return Math.random;
  }
  const normalizedSeed = typeof seed === 'number' ? seed : hashString(seed);
  let state = normalizedSeed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

