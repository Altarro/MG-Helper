import { useEffect, useMemo, useState } from 'react';
import type { SessionScene } from '../types';
import { Modal } from '@shared/components/Modal';

interface SessionNowPlayingPanelProps {
  scenes: SessionScene[];
  plannedDurationMin?: number;
  isPaused?: boolean;
}

function formatHms(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Sesja ≤ 60 min: `mm:ss`. Powyżej: `h:mm:ss` (godziny bez zerowania do 2 cyfr). */
function formatSessionElapsedTotal(totalSeconds: number, useHours: boolean): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  if (useHours) return formatHms(safe);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Oś „było / jest / będzie”: każdy koniec osobno — do 60 min włącznie `mm:ss`, potem `h:mm:ss` (np. `50:00 - 1:01:00`). */
function formatTimelinePosition(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  if (safe > 60 * 60) return formatHms(safe);
  return formatMmSs(safe);
}

function formatSignedMmSs(totalSeconds: number): string {
  const sign = totalSeconds >= 0 ? '+' : '-';
  return `${sign}${formatMmSs(Math.abs(totalSeconds))}`;
}

export function SessionNowPlayingPanel({ scenes, plannedDurationMin, isPaused = false }: SessionNowPlayingPanelProps) {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  useEffect(() => {
    setActiveSceneIndex((prev) => {
      if (scenes.length === 0) return 0;
      return Math.min(prev, scenes.length - 1);
    });
  }, [scenes.length]);

  const prevScene = activeSceneIndex > 0 ? scenes[activeSceneIndex - 1] : null;
  const currentScene = scenes[activeSceneIndex] ?? null;
  const nextScene = activeSceneIndex < scenes.length - 1 ? scenes[activeSceneIndex + 1] : null;

  const indexLabel = useMemo(() => {
    if (scenes.length === 0) return '';
    return `${activeSceneIndex + 1}/${scenes.length}`;
  }, [activeSceneIndex, scenes.length]);

  const sceneStartSec = useMemo(() => {
    const starts: number[] = [];
    let cursor = 0;
    for (const scene of scenes) {
      starts.push(cursor);
      const durationMin = Number.isFinite(scene.estimatedDurationMin) ? scene.estimatedDurationMin : 0;
      cursor += Math.max(0, durationMin) * 60;
    }
    return starts;
  }, [scenes]);

  const plannedSessionEndSec = useMemo(() => {
    if (plannedDurationMin && plannedDurationMin > 0) return plannedDurationMin * 60;
    const lastStart = sceneStartSec[sceneStartSec.length - 1] ?? 0;
    const lastDuration = (scenes[scenes.length - 1]?.estimatedDurationMin ?? 0) * 60;
    return lastStart + Math.max(0, lastDuration);
  }, [plannedDurationMin, sceneStartSec, scenes]);

  const sceneCheckpointSec = useMemo(() => {
    return scenes.map((_, index) => {
      const nextStart = sceneStartSec[index + 1];
      if (typeof nextStart === 'number') return nextStart;
      return plannedSessionEndSec;
    });
  }, [plannedSessionEndSec, sceneStartSec, scenes]);

  const sceneRangeSec = useMemo(() => {
    return scenes.map((_, index) => {
      const start = sceneStartSec[index] ?? 0;
      const end = sceneCheckpointSec[index] ?? plannedSessionEndSec;
      return { start, end };
    });
  }, [plannedSessionEndSec, sceneCheckpointSec, sceneStartSec, scenes]);

  useEffect(() => {
    if (isPaused) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPaused]);

  const totalSessionSec = plannedDurationMin ? plannedDurationMin * 60 : plannedSessionEndSec;
  const sessionUsesHourClock = Math.max(elapsedSec, totalSessionSec) > 60 * 60;
  const sessionTimeLabel = `Czas sesji: ${formatSessionElapsedTotal(elapsedSec, sessionUsesHourClock)} / ${formatSessionElapsedTotal(
    totalSessionSec,
    sessionUsesHourClock,
  )}`;
  const currentSceneEndSec = sceneCheckpointSec[activeSceneIndex] ?? plannedSessionEndSec;
  const checkpointDeltaSec = elapsedSec - currentSceneEndSec;

  return (
    <section className="mb-2 rounded-xl border border-surface-200 bg-white p-3" data-testid="session-now-playing">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-surface-500">Teraz gramy</h3>
        {sessionTimeLabel ? (
          <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] text-surface-600">
            {sessionTimeLabel}
          </span>
        ) : null}
      </div>

      {scenes.length === 0 ? (
        <p className="text-xs text-surface-500">Brak scen. Dodaj je w Sesja → Sceny.</p>
      ) : (
        <>
          <div className="mb-2 space-y-1.5">
            <div>
              <div className="flex min-h-[18px] items-center justify-between gap-2">
                <p className="truncate text-xs italic text-surface-500">{prevScene?.name ?? ''}</p>
                {prevScene ? (
                  <span className="shrink-0 text-[9px] text-surface-400">
                    {`${formatTimelinePosition(sceneRangeSec[Math.max(0, activeSceneIndex - 1)]?.start ?? 0)} - ${formatTimelinePosition(
                      sceneRangeSec[Math.max(0, activeSceneIndex - 1)]?.end ?? 0,
                    )}`}
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                {currentScene?.goal ? (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionOpen(true)}
                    className="min-w-0 flex-1 truncate pl-1 text-left text-sm font-semibold text-surface-900 hover:text-primary-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 rounded-sm"
                  >
                    {currentScene.name}
                  </button>
                ) : (
                  <p className="min-w-0 flex-1 truncate pl-1 text-sm font-semibold text-surface-900">{currentScene?.name}</p>
                )}
                {currentScene ? (
                  <span className="shrink-0 text-[12px] font-bold text-surface-500">
                    {`${formatTimelinePosition(sceneRangeSec[activeSceneIndex]?.start ?? 0)} - ${formatTimelinePosition(
                      sceneRangeSec[activeSceneIndex]?.end ?? 0,
                    )}`}
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <div className="flex min-h-[18px] items-center justify-between gap-2">
                <p className="truncate text-xs italic text-surface-500">{nextScene?.name ?? ''}</p>
                {nextScene ? (
                  <span className="shrink-0 text-[9px] text-surface-400">
                    {`${formatTimelinePosition(
                      sceneRangeSec[Math.min(sceneRangeSec.length - 1, activeSceneIndex + 1)]?.start ?? 0,
                    )} - ${formatTimelinePosition(
                      sceneRangeSec[Math.min(sceneRangeSec.length - 1, activeSceneIndex + 1)]?.end ?? 0,
                    )}`}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div
              className={`text-[10px] ${
                checkpointDeltaSec > 0
                  ? 'text-amber-600'
                  : checkpointDeltaSec < 0
                    ? 'text-emerald-600'
                    : 'text-surface-500'
              }`}
            >
              ETA: {formatSignedMmSs(checkpointDeltaSec)}
            </div>
            <div className="flex items-center gap-1">
              <div className="mr-1 text-[11px] text-surface-500">{indexLabel}</div>
              <button
                type="button"
                onClick={() => setActiveSceneIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeSceneIndex === 0}
                className="rounded-md border border-surface-300 px-2 py-1 text-[11px] text-surface-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setActiveSceneIndex((prev) => Math.min(scenes.length - 1, prev + 1))}
                disabled={activeSceneIndex >= scenes.length - 1}
                className="rounded-md border border-surface-300 px-2 py-1 text-[11px] text-surface-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
      {currentScene?.goal && isDescriptionOpen && (
        <Modal
          title={currentScene.name}
          size="md"
          onClose={() => setIsDescriptionOpen(false)}
        >
          <p className="text-sm leading-6 text-surface-800 whitespace-pre-wrap">{currentScene.goal}</p>
        </Modal>
      )}
    </section>
  );
}
