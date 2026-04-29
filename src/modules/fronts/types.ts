import type { Entity } from '@shared/types/entity';
import { isCompleted, type Clock } from '@modules/clocks/types';

export const FRONT_CATEGORIES = ['campaign', 'adventure'] as const;
export type FrontCategory = (typeof FRONT_CATEGORIES)[number];
export const FRONT_CATEGORY_LABELS: Record<FrontCategory, string> = {
  campaign: 'Kampanijny',
  adventure: 'Przygodowy',
};

export interface FrontData {
  category: FrontCategory;
  goal: string;
  stakes: string[];
}

export type Front = Entity & { type: 'front'; data: FrontData };

export function isFront(entity: Entity): entity is Front {
  return entity.type === 'front';
}

export const DEFAULT_THREAT_TYPES = [
  'ambitious_organization',
  'arcane_enemy',
  'city',
  'corrupt_ruler',
  'dark_entity',
  'disease_affliction',
  'environ_disaster',
  'force_of_chaos',
  'harmful_tradition',
  'oath_of_service',
  'rampant_beast',
  'region',
  'religious_institution',
  'wealthy_merchant',
] as const;
export const THREAT_TYPES = DEFAULT_THREAT_TYPES;
export type DefaultThreatType = (typeof DEFAULT_THREAT_TYPES)[number];
export type ThreatType = DefaultThreatType | `custom:${string}`;
export const THREAT_TYPE_LABELS: Record<string, string> = {
  ambitious_organization: 'Ambitna organizacja',
  arcane_enemy: 'Wróg magiczny',
  city: 'Miasto',
  corrupt_ruler: 'Skorumpowany władca',
  dark_entity: 'Mroczna istota',
  disease_affliction: 'Choroba / plaga',
  environ_disaster: 'Katastrofa środowiskowa',
  force_of_chaos: 'Siła chaosu',
  harmful_tradition: 'Szkodliwa tradycja',
  oath_of_service: 'Przysięga',
  rampant_beast: 'Dzikie zwierzę',
  region: 'Region',
  religious_institution: 'Instytucja religijna',
  wealthy_merchant: 'Bogaty kupiec',
};

export function getThreatTypeLabel(threatType: ThreatType): string {
  if ((THREAT_TYPES as readonly string[]).includes(threatType)) {
    return THREAT_TYPE_LABELS[threatType as DefaultThreatType] ?? threatType;
  }
  return threatType.startsWith('custom:') ? threatType.slice('custom:'.length) : threatType;
}

export interface ThreatTypePreset {
  impulse: string;
  trigger: string;
  moves: string[];
  pillars?: string[];
}

export interface ThreatPillar {
  label: string;
  destroyed?: boolean;
}

