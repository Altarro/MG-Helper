import { useEffect, useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';

type PaceMode = 'calm' | 'action' | null;

const TICK_MS = 2000;
const BASE_UNITS_PER_TICK = 6;
const MIN_PACE = -100;
const MAX_PACE = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resistanceMultiplier(pace: number): number {
  const abs = Math.abs(pace);
  if (abs <= 20) return 1;
  if (abs <= 60) return 0.5;
  return 0.25;
}

function paceLabel(pace: number): string {
  if (pace <= -60) return 'Za wolno';
  if (pace <= -20) return 'Wolno';
  if (pace < 20) return 'Idealnie';
  if (pace < 60) return 'Szybko';
  return 'Za szybko';
}

function paceZoneIndex(pace: number): 0 | 1 | 2 | 3 | 4 {
  if (pace <= -60) return 0;
  if (pace <= -20) return 1;
  if (pace < 20) return 2;
  if (pace < 60) return 3;
  return 4;
}

interface SessionPacingBarProps {
  globalPaused: boolean;
}

export function SessionPacingBar({ globalPaused }: SessionPacingBarProps) {
  const [pace, setPace] = useState(0);
  const [mode, setMode] = useState<PaceMode>(null);
  const [localPaused, setLocalPaused] = useState(false);

  const isRunning = mode !== null && !localPaused && !globalPaused;

  useEffect(() => {
    if (!isRunning || mode === null) return;

    const direction = mode === 'action' ? 1 : -1;
    const id = window.setInterval(() => {
      setPace((prev) => {
        const step = BASE_UNITS_PER_TICK * resistanceMultiplier(prev);
        return clamp(prev + direction * step, MIN_PACE, MAX_PACE);
      });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [isRunning, mode]);

  const markerPercent = useMemo(() => ((pace - MIN_PACE) / (MAX_PACE - MIN_PACE)) * 100, [pace]);
  const stateLabel = paceLabel(pace);
  const activeZone = paceZoneIndex(pace);

  return (
    <div className="rounded-xl border border-surface-200 bg-white px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-surface-500">Pacing</span>
        <button
          type="button"
          onClick={() => setLocalPaused((prev) => !prev)}
          aria-label={localPaused ? 'Wznów pacing' : 'Pauza pacingu'}
          disabled={globalPaused}
          className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
            localPaused
              ? 'border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100'
              : 'border-surface-300 bg-white text-surface-600 hover:bg-surface-50'
          } ${globalPaused ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          {localPaused ? (
            <>
              <Play className="h-3 w-3" /> Wznów
            </>
          ) : (
            <>
              <Pause className="h-3 w-3" /> Pauza
            </>
          )}
        </button>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode('calm')}
          className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            mode === 'calm' ? 'bg-blue-100 text-blue-800' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
          }`}
        >
          Spokój
        </button>

        <div className="relative h-2 flex-1 rounded-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500">
          <div
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-surface-900 shadow"
            style={{ left: `calc(${markerPercent}% - 8px)` }}
            aria-label={`Pacing: ${stateLabel}`}
            role="img"
          />
        </div>

        <button
          type="button"
          onClick={() => setMode('action')}
          className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            mode === 'action' ? 'bg-red-100 text-red-800' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
          }`}
        >
          Akcja
        </button>
      </div>

      <div className="grid grid-cols-5 text-center text-[10px]">
        <span className={activeZone === 0 ? 'font-semibold text-blue-600' : 'text-surface-500'}>Za wolno</span>
        <span className={activeZone === 1 ? 'font-semibold text-cyan-600' : 'text-surface-500'}>Wolno</span>
        <span className={activeZone === 2 ? 'font-semibold text-green-600' : 'text-surface-500'}>Idealnie</span>
        <span className={activeZone === 3 ? 'font-semibold text-amber-500' : 'text-surface-500'}>Szybko</span>
        <span className={activeZone === 4 ? 'font-semibold text-red-600' : 'text-surface-500'}>Za szybko</span>
      </div>
    </div>
  );
}
