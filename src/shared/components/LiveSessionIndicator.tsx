import { useState, useEffect } from 'react';
import { Zap, Pause, Play } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  getLiveSessionMarker,
  setLiveSessionMarker,
  type LiveSessionMarker,
} from '@modules/sessions/hooks/useLiveSessionState';

export function LiveSessionIndicator() {
  const navigate = useNavigate();
  const [marker, setMarker] = useState<LiveSessionMarker | null>(() => getLiveSessionMarker());

  useEffect(() => {
    function sync() {
      setMarker(getLiveSessionMarker());
    }
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
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
    if (!marker) return;
    navigate(`/sessions/${marker.sessionId}/live`);
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[rgba(210,166,67,0.55)] bg-[linear-gradient(180deg,rgba(242,196,88,0.22)_0%,rgba(242,196,88,0.12)_100%)] px-2.5 py-1 text-xs shadow-[0_6px_16px_rgba(210,166,67,0.16)]">
      <Zap className="h-3.5 w-3.5 shrink-0 text-warning-600" />
      <button
        type="button"
        onClick={handleNavigate}
        className="max-w-[140px] truncate font-medium text-[#7f5b12] hover:underline"
        title={`Sesja na żywo: ${marker.sessionName}`}
      >
        {marker.sessionName}
      </button>
      <button
        type="button"
        onClick={handleTogglePause}
        aria-label={marker.isPaused ? 'Wznów sesję' : 'Pauzuj sesję'}
        className="ml-0.5 rounded-full p-0.5 text-[#9a7019] transition-colors hover:text-[#6d4e10]"
      >
        {marker.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
      </button>
    </div>
  );
}
