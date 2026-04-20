import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import { useSessionEvents } from '../hooks/useSessionEvents';

interface SessionTimelineProps {
  sessionId: string;
}

function formatEventTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function SessionTimeline({ sessionId }: SessionTimelineProps) {
  const { events, addEvent, removeEvent } = useSessionEvents(sessionId);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

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
          {events.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3">
        {events.length === 0 && (
          <p className="text-surface-500 mt-4 text-center text-xs">
            Brak wpisów — dodaj pierwsze zdarzenie
          </p>
        )}

        {events.map((eventItem) => {
          const data = eventItem.data;
          return (
            <div
              key={eventItem.id}
              className="group relative flex gap-3 rounded-2xl border border-transparent bg-[rgba(223,225,218,0.4)] px-3 py-2.5 transition-colors hover:border-[rgba(86,93,94,0.12)] hover:bg-[rgba(223,225,218,0.74)]"
            >
              <span className="text-surface-500 mt-0.5 shrink-0 font-mono text-xs">
                {formatEventTime(data.timestamp)}
              </span>
              <span className="text-surface-800 min-w-0 flex-1 text-sm leading-6 break-words">
                {data.text}
              </span>
              <button
                type="button"
                onClick={() => void removeEvent(eventItem.id)}
                aria-label="Usuń zdarzenie"
                className="text-surface-500 hover:text-danger-700 invisible ml-1 shrink-0 rounded-xl p-1 transition-colors group-hover:visible hover:bg-[rgba(176,108,103,0.1)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
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
            className="app-button-primary flex items-center justify-center rounded-2xl px-3 text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
