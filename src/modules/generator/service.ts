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

  if (options?.evo?.enabled) {
    const evoPicked = pickWithEvolutionaryBias(activeEntries, rng, options.evo);
    if (evoPicked) return evoPicked.value;
  }

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

function pickWithEvolutionaryBias(
  entries: GeneratorTable['entries'],
  rng: () => number,
  evo: NonNullable<GeneratorRollEngineOptions['evo']>,
): GeneratorTable['entries'][number] | null {
  const contextTags = new Set((evo.contextTags ?? []).map(normalizeToken).filter(Boolean));
  const previousResults = new Set((evo.previousResults ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean));
  const explorationRate = clamp01(evo.explorationRate ?? 0.28);
  const generations = Math.max(1, Math.min(8, evo.generations ?? 4));
  const populationSize = Math.max(6, Math.min(24, entries.length));

  if (entries.length === 0) return null;

  const scoreByEntry = new Map<string, number>();
  for (const entry of entries) {
    const baseWeight = Math.max(0, entry.weight);
    const tagMatches = entry.tags.reduce((sum, tag) => sum + (contextTags.has(normalizeToken(tag)) ? 1 : 0), 0);
    const tagSignal = contextTags.size === 0 ? 0 : tagMatches / contextTags.size;
    const noveltySignal = previousResults.has(entry.value.trim().toLowerCase()) ? 0 : 1;
    const fitness = 0.52 * (baseWeight > 0 ? Math.log1p(baseWeight) : 0) + 0.33 * tagSignal + 0.15 * noveltySignal;
    scoreByEntry.set(entry.id, Math.max(0.0001, fitness));
  }

  let population = Array.from({ length: populationSize }, () => selectByScore(entries, scoreByEntry, rng) ?? entries[0]!);
  for (let generation = 0; generation < generations; generation += 1) {
    const ranked = [...population].sort(
      (a, b) => (scoreByEntry.get(b.id) ?? 0) - (scoreByEntry.get(a.id) ?? 0),
    );
    const eliteCount = Math.max(1, Math.floor(populationSize * 0.35));
    const elites = ranked.slice(0, eliteCount);
    const nextPopulation = [...elites];
    while (nextPopulation.length < populationSize) {
      const elite = elites[Math.floor(rng() * elites.length)] ?? entries[0]!;
      const shouldMutate = rng() < explorationRate;
      if (shouldMutate) {
        nextPopulation.push(selectByScore(entries, scoreByEntry, rng) ?? elite);
      } else {
        nextPopulation.push(elite);
      }
    }
    population = nextPopulation;
  }

  const evolvedScores = new Map<string, number>();
  for (const entry of population) {
    evolvedScores.set(entry.id, (evolvedScores.get(entry.id) ?? 0) + (scoreByEntry.get(entry.id) ?? 0));
  }
  return selectByScore(entries, evolvedScores, rng) ?? entries[Math.floor(rng() * entries.length)] ?? null;
}

function selectByScore(
  entries: GeneratorTable['entries'],
  scoreByEntry: Map<string, number>,
  rng: () => number,
): GeneratorTable['entries'][number] | null {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, scoreByEntry.get(entry.id) ?? 0), 0);
  if (total <= 0) return entries[Math.floor(rng() * entries.length)] ?? null;
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= Math.max(0, scoreByEntry.get(entry.id) ?? 0);
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1] ?? null;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '');
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
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

