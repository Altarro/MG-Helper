import type { Session } from '@modules/sessions/types';
import type { Thread } from '@modules/threads/types';
import type { Npc } from '@modules/npcs/types';
import type { Location } from '@modules/locations/types';
import type { Clue } from '@modules/clues/types';
import type { Threat } from '@modules/fronts/types';
import type { RadarArchetype } from '@modules/fronts/types';
import type { Faction } from '@modules/factions/types';

export type AttentionTier = 0 | 1 | 2 | 3 | 4;

/** Czy zegar zasugerowałby „dosunięcie” — tylko copy dla MG; apka nic nie przesuwa. */
export type ClockTickHint = 'none' | 'soon' | 'critical';

/**
 * Identyfikatory nazwanych sygnałów radaru.
 * Każdy archetyp łączy te same dane wejściowe inaczej, ale operuje na tym samym słowniku.
 */
export const RADAR_SIGNAL_IDS = [
  'presenceAbsence',
  'silence',
  'networkAbsence',
  'openThreads',
  'unresolvedClues',
  'clueOpportunity',
  'clockHeat',
  'avalanchePressure',
  'proximity',
  'narrativeGap',
] as const;
export type RadarSignalId = (typeof RADAR_SIGNAL_IDS)[number];

/** Pojedynczy sygnał radaru wraz z wkładem w wynik i ludzkim wyjaśnieniem. */
export interface ThreatRadarSignal {
  id: RadarSignalId;
  /** Krótka etykieta dla MG („Brak śladu na sesjach”). */
  label: string;
  /** [0,1] surowa intensywność sygnału. */
  intensity: number;
  /** [0,1] znormalizowany wkład w łączny wynik (heat). */
  contribution: number;
  /** Konkretne wyjaśnienie skąd wynika ta wartość („Brak śladu w 4 z 6 ostatnich sesji”). */
  why: string;
}

/** Snapshot for matrix + radar (read-only view of campaign). */
export interface BackstageSnapshot {
  sessions: Session[];
  threads: Thread[];
  threadSessionIds: Map<string, Set<string>>;
  npcs: Npc[];
  npcSessionIds: Map<string, Set<string>>;
  factions: Faction[];
  /** factionId → sesje pochodne (NPC/Location należące do frakcji, które były na sesjach). */
  factionSessionIds: Map<string, Set<string>>;
  threats: Threat[];
  locations: Location[];
  locationSessionIds: Map<string, Set<string>>;
  clues: Clue[];
  clueSessionIds: Map<string, Set<string>>;
  activeThreats: Threat[];
  /** threatId → session IDs (appears_in threat → session) */
  threatSessionIds: Map<string, Set<string>>;
  /** threatId → wskazówki `clues_for` (z id do śladu sesji). */
  threatClues: Map<string, { clueId: string; discovered: boolean }[]>;
  /** threatId → linked thread ids (affects, either direction) */
  threatThreadIds: Map<string, string[]>;
  /** threatId → linked npc ids (related_to, either direction). */
  threatNpcIds: Map<string, Set<string>>;
  /** threatId → linked faction ids (related_to, either direction). */
  threatFactionIds: Map<string, Set<string>>;
  /** threatId → clock fill + kotwica ostatniego ticku w przód */
  threatClocks: Map<
    string,
    {
      filled: number;
      segments: number;
      isActive: boolean;
      isCompleted: boolean;
      lastAdvanceSessionId?: string;
      lastAdvanceAt?: string;
    }[]
  >;
  /** Sesje, w których widać ślad zagrożenia: bezpośrednio, wątki, wskazówki, NPC i frakcje `related_to`. */
  threatFootprintSessionIds: Map<string, Set<string>>;
}

export interface ThreatRadarResult {
  threatId: string;
  name: string;
  radarArchetype: RadarArchetype;
  /** (a) Udział ostatnich sesji ze śladem zagrożenia (footprint). */
  presence: number;
  /** Łączny dług narracyjny [0,1] (wątki otwarte + wskazówki nieodkryte). */
  debt: number;
  heat: number;
  tier: AttentionTier;
  cue: string;
  clockCritical: boolean;
  narrativeGap: boolean;
  scalars: {
    /** (a) jak `presence` — udział ostatnich sesji ze śladem. */
    footprintPresence: number;
    /** (b) presja czasu od ostatniego ticku zegara w przód [0,1]. */
    sinceClockSessions: number;
    /** (c) Ułamek powiązanych wątków w statusie completed. */
    threadsResolvedRatio: number;
    /** (d) Ułamek powiązanych wskazówek jeszcze nieodkrytych. */
    cluesUndiscoveredRatio: number;
    clockFill: number;
  };
  /** [0,1] rozmyta sugestia „kto powinien dostać beat / być na stole” — bez zapisu w DB. */
  spotlightScore: number;
  /** 1 = najwyższy spotlight w kampanii (po `computeAllThreatRadarRows`). */
  spotlightRank: number;
  /** Najsilniejsza propozycja radaru dla nadchodzącej sesji (gdy sygnał wystarczająco mocny). */
  isSpotlightSuggestion: boolean;
  /** Krótka sugestia narracyjna tylko dla wiersza z `isSpotlightSuggestion`. */
  spotlightCue?: string;
  /** „critical” = już w `cue`; „soon` = zegar rośnie — rozważ segment, gdy Ty zdecydujesz. */
  clockTickHint: ClockTickHint;
  /** Opcjonalna druga linia pod `cue`, gdy `clockTickHint === 'soon'`. */
  clockTickCue?: string;
  /** Posortowane malejąco po `contribution` sygnały, które tworzą wynik. */
  contributions: ThreatRadarSignal[];
  /** Krótka, archetypowa rekomendacja ruchu MG (gdy radar widzi mocny sygnał). */
  recommendedMove?: string;
}
