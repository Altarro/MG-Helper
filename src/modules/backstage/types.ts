import type { Session } from '@modules/sessions/types';
import type { Thread } from '@modules/threads/types';
import type { Npc } from '@modules/npcs/types';
import type { Location } from '@modules/locations/types';
import type { Clue } from '@modules/clues/types';
import type { Threat } from '@modules/fronts/types';
import type { RadarArchetype } from '@modules/fronts/types';

export type AttentionTier = 0 | 1 | 2 | 3 | 4;

/** Czy zegar zasugerowałby „dosunięcie” — tylko copy dla MG; apka nic nie przesuwa. */
export type ClockTickHint = 'none' | 'soon' | 'critical';

/** Snapshot for matrix + radar (read-only view of campaign). */
export interface BackstageSnapshot {
  sessions: Session[];
  threads: Thread[];
  threadSessionIds: Map<string, Set<string>>;
  npcs: Npc[];
  npcSessionIds: Map<string, Set<string>>;
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
  /** Sesje, w których widać ślad zagrożenia: bezpośrednio, wątki, wskazówki, NPC `related_to`. */
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
}
