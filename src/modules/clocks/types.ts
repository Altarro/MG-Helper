import type { Entity } from '@shared/types/entity';

export const CLOCK_SEGMENTS = [4, 6, 8, 10, 12] as const;
export type ClockSegments = (typeof CLOCK_SEGMENTS)[number];
export const CLOCK_KINDS = ['session', 'free', 'threat'] as const;
export type ClockKind = (typeof CLOCK_KINDS)[number];
export const SESSION_CLOCK_END_MODES = ['manual_stopped', 'completed'] as const;
export type SessionClockEndMode = (typeof SESSION_CLOCK_END_MODES)[number];

/** Extra fields stored in `entity.data` for clock entities */
export interface ClockData {
  kind?: ClockKind;            // default: 'free'
  segments: ClockSegments;    // total number of segments
  filled: number;             // how many are filled (0 … segments)
  tickLabels?: string[];      // optional description for each segment (index 0 = first tick)
  isActive?: boolean;         // false = clock is "dead" (threat neutralised etc.)
  sessionClockEndMode?: SessionClockEndMode;
  sessionClockEndedAt?: string;
  /** ISO — ostatni tick w przód (backstage / radar). */
  lastAdvanceAt?: string;
  /** Sesja, w której zarejestrowano ostatni tick w przód (np. Session Live). */
  lastAdvanceSessionId?: string;
}

/** A clock entity — all clock-specific fields live in `data` */
export type Clock = Entity & { type: 'clock'; data: ClockData };

export function isClock(entity: Entity): entity is Clock {
  return entity.type === 'clock';
}

export function isCompleted(clock: Clock): boolean {
  return clock.data.filled >= clock.data.segments;
}
