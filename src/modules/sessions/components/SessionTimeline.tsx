import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import { useSessionEvents } from '../hooks/useSessionEvents';
import { useSessionSignals } from '../hooks/useSessionSignals';
import { getSessionEventData } from '@shared/utils/entityData';
import type { SessionEvent } from '../types';

interface SessionTimelineProps {
  sessionId: string;
  onSignalSelect?: (signal: SessionEvent) => void;
}

function formatEventTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function signalActionLabel(signalType: string | undefined): string {
  if (signalType === 'entity_died_in_session') return 'Nie żyje';
  if (signalType === 'threat_status_changed') return 'Zmiana statusu zagrożenia';
  if (signalType === 'entity_added_to_session') return 'Dodano do sesji';
  if (signalType === 'entity_removed_from_session') return 'Usunięto z sesji';
  if (signalType === 'entity_updated_in_session') return 'Zmieniono encję';
  return 'Sygnał systemowy';
}

function signalSourceLabel(source: unknown): string {
  if (typeof source !== 'string') return 'Automat';
  const normalized = source.trim().toLowerCase();
  if (normalized.includes('manual')) return 'Manual';
  if (normalized.includes('system')) return 'System';
  if (normalized.includes('automat') || normalized.includes('auto')) return 'Automat';
  return 'Automat';
}

export function SessionTimeline({ sessionId, onSignalSelect }: SessionTimelineProps) {
  const { events, addEvent, removeEvent } = useSessionEvents(sessionId);
  const { events: signalEvents } = useSessionSignals(sessionId);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSignalDetails, setShowSignalDetails] = useState(false);

  const timelineItems = [
    ...events.map((eventItem) => ({ kind: 'timeline' as const, eventItem })),
    ...signalEvents.map((eventItem) => ({ kind: 'signal' as const, eventItem })),
  ].sort((a, b) => {
    const ta = getSessionEventData(a.eventItem).timestamp;
    const tb = getSessionEventData(b.eventItem).timestamp;
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timelineItems.length]);

  async function handleAdd() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await addEvent(text);
      setDraft('');
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleAdd();
    }
  }

  return (
    <div className="text-surface-900 flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[rgba(86,93,94,0.1)] bg-[rgba(223,225,218,0.58)] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(33,71,102,0.09)]">
          <Clock className="text-primary-700 h-4 w-4" />
        </div>
        <span className="text-primary-900 text-sm font-semibold tracking-[-0.02em]">Oś czasu</span>
        <span className="app-pill-muted ml-auto rounded-full px-2.5 py-1 text-xs">
          {timelineItems.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3">
        {timelineItems.length === 0 && (
          <p className="text-surface-500 mt-4 text-center text-xs">
            Brak wpisów — dodaj pierwsze zdarzenie
          </p>
        )}

        {timelineItems.map(({ kind, eventItem }) => {
          const data = getSessionEventData(eventItem);
          const signalSource = signalSourceLabel(data.metadata?.source);
          const signalSummary = `${data.entityName ?? 'Encja'} — ${signalActionLabel(data.signalType)} (${signalSource})`;
          const isSignal = kind === 'signal';
          const fromValue = typeof data.metadata?.from === 'string' ? data.metadata.from : null;
          const toValue = typeof data.metadata?.to === 'string' ? data.metadata.to : null;

          return (
            <div
              key={eventItem.id}
              className="group relative flex gap-3 rounded-2xl border border-transparent bg-[rgba(223,225,218,0.4)] px-3 py-2.5 transition-colors hover:border-[rgba(86,93,94,0.12)] hover:bg-[rgba(223,225,218,0.74)]"
            >
              <span className="text-surface-500 mt-0.5 shrink-0 font-mono text-xs">
                {formatEventTime(data.timestamp)}
              </span>
              {isSignal ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowSignalDetails((value) => !value);
                    onSignalSelect?.(eventItem);
                  }}
                  className="text-left min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                  aria-label={`Sygnał: ${signalSummary}`}
                >
                  <span className="text-surface-800 block text-sm leading-6 break-words">
                    {signalSummary}
                  </span>
                  {showSignalDetails && (
                    <span className="text-surface-600 block text-xs">
                      {fromValue && toValue ? `before: ${fromValue} → after: ${toValue}` : data.text}
                    </span>
                  )}
                </button>
              ) : (
                <>
                  <span className="text-surface-800 min-w-0 flex-1 text-sm leading-6 break-words">
                    {data.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeEvent(eventItem.id)}
                    aria-label="Usuń zdarzenie"
                    className="text-surface-500 hover:text-danger-700 ml-1 shrink-0 rounded-xl p-1 opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:bg-[rgba(176,108,103,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[rgba(86,93,94,0.1)] bg-[rgba(223,225,218,0.58)] p-3">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz zdarzenie... (Enter = dodaj)"
            rows={2}
            className="app-input text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:ring-primary-500/20 flex-1 resize-none rounded-2xl px-3 py-2 text-xs focus:ring-2 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!draft.trim() || saving}
            aria-label="Dodaj zdarzenie"
            className="app-button-primary flex items-center justify-center rounded-2xl px-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
