import type { Session } from '@modules/sessions/types';
import type { Thread } from '@modules/threads/types';
import type { Threat } from '@modules/fronts/types';

export type AttentionTier = 0 | 1 | 2 | 3 | 4;

/** Snapshot for matrix + radar (read-only view of campaign). */
export interface BackstageSnapshot {
  sessions: Session[];
  threads: Thread[];
  threadSessionIds: Map<string, Set<string>>;
  activeThreats: Threat[];
  /** threatId → session IDs (appears_in threat → session) */
  threatSessionIds: Map<string, Set<string>>;
  /** threatId → clue rows linked via clues_for */
  threatClues: Map<string, { discovered: boolean }[]>;
  /** threatId → linked thread ids (affects, either direction) */
  threatThreadIds: Map<string, string[]>;
  /** threatId → clock fill info from tracks */
  threatClocks: Map<
    string,
    { filled: number; segments: number; isActive: boolean; isCompleted: boolean }[]
  >;
}

export interface ThreatRadarResult {
  threatId: string;
  name: string;
  presence: number;
  debt: number;
  heat: number;
  tier: AttentionTier;
  cue: string;
  clockCritical: boolean;
  narrativeGap: boolean;
  scalars: { absence: number; clueDebt: number; threadActive: number; clockFill: number; streakAbsence: number };
}
