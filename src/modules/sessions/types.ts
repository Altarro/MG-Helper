import type { Entity } from '@shared/types/entity';

export interface SessionData {
  number: number;   // session number (e.g. 1, 2, ...)
  date: string;     // ISO date string "YYYY-MM-DD"
  summary: string;  // short plain-text summary
  plannedDurationMin?: number;
  scenes?: SessionScene[];
  sortOrder?: number;
}

export interface SessionScene {
  name: string;
  goal: string;
  estimatedDurationMin: number;
}

export type Session = Entity & { type: 'session'; data: SessionData };

export function isSession(entity: Entity): entity is Session {
  return entity.type === 'session';
}

// Timeline events — stored as entities with type 'event'
export interface SessionEventData {
  kind?: 'session_timeline' | 'npc_location_history' | 'session_signal';
  timestamp: string; // ISO datetime when the event was recorded
  text: string;      // free-form event text
  npcId?: string;
  locationId?: string;
  locationName?: string;
  sessionId?: string;
  sessionName?: string;
  signalType?:
    | 'entity_added_to_session'
    | 'entity_removed_from_session'
    | 'thread_created_in_session'
    | 'threat_status_changed'
    | 'entity_died_in_session'
    | 'threat_clock_started'
    | 'entity_updated_in_session'
    | 'clock_ticked'
    | 'clue_discovered'
    | 'clue_hidden';
  entityType?: string;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
}

export type SessionEvent = Entity & { type: 'event'; data: SessionEventData };

export function isSessionEvent(entity: Entity): entity is SessionEvent {
  return entity.type === 'event';
}

// ── Spotlight Tracker types ────────────────────────────────────────────────────

export interface TimerState {
  elapsed: number;          // accumulated seconds before current run
  startedAt: string | null; // ISO when current run started; null = not running
}

export interface SpotlightPlayer {
  id: string;
  name: string;
  playerName?: string;
  active: boolean;
  waitTimer: TimerState;        // grows when inactive
  totalActiveTimer: TimerState; // grows when active
}

export interface SpotlightState {
  mgActive: boolean;
  mgTimer: TimerState;            // grows when MG is not active (waitTimer)
  mgTotalActiveTimer: TimerState; // grows when MG is active
  players: SpotlightPlayer[];
  isPaused: boolean;
  sessionStarted: boolean;        // false until first click — all timers frozen before that
}
