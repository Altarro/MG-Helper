import { useState, useEffect } from 'react';
import { Zap, Pause, Play } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  getLiveSessionMarker,
  setLiveSessionMarker,
  type LiveSessionMarker,
} from '@modules/sessions/hooks/useLiveSessionState';

/**
 * Shows a live session indicator in the TopBar when a session is active.
 * Reads from localStorage['mg-live-session'].
 * - Click name → navigate to /sessions/:id/live
 * - ⏸/▶ → toggle isPaused in localStorage
 */
export function LiveSessionIndicator() {
  const navigate = useNavigate();
  const [marker, setMarker] = useState<LiveSessionMarker | null>(() => getLiveSessionMarker());

  // Sync with localStorage changes (other tabs / window focus)
  useEffect(() => {
    function sync() {
      setMarker(getLiveSessionMarker());
    }
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    // Also poll briefly after mount to catch stale state
    const t = setTimeout(sync, 200);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      clearTimeout(t);
    };
  }, []);

  if (!marker) return null;

  function handleTogglePause() {
    if (!marker) return;
    const updated: LiveSessionMarker = { ...marker, isPaused: !marker.isPaused };
    setLiveSessionMarker(updated);
    setMarker(updated);
  }

  function handleNavigate() {
    navigate(`/sessions/${marker!.sessionId}/live`);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs">
      <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      <button
        type="button"
        onClick={handleNavigate}
        className="max-w-[120px] truncate font-medium text-amber-800 hover:underline"
        title={`Sesja na żywo: ${marker.sessionName}`}
      >
        {marker.sessionName}
      </button>
      <button
        type="button"
        onClick={handleTogglePause}
        aria-label={marker.isPaused ? 'Wznów sesję' : 'Pauzuj sesję'}
        className="ml-0.5 rounded p-0.5 text-amber-600 hover:text-amber-800"
      >
        {marker.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
      </button>
    </div>
  );
}
