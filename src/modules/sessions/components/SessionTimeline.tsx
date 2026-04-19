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

  // Auto-scroll to bottom when new events are added
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleAdd();
    }
  }

  return (
    <div className="flex h-full flex-col bg-white text-surface-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-surface-200 bg-surface-50 px-3 py-2.5">
        <Clock className="h-4 w-4 text-surface-500" />
        <span className="text-sm font-semibold text-surface-800">Oś czasu</span>
        <span className="ml-auto rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
          {events.length}
        </span>
      </div>

      {/* Events list */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        {events.length === 0 && (
          <p className="mt-4 text-center text-xs text-surface-400">
            Brak wpisów — dodaj pierwsze zdarzenie
          </p>
        )}
        {events.map((event) => {
          const data = event.data;
          return (
            <div key={event.id} className="group relative flex gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:border-surface-200 hover:bg-surface-50">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-surface-400">
                {formatEventTime(data.timestamp)}
              </span>
              <span className="min-w-0 flex-1 break-words text-sm text-surface-800">
                {data.text}
              </span>
              <button
                type="button"
                onClick={() => void removeEvent(event.id)}
                aria-label="Usuń zdarzenie"
                className="invisible ml-1 shrink-0 rounded p-0.5 text-surface-400 hover:text-red-500 group-hover:visible"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-surface-200 bg-surface-50/70 p-2">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz zdarzenie… (Enter = dodaj)"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-surface-300 bg-white px-2 py-1.5 text-xs text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!draft.trim() || saving}
            aria-label="Dodaj zdarzenie"
            className="flex items-center justify-center rounded-lg bg-primary-500 p-2 text-white hover:bg-primary-600 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
