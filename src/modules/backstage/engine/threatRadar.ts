import type {
  AttentionTier,
  BackstageSnapshot,
  ClockTickHint,
  RadarSignalId,
  ThreatRadarResult,
  ThreatRadarSignal,
} from '../types';
import type { RadarArchetype, Threat } from '@modules/fronts/types';
import { getThreatRadarArchetype } from '@modules/fronts/types';
import {
  THREAT_RADAR_DEFAULT_WEIGHTS,
  THREAT_RADAR_WEIGHT_KEYS,
  type ThreatRadarArchetypeWeights,
  type ThreatRadarWeightKey,
} from './threatRadarArchetypes';

const EPS = 1e-6;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Krzywa S-kształtna łagodząca skoki przy wartościach skrajnych. */
function smoothStep(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

/** Krzywa potęgowa: gamma > 1 = wolniejszy start, szybkie narastanie pod koniec. */
function softCurve(value: number, gamma: number): number {
  return Math.pow(clamp01(value), Math.max(0.01, gamma));
}

/** Probabilistyczne fuzzy OR — łączy dwa sygnały bez przekraczania 1. */
function fuzzyOr(a: number, b: number): number {
  return clamp01(a + b - a * b);
}

function heatToBaseTier(heat: number): AttentionTier {
  if (heat < 0.18) return 0;
  if (heat < 0.35) return 1;
  if (heat < 0.52) return 2;
  if (heat < 0.72) return 3;
  return 4;
}

function computeClockTickHint(
  clockRows: { filled: number; segments: number; isActive: boolean; isCompleted: boolean }[],
  clockCritical: boolean,
): ClockTickHint {
  if (clockCritical) return 'critical';
  for (const c of clockRows) {
    if (!c.isActive || c.isCompleted || c.segments <= 0) continue;
    const r = c.filled / c.segments;
    if (r >= 0.52 && r < 0.85) return 'soon';
  }
  return 'none';
}

type ClockRow = {
  filled: number;
  segments: number;
  isActive: boolean;
  isCompleted: boolean;
  lastAdvanceSessionId?: string;
  lastAdvanceAt?: string;
};

function countHitsInWindow(
  sessionSet: Set<string> | undefined,
  sessionIds: string[],
  fromIdx: number,
  toIdx: number,
): number {
  if (!sessionSet || toIdx < fromIdx) return 0;
  let hits = 0;
  for (let i = fromIdx; i <= toIdx; i++) {
    if (sessionSet.has(sessionIds[i]!)) hits++;
  }
  return hits;
}

function linkedPresenceRatio(
  linkedIds: Iterable<string>,
  sessionMap: Map<string, Set<string>>,
  sessionIds: string[],
  fromIdx: number,
  toIdx: number,
  windowN: number,
): number {
  let considered = 0;
  let sum = 0;
  for (const id of linkedIds) {
    considered++;
    const hits = countHitsInWindow(sessionMap.get(id), sessionIds, fromIdx, toIdx);
    sum += hits / Math.max(1, windowN);
  }
  if (considered === 0) return 0;
  return clamp01(sum / considered);
}

/** Zestaw nazwanych sygnałów liczonych raz dla zagrożenia. */
interface SignalSet {
  presenceAbsence: number;
  silence: number;
  networkAbsence: number;
  openThreads: number;
  unresolvedClues: number;
  clueOpportunity: number;
  clockHeat: number;
  avalanchePressure: number;
  proximity: number;
  narrativeGap: number;
}

interface SignalContext {
  windowN: number;
  sessionsSinceFootprint: number;
  hasClockTickAnchor: boolean;
  sinceClockSessions: number;
  footprintPresence: number;
  totalThreads: number;
  openThreadCount: number;
  totalClues: number;
  undiscoveredClues: number;
  clueOpportunityHits: number;
  clockFill: number;
  networkConsidered: number;
}

/** Krótkie etykiety i generatory „dlaczego”. */
export const RADAR_SIGNAL_LABELS: Record<RadarSignalId, string> = {
  presenceAbsence: 'Brak śladu na stole',
  silence: 'Cisza po ostatnim ruchu',
  networkAbsence: 'Powiązani nie pojawiają się',
  openThreads: 'Niedomknięte wątki',
  unresolvedClues: 'Wskazówki bez podjęcia',
  clueOpportunity: 'Przegapione okazje śledcze',
  clockHeat: 'Postęp zegara',
  avalanchePressure: 'Lawina nabiera tempa',
  proximity: 'Gracze blisko prawdy',
  narrativeGap: 'Luka narracyjna',
};

const SIGNAL_LABELS = RADAR_SIGNAL_LABELS;

/** Krótka charakterystyka każdego domyślnego archetypu — UI ustawień i podpowiedzi. */
export const RADAR_ARCHETYPE_PROFILES: Record<
  'living_world' | 'mystery' | 'predator' | 'ambush' | 'avalanche',
  { tagline: string; how: string }
> = {
  living_world: {
    tagline: 'Zagrożenie żyje w tle.',
    how:
      'Tyka mocniej, gdy zagrożenie i jego powiązani (wątki, NPC, frakcje) znikają ze stołu. Cisza po ruchu zagrożenia podkręca presję.',
  },
  mystery: {
    tagline: 'Tajemnica karmi się przegapionymi tropami.',
    how:
      'Rośnie z każdą wskazówką, która pojawiła się na sesji, ale nie została podjęta. Otwarte wątki dorzucają napięcia.',
  },
  predator: {
    tagline: 'Drapieżnik nie lubi być odkrywany.',
    how:
      'Im bliżej gracze są prawdy (odkryte wskazówki + domknięte wątki), tym mocniej tyka. Postęp zegara dodatkowo go napędza.',
  },
  ambush: {
    tagline: 'Pułapka czeka cierpliwie.',
    how:
      'Z początku spokojna; budzi się od ciszy między ruchami i nieobecności powiązanych przy stole. Podejście graczy zaostrza ją gwałtownie.',
  },
  avalanche: {
    tagline: 'Lawina nabiera rozpędu.',
    how:
      'Z początku spokojna, ale każda kolejna kreska na zegarze przyspiesza ją nieliniowo. Cisza między sesjami dodatkowo dosypuje śniegu.',
  },
};

export interface ArchetypeWeightDescriptor {
  key: ThreatRadarWeightKey;
  signalId: RadarSignalId;
  signalLabel: string;
  /** Mnożnik archetypu — pokazuje, jak mocno ten suwak wpływa na ten archetyp. */
  factor: number;
  /** Krótki opis „co podkręca” dla MG. */
  hint: string;
}

const WEIGHT_HINTS_BY_SIGNAL: Record<RadarSignalId, string> = {
  presenceAbsence: 'Im wyżej, tym silniej radar reaguje na brak śladu zagrożenia w ostatnich sesjach.',
  silence: 'Im wyżej, tym mocniej tyka cisza między ruchami zagrożenia (lub od ostatniego ticku zegara).',
  networkAbsence:
    'Im wyżej, tym silniej liczy się brak powiązanych wątków, NPC i frakcji przy stole.',
  openThreads: 'Im wyżej, tym silniej liczą się niedomknięte powiązane wątki.',
  unresolvedClues: 'Im wyżej, tym mocniej tykają nieodkryte wskazówki — niezależnie od tego, czy były na stole.',
  clueOpportunity: 'Im wyżej, tym silniej radar reaguje na wskazówki widziane na sesjach, ale niepodjęte.',
  clockHeat: 'Im wyżej, tym bardziej liczy się postęp zegara zagrożenia.',
  avalanchePressure:
    'Im wyżej, tym mocniej zegar (z dodatkiem ciszy) napędza lawinę — efekt narasta nieliniowo.',
  proximity: 'Im wyżej, tym mocniej radar reaguje, gdy gracze odkrywają wskazówki i domykają wątki.',
  narrativeGap: 'Bonus za sytuację, w której wątek był na stole, a tropy wciąż wiszą.',
};

export function getArchetypeWeightDescriptors(archetype: RadarArchetype): ArchetypeWeightDescriptor[] {
  const map = getArchetypeMap(archetype);
  return THREAT_RADAR_WEIGHT_KEYS.map((key) => {
    const rule = map[key];
    return {
      key,
      signalId: rule.id,
      signalLabel: SIGNAL_LABELS[rule.id],
      factor: rule.factor,
      hint: WEIGHT_HINTS_BY_SIGNAL[rule.id],
    };
  });
}

function pluralizeSessions(n: number): string {
  if (n === 1) return '1 sesji';
  if (n >= 2 && n <= 4) return `${n} sesjach`;
  return `${n} sesjach`;
}

function buildWhy(id: RadarSignalId, ctx: SignalContext): string {
  switch (id) {
    case 'presenceAbsence': {
      if (ctx.windowN <= 0) return 'Brak sesji w kampanii.';
      const hits = Math.round(ctx.footprintPresence * ctx.windowN);
      const miss = ctx.windowN - hits;
      return `Brak śladu w ${miss} z ${ctx.windowN} ostatnich sesji.`;
    }
    case 'silence': {
      if (!ctx.hasClockTickAnchor && ctx.sessionsSinceFootprint === 0) {
        return 'Zagrożenie pojawiło się ostatnio na stole.';
      }
      const label = ctx.hasClockTickAnchor
        ? `${pluralizeSessions(Math.max(1, Math.round(ctx.sinceClockSessions * Math.max(1, ctx.windowN))))} od ostatniego ticku zegara`
        : `${pluralizeSessions(ctx.sessionsSinceFootprint)} od ostatniego śladu`;
      return `Cisza: ${label}.`;
    }
    case 'networkAbsence': {
      if (ctx.networkConsidered === 0) return 'Brak powiązanych wątków, NPC ani frakcji.';
      return `Powiązane wątki/NPC/frakcje rzadko widoczne na ostatnich ${ctx.windowN} sesjach.`;
    }
    case 'openThreads': {
      if (ctx.totalThreads === 0) return 'Brak powiązanych wątków — domyślny niski wkład.';
      return `${ctx.openThreadCount} z ${ctx.totalThreads} powiązanych wątków pozostaje otwartych.`;
    }
    case 'unresolvedClues': {
      if (ctx.totalClues === 0) return 'Brak wskazówek — domyślny niski wkład.';
      return `${ctx.undiscoveredClues} z ${ctx.totalClues} wskazówek wciąż nieodkrytych.`;
    }
    case 'clueOpportunity': {
      if (ctx.undiscoveredClues === 0) return 'Brak nieodkrytych wskazówek do podjęcia.';
      return `${ctx.clueOpportunityHits} z ${ctx.undiscoveredClues} nieodkrytych wskazówek pojawiło się na sesjach, ale nie zostały podjęte.`;
    }
    case 'clockHeat': {
      if (ctx.clockFill <= 0) return 'Powiązane zegary nieaktywne lub puste.';
      return `Najszybszy zegar zapełniony w ${Math.round(ctx.clockFill * 100)}%.`;
    }
    case 'avalanchePressure': {
      if (ctx.clockFill <= 0) return 'Lawina jeszcze nie ruszyła — brak aktywnego zegara.';
      return `Zegar (${Math.round(ctx.clockFill * 100)}%) i cisza między sesjami nakręcają lawinę.`;
    }
    case 'proximity': {
      const cluePart = ctx.totalClues === 0 ? 'brak wskazówek' : `${ctx.totalClues - ctx.undiscoveredClues} z ${ctx.totalClues} wskazówek odkrytych`;
      const threadPart = ctx.totalThreads === 0 ? 'brak powiązanych wątków' : `${ctx.totalThreads - ctx.openThreadCount} z ${ctx.totalThreads} wątków domkniętych`;
      return `Gracze blisko prawdy: ${cluePart}, ${threadPart}.`;
    }
    case 'narrativeGap': {
      return 'W ostatniej sesji był powiązany wątek, ale wskazówki wiszą bez podjęcia.';
    }
    default:
      return 'Sygnał aktywny.';
  }
}

/**
 * Mapowanie wagi z ustawień (5 kluczy) → konkretny sygnał i mnożnik per archetyp.
 * Dzięki temu użytkownik dostraja te same wagi, a archetyp decyduje, co ta waga „znaczy”.
 */
type ArchetypeRule = { id: RadarSignalId; factor: number };
type ArchetypeMap = Record<ThreatRadarWeightKey, ArchetypeRule>;

const ARCHETYPE_SIGNAL_MAP: Record<RadarArchetype, ArchetypeMap> = {
  living_world: {
    footprintAbsence: { id: 'presenceAbsence', factor: 1.0 },
    sinceClock: { id: 'silence', factor: 0.85 },
    threadOpen: { id: 'networkAbsence', factor: 1.0 },
    clueDebt: { id: 'unresolvedClues', factor: 0.5 },
    clockFill: { id: 'clockHeat', factor: 0.45 },
  },
  mystery: {
    footprintAbsence: { id: 'presenceAbsence', factor: 0.35 },
    sinceClock: { id: 'silence', factor: 0.5 },
    threadOpen: { id: 'openThreads', factor: 0.85 },
    clueDebt: { id: 'clueOpportunity', factor: 1.0 },
    clockFill: { id: 'clockHeat', factor: 0.4 },
  },
  predator: {
    footprintAbsence: { id: 'presenceAbsence', factor: 0.5 },
    sinceClock: { id: 'silence', factor: 0.4 },
    threadOpen: { id: 'openThreads', factor: 0.5 },
    clueDebt: { id: 'proximity', factor: 1.0 },
    clockFill: { id: 'clockHeat', factor: 0.55 },
  },
  ambush: {
    footprintAbsence: { id: 'presenceAbsence', factor: 0.85 },
    sinceClock: { id: 'silence', factor: 1.0 },
    threadOpen: { id: 'networkAbsence', factor: 0.6 },
    clueDebt: { id: 'clueOpportunity', factor: 0.7 },
    clockFill: { id: 'clockHeat', factor: 0.5 },
  },
  avalanche: {
    footprintAbsence: { id: 'presenceAbsence', factor: 0.2 },
    sinceClock: { id: 'silence', factor: 0.55 },
    threadOpen: { id: 'openThreads', factor: 0.4 },
    clueDebt: { id: 'unresolvedClues', factor: 0.4 },
    clockFill: { id: 'avalanchePressure', factor: 1.0 },
  },
};

function getArchetypeMap(archetype: RadarArchetype): ArchetypeMap {
  const map = (ARCHETYPE_SIGNAL_MAP as Record<string, ArchetypeMap | undefined>)[archetype];
  return map ?? ARCHETYPE_SIGNAL_MAP.mystery;
}

function getArchetypeWeights(
  archetype: RadarArchetype,
  weights: Partial<Record<RadarArchetype, ThreatRadarArchetypeWeights>>,
): ThreatRadarArchetypeWeights {
  return weights[archetype] ?? weights.mystery ?? THREAT_RADAR_DEFAULT_WEIGHTS.mystery;
}

function selectSignal(signals: SignalSet, id: RadarSignalId): number {
  return signals[id as keyof SignalSet] ?? 0;
}

interface ContributionRecord {
  id: RadarSignalId;
  intensity: number;
  weighted: number;
  weightShare: number;
}

function computeContributions(
  archetype: RadarArchetype,
  signals: SignalSet,
  weights: ThreatRadarArchetypeWeights,
): { records: ContributionRecord[]; heat: number } {
  const map = getArchetypeMap(archetype);
  let weightedSum = 0;
  let weightSum = 0;
  const merged = new Map<RadarSignalId, ContributionRecord>();
  for (const key of THREAT_RADAR_WEIGHT_KEYS) {
    const rule = map[key];
    if (!rule) continue;
    const weight = Math.max(0, weights[key] ?? 0) * rule.factor;
    if (weight <= 0) continue;
    const intensity = clamp01(selectSignal(signals, rule.id));
    weightedSum += weight * intensity;
    weightSum += weight;
    const existing = merged.get(rule.id);
    if (existing) {
      existing.weighted += weight * intensity;
      existing.weightShare += weight;
      existing.intensity = Math.max(existing.intensity, intensity);
    } else {
      merged.set(rule.id, {
        id: rule.id,
        intensity,
        weighted: weight * intensity,
        weightShare: weight,
      });
    }
  }
  const heat = weightSum <= 0 ? 0 : clamp01(weightedSum / weightSum);
  return { records: Array.from(merged.values()), heat };
}

function buildRecommendedMove(
  archetype: RadarArchetype,
  topSignal: ThreatRadarSignal | undefined,
  flags: { clockCritical: boolean; narrativeGap: boolean },
): string | undefined {
  if (flags.clockCritical) {
    return 'Zegar bliski domknięcia — zdecyduj, co robi zagrożenie, zanim ostatni segment się zamknie.';
  }
  if (flags.narrativeGap) {
    return 'Wątek był na stole, a tropy wiszą — wpleć drobne odbicie nieodkrytego śladu w nadchodzącą scenę.';
  }
  if (!topSignal) return undefined;
  const archetypeKey = typeof archetype === 'string' ? archetype : 'mystery';
  switch (topSignal.id) {
    case 'presenceAbsence':
      if (archetypeKey === 'living_world') return 'Pokaż konsekwencję w tle: pogłoska, znak na ulicy, krótka scena bez bohaterów.';
      return 'Wyciągnij zagrożenie na pierwszy plan — krótka scena, wzmianka w opisie lokacji albo NPC mówi o nim wprost.';
    case 'silence':
      return 'Zagrożenie zbyt długo milczy — niech wykona własny ruch między sesjami albo na początku kolejnej.';
    case 'networkAbsence':
      return 'Wciągnij powiązanych (wątek, NPC, frakcję) do nadchodzącej sceny, żeby zagrożenie znów żyło.';
    case 'openThreads':
      return 'Daj jednemu z otwartych wątków beat — nawet drobny postęp uspokaja presję.';
    case 'unresolvedClues':
      return 'Pojawia się dużo nieodkrytych tropów — przygotuj scenę, w której gracze mogą się o jeden potknąć.';
    case 'clueOpportunity':
      return 'Wpleć dyskretnie odbicie nieodkrytego tropu — np. wzmianka NPC albo detal lokacji.';
    case 'clockHeat':
      return 'Zegar pracuje — pokaż jego efekt w świecie, nawet bez ruszania segmentu.';
    case 'avalanchePressure':
      return 'Lawina ma rozpęd — kolejna odsłona powinna być wyraźnie cięższa od poprzedniej.';
    case 'proximity':
      if (archetypeKey === 'predator') return 'Drapieżnik czuje, że gracze blisko prawdy — niech uderzy pierwszy lub zacznie polować.';
      return 'Gracze blisko prawdy — przygotuj reakcję zagrożenia na ich kolejne odkrycie.';
    case 'narrativeGap':
      return 'Wątek był na stole, ale tropy wiszą — daj graczom wyraźne odbicie nieodkrytego śladu.';
    default:
      return undefined;
  }
}

function buildSignals(input: {
  footprintPresence: number;
  sinceClockSessions: number;
  networkPresence: number;
  threadOpenRatio: number;
  cluesUndiscoveredRatio: number;
  clueOpportunityRatio: number;
  clockFill: number;
  clueDiscoveredRatio: number;
  threadsResolvedRatio: number;
  narrativeGap: boolean;
}): SignalSet {
  const presenceAbsence = clamp01(1 - input.footprintPresence);
  const silence = smoothStep(input.sinceClockSessions);
  const networkAbsence = clamp01(1 - input.networkPresence);
  const openThreads = clamp01(input.threadOpenRatio);
  const unresolvedClues = clamp01(input.cluesUndiscoveredRatio);
  const clueOpportunity = fuzzyOr(input.clueOpportunityRatio, 0.35 * unresolvedClues);
  const clockHeat = clamp01(input.clockFill);
  const avalanchePressure = clamp01(softCurve(clockHeat, 1.85) + 0.18 * input.sinceClockSessions * clockHeat);
  const proximity = clamp01(0.6 * input.clueDiscoveredRatio + 0.4 * input.threadsResolvedRatio);
  return {
    presenceAbsence,
    silence,
    networkAbsence,
    openThreads,
    unresolvedClues,
    clueOpportunity,
    clockHeat,
    avalanchePressure,
    proximity,
    narrativeGap: input.narrativeGap ? 1 : 0,
  };
}

function buildCue(params: {
  archetype: RadarArchetype;
  tier: AttentionTier;
  clockCritical: boolean;
  narrativeGap: boolean;
  topSignal: ThreatRadarSignal | undefined;
}): string {
  if (params.clockCritical) {
    return 'Zegar jest blisko pełna — zdecyduj, co robi zagrożenie, zanim segment się domknie.';
  }
  if (params.narrativeGap) {
    return 'W ostatniej sesji był powiązany wątek, a wskazówki wciąż wiszą — dobry moment na pchnięcie fabuły.';
  }
  const top = params.topSignal;
  if (!top || top.intensity < 0.18) {
    return 'Na razie spokojnie — radar nie sygnalizuje pilnych ruchów.';
  }
  switch (top.id) {
    case 'presenceAbsence':
      return 'Zagrożenie zniknęło ze stołu — warto pokazać, że nadal istnieje.';
    case 'silence':
      return 'Długo cicho między ruchami zagrożenia — czas na własne posunięcie.';
    case 'networkAbsence':
      return 'Powiązani z zagrożeniem nie pojawiają się przy stole — front gaśnie.';
    case 'openThreads':
      return 'Niedomknięte wątki tworzą napięcie — sprawdź, który dojrzał do ruchu.';
    case 'unresolvedClues':
      return 'Wskazówki czekają na podjęcie — może warto dołożyć kolejny ślad.';
    case 'clueOpportunity':
      return 'Tropy pojawiają się na sesjach, ale gracze ich nie biorą — wzmocnij sygnał.';
    case 'clockHeat':
      return 'Zegar pracuje — pokaż konsekwencje, nawet bez przesuwania segmentu.';
    case 'avalanchePressure':
      return 'Lawina nabiera tempa — kolejne sceny powinny być cięższe od poprzednich.';
    case 'proximity':
      return 'Gracze blisko prawdy — zagrożenie powinno reagować mocniej.';
    case 'narrativeGap':
      return 'Wątek był na stole, tropy wiszą — daj im odbicie w nadchodzącej scenie.';
    default:
      return 'Radar widzi rosnącą presję wokół tego zagrożenia.';
  }
}

export function computeThreatRadarRow(
  snap: BackstageSnapshot,
  threat: Threat,
  weights: Partial<Record<RadarArchetype, ThreatRadarArchetypeWeights>> = THREAT_RADAR_DEFAULT_WEIGHTS,
): ThreatRadarResult {
  const threatId = threat.id;
  const threatName = threat.name;
  const radarArchetype = getThreatRadarArchetype(threat.data);

  const sessionsOrdered = [...snap.sessions].sort((a, b) => (a.data.number ?? 0) - (b.data.number ?? 0));
  const sessionIds = sessionsOrdered.map((s) => s.id);
  const lastIdx = sessionIds.length - 1;
  const lastSessionId = lastIdx >= 0 ? sessionIds[lastIdx] : undefined;

  const footprint = snap.threatFootprintSessionIds.get(threatId) ?? new Set<string>();
  const windowN = Math.min(6, Math.max(1, sessionIds.length));
  const fromIdx = Math.max(0, lastIdx - windowN + 1);
  const toIdx = lastIdx;

  let footprintHits = 0;
  for (let i = fromIdx; i <= toIdx; i++) {
    if (footprint.has(sessionIds[i]!)) footprintHits++;
  }
  const footprintPresence = sessionIds.length <= 0 ? 0 : footprintHits / windowN;

  let lastFootprintIdx = -1;
  for (let i = 0; i <= lastIdx; i++) {
    if (footprint.has(sessionIds[i]!)) lastFootprintIdx = i;
  }
  const sessionsSinceFootprint =
    lastFootprintIdx < 0 ? sessionIds.length : Math.max(0, lastIdx - lastFootprintIdx);

  const clockRows = snap.threatClocks.get(threatId) ?? [];
  let tickSessionIdx = -1;
  for (const c of clockRows as ClockRow[]) {
    const sid = c.lastAdvanceSessionId;
    if (!sid) continue;
    const idx = sessionIds.indexOf(sid);
    if (idx >= 0) tickSessionIdx = Math.max(tickSessionIdx, idx);
  }
  const hasClockTickAnchor = tickSessionIdx >= 0;
  const sessionsSinceTick =
    !hasClockTickAnchor || lastIdx < 0
      ? sessionsSinceFootprint
      : Math.max(0, lastIdx - tickSessionIdx);
  const sinceClockSessions =
    sessionIds.length <= 0 ? 0 : Math.min(1, sessionsSinceTick / Math.max(1, sessionIds.length));

  const clueRows = snap.threatClues.get(threatId) ?? [];
  const clueTotal = clueRows.length;
  const discovered = clueRows.filter((c) => c.discovered).length;
  const clueDiscoveredRatio = clueTotal === 0 ? 0 : clamp01(discovered / clueTotal);
  const cluesUndiscoveredRatio = clueTotal === 0 ? 0.28 : clamp01((clueTotal - discovered) / clueTotal);
  const unresolvedClueRows = clueRows.filter((c) => c.discovered !== true);

  const linkedThreadIds = snap.threatThreadIds.get(threatId) ?? [];
  const linkedNpcIds = snap.threatNpcIds.get(threatId) ?? new Set<string>();
  const linkedFactionIds = snap.threatFactionIds.get(threatId) ?? new Set<string>();
  let completedT = 0;
  let totalT = 0;
  const openThreadIds: string[] = [];
  for (const tid of linkedThreadIds) {
    const th = snap.threads.find((t) => t.id === tid);
    if (!th) continue;
    totalT++;
    if (th.data.status === 'completed') {
      completedT++;
    } else {
      openThreadIds.push(tid);
    }
  }
  const threadsResolvedRatio = totalT === 0 ? 0.5 : clamp01(completedT / totalT);
  const threadOpenRatio = totalT === 0 ? 0.22 : clamp01(1 - threadsResolvedRatio);

  let clockFill = 0;
  for (const c of clockRows) {
    if (!c.isActive || c.isCompleted || c.segments <= 0) continue;
    clockFill = Math.max(clockFill, clamp01(c.filled / c.segments));
  }

  const threadPresence = linkedPresenceRatio(linkedThreadIds, snap.threadSessionIds, sessionIds, fromIdx, toIdx, windowN);
  const npcPresence = linkedPresenceRatio(linkedNpcIds, snap.npcSessionIds, sessionIds, fromIdx, toIdx, windowN);
  const factionPresence = linkedPresenceRatio(linkedFactionIds, snap.factionSessionIds, sessionIds, fromIdx, toIdx, windowN);
  const networkSignals = [threadPresence, npcPresence, factionPresence].filter((v) => v > 0);
  const networkPresence =
    networkSignals.length > 0
      ? networkSignals.reduce((sum, value) => sum + value, 0) / networkSignals.length
      : footprintPresence;
  const networkConsidered =
    linkedThreadIds.length + linkedNpcIds.size + linkedFactionIds.size;

  let clueOpportunityHits = 0;
  for (const clue of unresolvedClueRows) {
    const clueSessions = snap.clueSessionIds.get(clue.clueId);
    if (countHitsInWindow(clueSessions, sessionIds, fromIdx, toIdx) > 0) clueOpportunityHits++;
  }
  const clueOpportunityRatio =
    unresolvedClueRows.length === 0 ? 0 : clamp01(clueOpportunityHits / unresolvedClueRows.length);

  let narrativeGap = false;
  if (lastSessionId && clueTotal > 0 && discovered < clueTotal) {
    for (const tid of linkedThreadIds) {
      const set = snap.threadSessionIds.get(tid);
      if (set?.has(lastSessionId)) {
        narrativeGap = true;
        break;
      }
    }
  }

  const signals = buildSignals({
    footprintPresence,
    sinceClockSessions,
    networkPresence,
    threadOpenRatio,
    cluesUndiscoveredRatio,
    clueOpportunityRatio,
    clockFill,
    clueDiscoveredRatio,
    threadsResolvedRatio,
    narrativeGap,
  });

  const archetypeWeights = getArchetypeWeights(radarArchetype, weights);
  const { records, heat: rawHeat } = computeContributions(radarArchetype, signals, archetypeWeights);

  const clockCritical = clockRows.some((c) => {
    if (!c.isActive || c.isCompleted || c.segments <= 0) return false;
    return c.filled / c.segments >= 0.85;
  });

  let heat = rawHeat;
  heat = clamp01(heat + (clockCritical ? 0.1 : 0) + (narrativeGap ? 0.06 : 0));

  const base = heatToBaseTier(heat);
  let floorT: AttentionTier = 0;
  if (clockCritical) floorT = 3;
  else if (narrativeGap && cluesUndiscoveredRatio > 0.38) floorT = 2;
  const tier = Math.min(4, Math.max(base, floorT)) as AttentionTier;

  const ctx: SignalContext = {
    windowN,
    sessionsSinceFootprint,
    hasClockTickAnchor,
    sinceClockSessions,
    footprintPresence,
    totalThreads: totalT,
    openThreadCount: openThreadIds.length,
    totalClues: clueTotal,
    undiscoveredClues: clueRows.length - discovered,
    clueOpportunityHits,
    clockFill,
    networkConsidered,
  };

  // Najpierw posortuj records po `weighted`, żeby wybrać dominujące sygnały.
  const sortedRecords = [...records].sort((a, b) => b.weighted - a.weighted);
  const totalWeighted = sortedRecords.reduce((sum, rec) => sum + rec.weighted, 0);

  const contributions: ThreatRadarSignal[] = sortedRecords.map((rec) => ({
    id: rec.id,
    label: SIGNAL_LABELS[rec.id],
    intensity: rec.intensity,
    contribution: totalWeighted <= EPS ? 0 : clamp01(rec.weighted / totalWeighted),
    why: buildWhy(rec.id, ctx),
  }));

  if (narrativeGap) {
    contributions.push({
      id: 'narrativeGap',
      label: SIGNAL_LABELS.narrativeGap,
      intensity: 1,
      contribution: clamp01(0.18),
      why: buildWhy('narrativeGap', ctx),
    });
  }

  const topSignal = contributions[0];
  const cue = buildCue({ archetype: radarArchetype, tier, clockCritical, narrativeGap, topSignal });

  const recommendedMove = buildRecommendedMove(radarArchetype, topSignal, { clockCritical, narrativeGap });

  const clockTickHint = computeClockTickHint(clockRows, clockCritical);
  const clockTickCue =
    clockTickHint === 'soon'
      ? 'Zegar rośnie — jeśli pasuje do stołu, możesz dosunąć segment ręcznie (apka tylko sugeruje).'
      : undefined;

  const debt = clamp01(0.5 * threadOpenRatio + 0.5 * cluesUndiscoveredRatio + (narrativeGap ? 0.12 : 0));
  const spotlightScore = clamp01(heat + (narrativeGap ? 0.06 : 0) + (clockCritical ? 0.05 : 0));

  return {
    threatId,
    name: threatName,
    radarArchetype,
    presence: footprintPresence,
    debt,
    heat,
    tier,
    cue,
    clockCritical,
    narrativeGap,
    scalars: {
      footprintPresence,
      sinceClockSessions,
      threadsResolvedRatio,
      cluesUndiscoveredRatio,
      clockFill,
    },
    spotlightScore,
    spotlightRank: 0,
    isSpotlightSuggestion: false,
    clockTickHint,
    clockTickCue,
    contributions,
    recommendedMove,
  };
}

const MIN_SPOTLIGHT = 0.12;

export function computeAllThreatRadarRows(
  snap: BackstageSnapshot,
  weights: Partial<Record<RadarArchetype, ThreatRadarArchetypeWeights>> = THREAT_RADAR_DEFAULT_WEIGHTS,
): ThreatRadarResult[] {
  const baseRows = snap.activeThreats.map((t) => computeThreatRadarRow(snap, t, weights));
  const ranked = [...baseRows].sort((a, b) => {
    if (b.spotlightScore !== a.spotlightScore) return b.spotlightScore - a.spotlightScore;
    if (b.heat !== a.heat) return b.heat - a.heat;
    return a.name.localeCompare(b.name, 'pl');
  });
  const topScore = ranked[0]?.spotlightScore ?? 0;
  const rankById = new Map<string, number>();
  ranked.forEach((r, i) => rankById.set(r.threatId, i + 1));

  const rows = baseRows.map((row) => {
    const spotlightRank = rankById.get(row.threatId) ?? 1;
    const isSpotlightSuggestion =
      spotlightRank === 1 && row.spotlightScore >= MIN_SPOTLIGHT && topScore >= MIN_SPOTLIGHT;
    const spotlightCue = isSpotlightSuggestion
      ? 'Sugestia „na stole teraz”: daj temu zagrożeniu wyraźny beat w nadchodzącej sesji (ruch, scena, ewentualnie segment zegara) — tylko Ty zapisujesz zmiany w kampanii.'
      : undefined;
    return { ...row, spotlightRank, isSpotlightSuggestion, spotlightCue };
  });

  rows.sort((a, b) => {
    if (b.tier !== a.tier) return b.tier - a.tier;
    if (b.heat !== a.heat) return b.heat - a.heat;
    return a.name.localeCompare(b.name, 'pl');
  });
  return rows;
}