export const THREAT_TYPE_PRESETS: Record<ThreatType, ThreatTypePreset> = {
  ambitious_organization: {
    impulse: 'Przejąć kontrolę nad kluczowymi zasobami i ludźmi wpływu.',
    trigger: 'Kiedy organizacja zdobywa nowego sojusznika albo hak na przeciwników.',
    moves: ['Składa ofertę nie do odrzucenia', 'Przejmuje instytucję od środka', 'Ustawia ludzi na kluczowych stanowiskach'],
  },
  arcane_enemy: {
    impulse: 'Naginać rzeczywistość pod własną wolę.',
    trigger: 'Kiedy granica między normalnością a magią staje się cieńsza.',
    moves: ['Ujawnia zakazane rytuały', 'Wypacza prawa natury', 'Wysyła magicznych emisariuszy'],
  },
  city: {
    impulse: 'Wciągnąć mieszkańców w sieć zależności i napięć.',
    trigger: 'Kiedy napięcia społeczne osiągają punkt wrzenia.',
    moves: ['Zamyka drogę ucieczki', 'Wystawia jednych przeciw drugim', 'Połyka kolejne dzielnice konfliktem'],
  },
  corrupt_ruler: {
    impulse: 'Utrzymać władzę za wszelką cenę.',
    trigger: 'Kiedy autorytet władcy zostaje publicznie podważony.',
    moves: ['Wydaje represyjny dekret', 'Kupuje lojalność elit', 'Uciera narrację propagandą'],
  },
  dark_entity: {
    impulse: 'Karmić się strachem, chaosem i ofiarami.',
    trigger: 'Kiedy ktoś łamie tabu albo narusza miejsce mocy.',
    moves: ['Szepcze obietnice przez sny', 'Zostawia ślady bluźnierczej obecności', 'Wzywa kultystów do działania'],
  },
  disease_affliction: {
    impulse: 'Rozprzestrzeniać się szybciej, niż ludzie potrafią reagować.',
    trigger: 'Kiedy społeczność ignoruje pierwsze symptomy albo działa zbyt późno.',
    moves: ['Mutuje niespodziewanie', 'Odwraca ludzi od siebie wzajemnie', 'Uderza w najsłabsze ogniwa'],
  },
  environ_disaster: {
    impulse: 'Zniszczyć dotychczasowy porządek środowiska i osadnictwa.',
    trigger: 'Kiedy siły natury zostają zaburzone przez działania ludzi lub magię.',
    moves: ['Przestawia warunki terenu', 'Odrywa osady od zaplecza', 'Daje fałszywe poczucie poprawy przed kolejnym ciosem'],
  },
  force_of_chaos: {
    impulse: 'Rozbić struktury i reguły, które trzymają świat w ryzach.',
    trigger: 'Kiedy konflikt wymyka się spod kontroli i zaczyna żyć własnym życiem.',
    moves: ['Podsyca skrajne decyzje', 'Miesza sojusze i role', 'Prowadzi do nieodwracalnych strat'],
  },
  harmful_tradition: {
    impulse: 'Utrzymać krzywdzący rytuał jako coś normalnego i koniecznego.',
    trigger: 'Kiedy zbliża się moment obrzędu albo ktoś próbuje go podważyć.',
    moves: ['Wzmacnia presję społeczną', 'Piętnuje odstępców', 'Przepisuje historię na swoją korzyść'],
  },
  oath_of_service: {
    impulse: 'Egzekwować zobowiązanie bez względu na koszty ludzkie.',
    trigger: 'Kiedy ktoś próbuje zerwać przysięgę albo obejść jej warunki.',
    moves: ['Przypomina o długu w najgorszym momencie', 'Wymusza zdradę dotychczasowych lojalności', 'Kara za najmniejsze odstępstwo'],
  },
  rampant_beast: {
    impulse: 'Polować i dominować terytorium.',
    trigger: 'Kiedy bestia czuje głód, zagrożenie albo intruza na swoim terenie.',
    moves: ['Uderza znienacka', 'Znaczy teren grozą', 'Przenosi polowanie bliżej ludzi'],
  },
  region: {
    impulse: 'Wymusić własną logikę na wszystkich, którzy w nim działają.',
    trigger: 'Kiedy warunki regionu zmieniają się skokowo albo sezonowo.',
    moves: ['Odcina kluczowe szlaki', 'Wystawia wyprawę na próbę', 'Przestawia mapę wpływów'],
  },
  religious_institution: {
    impulse: 'Kontrolować sumienia i decyzje wspólnoty.',
    trigger: 'Kiedy wiara staje się narzędziem polityki lub przemocy.',
    moves: ['Ogłasza dogmatyczny zakaz', 'Nadaje moralny stygmat', 'Legitymizuje brutalne środki jako konieczność'],
  },
  wealthy_merchant: {
    impulse: 'Monopolizować zysk i przepływ dóbr.',
    trigger: 'Kiedy konkurencja albo bohaterowie zagrażają układowi handlowemu.',
    moves: ['Podbija ceny i wywołuje niedobory', 'Kupuje świadków i urzędników', 'Zleca „dyscyplinowanie” konkurentów'],
  },
};

export const THREAT_DEATH_REASON_PRESETS = [
  'Pokonane przez bohaterów',
  'Wchłonięte przez inny front',
  'Rozpadło się od środka',
  'Utraciło znaczenie po decyzjach stołu',
] as const;

export const THREAT_STATUSES = ['active', 'completed'] as const;
export type ThreatStatus = (typeof THREAT_STATUSES)[number];
export const THREAT_STATUS_LABELS: Record<ThreatStatus, string> = {
  active: 'Aktywne',
  completed: 'Zakończone',
};

