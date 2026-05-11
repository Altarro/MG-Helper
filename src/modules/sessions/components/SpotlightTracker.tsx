import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, UserCheck, Pause, Play, Info } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { NpcPreviewModal } from './NpcPreviewModal';
import type { SpotlightState, SpotlightPlayer, TimerState } from '../types';

// ── Thresholds (seconds) ──────────────────────────────────────────────────────
const YELLOW_THRESHOLD = 5 * 60;
const ORANGE_THRESHOLD = 10 * 60;
const RED_THRESHOLD = 15 * 60;

function waitTimerColor(seconds: number): string {
  if (seconds < YELLOW_THRESHOLD) return 'bg-green-100 text-green-800 border-green-200';
  if (seconds < ORANGE_THRESHOLD) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (seconds < RED_THRESHOLD) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function waitTimerDot(seconds: number): string {
  if (seconds < YELLOW_THRESHOLD) return 'bg-green-500';
  if (seconds < ORANGE_THRESHOLD) return 'bg-yellow-500';
  if (seconds < RED_THRESHOLD) return 'bg-orange-500';
  return 'bg-red-500';
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Timer utilities ─────────────────────────────────────────────────────
function timerNow(t: TimerState): number {
  if (!t.startedAt) return t.elapsed;
  return t.elapsed + Math.floor((Date.now() - Date.parse(t.startedAt)) / 1000);
}

function timerStart(elapsed: number): TimerState {
  return { elapsed, startedAt: new Date().toISOString() };
}

function timerPause(t: TimerState): TimerState {
  return { elapsed: timerNow(t), startedAt: null };
}

function timerZero(): TimerState {
  return { elapsed: 0, startedAt: null };
}

function timerRunning(elapsed: number): TimerState {
  return timerStart(elapsed);
}

// ── Player state ──────────────────────────────────────────────────────────────

// ── SpotlightTracker ──────────────────────────────────────────────────────────

interface SpotlightTrackerProps {
  sessionId: string;
  state: SpotlightState;
  onChange: (s: SpotlightState) => void;
  isPaused?: boolean;
  onPauseChange?: (isPaused: boolean) => void;
}

function setSpotlightPaused(state: SpotlightState, isPaused: boolean): SpotlightState {
  if (state.isPaused === isPaused) return state;

  if (!isPaused) {
    const resumeTimer = (t: TimerState): TimerState =>
      t.startedAt !== null || t.elapsed > 0 ? timerRunning(timerNow(t)) : t;
    return {
      ...state,
      isPaused: false,
      mgTimer: resumeTimer(state.mgTimer),
      mgTotalActiveTimer: state.mgActive ? resumeTimer(state.mgTotalActiveTimer) : state.mgTotalActiveTimer,
      players: state.players.map((p) => ({
        ...p,
        waitTimer: resumeTimer(p.waitTimer),
        totalActiveTimer: p.active ? resumeTimer(p.totalActiveTimer) : p.totalActiveTimer,
      })),
    };
  }

  return {
    ...state,
    isPaused: true,
    mgTimer: timerPause(state.mgTimer),
    mgTotalActiveTimer: timerPause(state.mgTotalActiveTimer),
    players: state.players.map((p) => ({
      ...p,
      waitTimer: timerPause(p.waitTimer),
      totalActiveTimer: timerPause(p.totalActiveTimer),
    })),
  };
}

export function SpotlightTracker({ sessionId, state, onChange, isPaused, onPauseChange }: SpotlightTrackerProps) {
  const { db } = useCampaign();
  const [spotlight, setSpotlight] = useState<SpotlightState>(() => state);
  const [, forceRender] = useState(0);
  const [previewNpcId, setPreviewNpcId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load PC characters that appear_in this session
  const playerEntities = useLiveQuery(async () => {
    const sessionRels = await db.relations
      .where('targetId').equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const sessionEntityIds = new Set(sessionRels.map((r) => r.sourceId));
    const allNpcs = await db.entities.where('type').equals('npc').toArray();
    return allNpcs.filter(
      (e) => (e.data as { isPC?: boolean }).isPC === true && sessionEntityIds.has(e.id),
    );
  }, [db, sessionId]);

  // Sync players: remove stale, add new with zeroed timers, update names
  useEffect(() => {
    if (!playerEntities) return;
    setSpotlight((prev) => {
      const validIds = new Set(playerEntities.map((e) => e.id));
      const kept = prev.players
        .filter((p) => validIds.has(p.id))
        .map((p) => {
          const entity = playerEntities.find((e) => e.id === p.id);
          if (!entity) return p;
          return { ...p, name: entity.name, playerName: (entity.data as { playerName?: string }).playerName };
        });
      const existingIds = new Set(kept.map((p) => p.id));
      const added = playerEntities
        .filter((e) => !existingIds.has(e.id))
        .map((e): SpotlightPlayer => ({
          id: e.id,
          name: e.name,
          playerName: (e.data as { playerName?: string }).playerName,
          active: false,
          // If session already started, new players' wait timers run immediately
          waitTimer: prev.sessionStarted ? timerRunning(0) : timerZero(),
          totalActiveTimer: timerZero(),
        }));
      return { ...prev, players: [...kept, ...added] };
    });
  }, [playerEntities]);

  // Safety rule: if nobody is active, automatically give turn to MG.
  useEffect(() => {
    setSpotlight((prev) => {
      if (prev.isPaused) return prev;
      const anyPlayerActive = prev.players.some((player) => player.active);
      if (anyPlayerActive || prev.mgActive) return prev;
      return {
        ...prev,
        mgActive: true,
        mgTimer: timerZero(),
        mgTotalActiveTimer: timerRunning(timerNow(prev.mgTotalActiveTimer)),
        sessionStarted: true,
      };
    });
  }, [spotlight.players, spotlight.mgActive, spotlight.isPaused]);

  // Persist spotlight state via onChange
  useEffect(() => {
    onChange(spotlight);
  }, [spotlight, onChange]);

  useEffect(() => {
    if (typeof isPaused !== 'boolean') return;
    setSpotlight((prev) => setSpotlightPaused(prev, isPaused));
  }, [isPaused]);

  // Tick every 100ms to keep display smooth
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSpotlight((prev) => {
        if (prev.isPaused) return prev;
        return prev; // timers are live-computed, just trigger re-render
      });
      forceRender((n) => n + 1);
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Click handlers ──────────────────────────────────────────────────────────

  const handlePlayerClick = useCallback((playerId: string) => {
    setSpotlight((prev) => {
      if (prev.isPaused) return prev;
      const isFirst = !prev.sessionStarted;

      // On first ever click — thaw all inactive waitTimers
      let base = prev;
      if (isFirst) {
        base = {
          ...prev,
          sessionStarted: true,
          mgTimer: prev.mgActive ? prev.mgTimer : timerRunning(0),
          players: prev.players.map((p) =>
            p.active ? p : { ...p, waitTimer: timerRunning(0) },
          ),
        };
      }

      const players = base.players.map((p) => {
        if (p.id !== playerId) return p;
        if (p.active) {
          // Deactivate: pause totalActive, start waitTimer from 0
          return {
            ...p,
            active: false,
            totalActiveTimer: timerPause(p.totalActiveTimer),
            waitTimer: timerRunning(0),
          };
        } else {
          // Activate: zero out waitTimer, resume totalActive
          return {
            ...p,
            active: true,
            waitTimer: timerZero(),
            totalActiveTimer: timerRunning(timerNow(p.totalActiveTimer)),
          };
        }
      });

      const targetPlayer = players.find((p) => p.id === playerId);
      let mgActive = base.mgActive;
      let mgTimer = base.mgTimer;
      let mgTotalActiveTimer = base.mgTotalActiveTimer;

      if (targetPlayer?.active && base.mgActive) {
        // Activating a player deactivates MG
        mgActive = false;
        mgTimer = timerRunning(timerNow(base.mgTimer));
        mgTotalActiveTimer = timerPause(base.mgTotalActiveTimer);
      }

      return { ...base, players, mgActive, mgTimer, mgTotalActiveTimer };
    });
  }, []);

  const handleMgClick = useCallback(() => {
    setSpotlight((prev) => {
      if (prev.isPaused) return prev;
      const isFirst = !prev.sessionStarted;

      if (prev.mgActive) {
        // Deactivate MG — pause totalActive, start waitTimer
        return {
          ...prev,
          mgActive: false,
          mgTimer: timerRunning(timerNow(prev.mgTimer)),
          mgTotalActiveTimer: timerPause(prev.mgTotalActiveTimer),
        };
      } else {
        // Activate MG — deactivate all players (their waitTimers CONTINUE, not reset)
        const players = prev.players.map((p) => {
          if (!p.active) {
            // Start wait for idle players on first action
            if (isFirst && !p.waitTimer.startedAt) {
              return { ...p, waitTimer: timerRunning(0) };
            }
            return p;
          }
          return {
            ...p,
            active: false,
            totalActiveTimer: timerPause(p.totalActiveTimer),
            waitTimer: timerRunning(timerNow(p.waitTimer)),
          };
        });
        return {
          ...prev,
          mgActive: true,
          mgTimer: timerZero(),
          mgTotalActiveTimer: timerRunning(timerNow(prev.mgTotalActiveTimer)),
          players,
          sessionStarted: true,
        };
      }
    });
  }, []);

  const handlePauseToggle = useCallback(() => {
    const nextPaused = !spotlight.isPaused;
    setSpotlight((prev) => setSpotlightPaused(prev, nextPaused));
    onPauseChange?.(nextPaused);
  }, [onPauseChange, spotlight.isPaused]);

  if (!playerEntities) return null;

  const mgWaitSec = timerNow(spotlight.mgTimer);
  const mgActiveSec = timerNow(spotlight.mgTotalActiveTimer);

  return (
    <div className="flex flex-col gap-2">
      {/* Controls row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-surface-500">Spotlight</span>
        <button
          type="button"
          onClick={handlePauseToggle}
          aria-label={spotlight.isPaused ? 'Wznów' : 'Pauza'}
          className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
            spotlight.isPaused
              ? 'border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100'
              : 'border-surface-300 bg-white text-surface-600 hover:bg-surface-50'
          }`}
        >
          {spotlight.isPaused ? (
            <><Play className="h-3 w-3" /> Wznów</>
          ) : (
            <><Pause className="h-3 w-3" /> Pauza</>
          )}
        </button>
      </div>

      {playerEntities.length === 0 && (
        <p className="text-xs text-surface-400">
          Brak postaci graczy — oznacz postacie flagą „Gracz".
        </p>
      )}

      {/* MG row */}
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-1 text-[11px] font-medium text-surface-500">
          <UserCheck className="h-3 w-3" /> Mistrz Gry
        </p>
        <button
          type="button"
          onClick={handleMgClick}
          title={spotlight.mgActive ? 'MG mówi — kliknij aby oddać' : 'Kliknij — MG bierze głos'}
          className={`flex items-center gap-2 rounded-md border px-2 py-1 text-left transition-colors hover:opacity-80 ${
            spotlight.mgActive
              ? 'border-blue-300 bg-blue-100 text-blue-800'
              : waitTimerColor(mgWaitSec)
          }`}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              spotlight.mgActive ? 'bg-blue-500' : waitTimerDot(mgWaitSec)
            }`}
          />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium">Mistrz Gry</span>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className={`font-mono text-xs font-medium tabular-nums${spotlight.mgActive ? ' text-blue-700' : ''}`}>
              {spotlight.mgActive ? 'Gra' : formatTime(mgWaitSec)}
            </span>
            <span className="font-mono text-xs tabular-nums text-surface-400">
              {formatTime(mgActiveSec)}
            </span>
          </div>
        </button>
      </div>

      {/* Players */}
      {spotlight.players.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1 text-[11px] font-medium text-surface-500">
            <Users className="h-3 w-3" /> Gracze
          </p>
          {spotlight.players.map((p) => {
            const waitSec = timerNow(p.waitTimer);
            const activeSec = timerNow(p.totalActiveTimer);
            const colorClass = p.active
              ? 'border-blue-300 bg-blue-100 text-blue-800'
              : waitTimerColor(waitSec);
            return (
              <div
                key={p.id}
                className={`group flex items-center rounded-md border transition-colors ${colorClass}`}
              >
                <button
                  type="button"
                  onClick={() => setPreviewNpcId(p.id)}
                  aria-label="Podgląd postaci"
                  className="ml-1 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePlayerClick(p.id)}
                  title={p.active ? 'Aktywny — kliknij aby oddać spotlight' : 'Kliknij — daj spotlight'}
                  className="flex flex-1 items-center gap-2 px-2 py-1 text-left hover:opacity-80"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      p.active ? 'bg-blue-500' : waitTimerDot(waitSec)
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium">{p.name}</span>
                    {p.playerName && (
                      <span className="block truncate text-[11px] opacity-70">{p.playerName}</span>
                    )}
                  </span>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className={`font-mono text-xs font-medium tabular-nums${p.active ? ' text-blue-700' : ''}`}>
                      {p.active ? 'Gra' : formatTime(waitSec)}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-surface-400">
                      {formatTime(activeSec)}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {previewNpcId && (
        <NpcPreviewModal npcId={previewNpcId} sessionId={sessionId} onClose={() => setPreviewNpcId(null)} />
      )}
    </div>
  );
}
