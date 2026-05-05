import { useState, useCallback, useEffect } from 'react';
import type { SpotlightState } from '../types';

// ── Persisted live session state ──────────────────────────────────────────────
// Stored in sessionStorage['session-live-{sessionId}']

interface PersistedLiveState {
  currentLocationId: string | null;
  openCardIds: string[]; // LRU max 8, newest first
  spotlightState: SpotlightState | null;
}

const MAX_OPEN_CARDS = 4;
const EMPTY_STATE: PersistedLiveState = {
  currentLocationId: null,
  openCardIds: [],
  spotlightState: null,
};

function storageKey(sessionId: string) {
  return `session-live-${sessionId}`;
}

function normalizePersistedState(raw: unknown): PersistedLiveState {
  if (!raw || typeof raw !== 'object') return EMPTY_STATE;

  const state = raw as Partial<PersistedLiveState>;

  return {
    currentLocationId:
      typeof state.currentLocationId === 'string' || state.currentLocationId === null
        ? state.currentLocationId
        : null,
    openCardIds: Array.isArray(state.openCardIds)
      ? state.openCardIds.filter((id): id is string => typeof id === 'string').slice(0, MAX_OPEN_CARDS)
      : [],
    spotlightState: state.spotlightState ?? null,
  };
}

function loadState(sessionId: string): PersistedLiveState {
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (raw) return normalizePersistedState(JSON.parse(raw));
  } catch {
    // ignore parse errors
  }
  return EMPTY_STATE;
}

function saveState(sessionId: string, state: PersistedLiveState) {
  try {
    sessionStorage.setItem(storageKey(sessionId), JSON.stringify(state));
  } catch {
    // storage full or unavailable — fail silently
  }
}

// ── Global live session marker (localStorage) ─────────────────────────────────
// Tells other parts of the app (LiveSessionIndicator) that a session is live

export const LIVE_SESSION_MARKER_KEY = 'mg-live-session';
export const LIVE_SESSION_MARKER_UPDATED_EVENT = 'mg-live-session-updated';

export interface LiveSessionMarker {
  sessionId: string;
  sessionName: string;
  isPaused: boolean;
  campaignId?: string;
}

export function setLiveSessionMarker(marker: LiveSessionMarker) {
  try {
    localStorage.setItem(LIVE_SESSION_MARKER_KEY, JSON.stringify(marker));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(LIVE_SESSION_MARKER_UPDATED_EVENT));
    }
  } catch {
    // ignore
  }
}

export function getLiveSessionMarker(): LiveSessionMarker | null {
  try {
    const raw = localStorage.getItem(LIVE_SESSION_MARKER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LiveSessionMarker>;
      if (typeof parsed.sessionId !== 'string' || typeof parsed.sessionName !== 'string') {
        return null;
      }
      return {
        sessionId: parsed.sessionId,
        sessionName: parsed.sessionName,
        isPaused: parsed.isPaused === true,
        campaignId: typeof parsed.campaignId === 'string' ? parsed.campaignId : undefined,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearLiveSessionMarker() {
  try {
    localStorage.removeItem(LIVE_SESSION_MARKER_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(LIVE_SESSION_MARKER_UPDATED_EVENT));
    }
  } catch {
    // ignore
  }
}

export function clearLiveSessionState(sessionId: string) {
  try {
    sessionStorage.removeItem(storageKey(sessionId));
  } catch {
    // ignore
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveSessionState(sessionId: string) {
  const [state, setState] = useState<PersistedLiveState>(() => loadState(sessionId));

  // Persist whenever state changes
  useEffect(() => {
    saveState(sessionId, state);
  }, [sessionId, state]);

  const setCurrentLocationId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, currentLocationId: id }));
  }, []);

  const openCard = useCallback((entityId: string) => {
    setState((prev) => {
      const without = prev.openCardIds.filter((id) => id !== entityId);
      const next = [entityId, ...without].slice(0, MAX_OPEN_CARDS);
      return { ...prev, openCardIds: next };
    });
  }, []);

  const closeCard = useCallback((entityId: string) => {
    setState((prev) => ({
      ...prev,
      openCardIds: prev.openCardIds.filter((id) => id !== entityId),
    }));
  }, []);

  const setSpotlightState = useCallback((s: SpotlightState) => {
    setState((prev) => ({ ...prev, spotlightState: s }));
  }, []);

  return {
    currentLocationId: state.currentLocationId,
    openCardIds: state.openCardIds,
    spotlightState: state.spotlightState,
    setCurrentLocationId,
    openCard,
    closeCard,
    setSpotlightState,
  };
}