/** Archetyp pod radar „Za kulisami” — niezależny od rodzaju PBTA (`threatType`). */
export const DEFAULT_RADAR_ARCHETYPES = ['living_world', 'mystery', 'predator', 'ambush', 'avalanche'] as const;
export const RADAR_ARCHETYPES = DEFAULT_RADAR_ARCHETYPES;
export type DefaultRadarArchetype = (typeof DEFAULT_RADAR_ARCHETYPES)[number];
export type RadarArchetype = DefaultRadarArchetype | `custom:${string}`;
export const RADAR_ARCHETYPE_LABELS: Record<DefaultRadarArchetype, string> = {
  living_world: 'Żyjący świat',
  mystery: 'Tajemnica',
  predator: 'Drapieżnik',
  ambush: 'Zasadzka',
  avalanche: 'Lawina',
};

export const DEFAULT_RADAR_ARCHETYPE: RadarArchetype = 'living_world';

/** Jak zakończyło się zagrożenie (tylko przy statusie `completed`). */
export const THREAT_COMPLETION_OUTCOMES = ['resolved_early', 'completed_by_clock'] as const;
export type ThreatCompletionOutcome = (typeof THREAT_COMPLETION_OUTCOMES)[number];
export const THREAT_COMPLETION_OUTCOME_LABELS: Record<ThreatCompletionOutcome, string> = {
  /** Upadło / zamknięte fabularnie przy niepełnym lub brakującym zegarze. */
  resolved_early: 'Rozwiązane',
  /** Domknięcie zegara (ostatni segment) jako kanoniczne zakończenie. */
  completed_by_clock: 'Ukończone',
};

export interface ThreatData {
  threatType: ThreatType;
  /** Archetyp radaru backstage; brak = `DEFAULT_RADAR_ARCHETYPE` przy odczycie. */
  radarArchetype?: RadarArchetype;
  status?: ThreatStatus;
  impulse: string;
  moves: string[];
  pillars?: Array<string | ThreatPillar>;
  trigger?: string;
  /** Preferowane pole z powodem zakończenia zagrożenia. */
  completionReason?: string;
  /** Legacy alias dla kompatybilności starych zapisów. */
  reasonOfDead?: string;
  /**
   * Przy `completed`: rozróżnienie „rozwiązane przed zegarem” vs „ukończone domknięciem zegara”.
   * Brak wartości = starsze rekordy (nie zapisano sposobu).
   */
  completionOutcome?: ThreatCompletionOutcome;
  forkThreatId?: string;
  inheritanceNotes?: string;
}

export type Threat = Entity & { type: 'threat'; data: ThreatData };

export function isThreat(entity: Entity): entity is Threat {
  return entity.type === 'threat';
}

export function getThreatRadarArchetype(data: ThreatData): RadarArchetype {
  const v = data.radarArchetype;
  if (!v || typeof v !== 'string') return DEFAULT_RADAR_ARCHETYPE;
  if ((RADAR_ARCHETYPES as readonly string[]).includes(v)) return v as RadarArchetype;
  if (v.startsWith('custom:') && v.length > 'custom:'.length) return v as RadarArchetype;
  return DEFAULT_RADAR_ARCHETYPE;
}

/** Heurystyka: pełny zegar → ukończenie zegarem; w przeciwnym razie rozwiązanie „wcześniejsze”. */
export function inferThreatCompletionOutcomeFromClock(
  clock: Clock | null | undefined,
): ThreatCompletionOutcome {
  if (clock && isCompleted(clock)) return 'completed_by_clock';
  return 'resolved_early';
}

export function normalizeThreatPillars(
  pillars: ThreatData['pillars'] | undefined,
): ThreatPillar[] {
  if (!pillars || pillars.length === 0) return [];
  return pillars
    .map((pillar) =>
      typeof pillar === 'string'
        ? { label: pillar, destroyed: false }
        : { label: pillar.label, destroyed: pillar.destroyed === true },
    )
    .filter((pillar) => pillar.label.trim().length > 0);
}
