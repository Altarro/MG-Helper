import { useState } from 'react';
import { StickyNote, MapPin, Plus } from 'lucide-react';
import { addEntity, addRelation } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { useNotesBySession } from '../hooks/useNotesBySession';
import { toast } from 'sonner';
import { nowISO } from '@shared/utils/date';

interface QuickNotePanelProps {
  sessionId: string;
  contextNpcIds?: string[];
  contextThreadIds?: string[];
  contextLocationId?: string | null;
}

export function QuickNotePanel({
  sessionId,
  contextNpcIds = [],
  contextThreadIds = [],
  contextLocationId,
}: QuickNotePanelProps) {
  const { db } = useCampaign();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const recentNotes = useNotesBySession(sessionId);

  async function handleAdd() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const note = await addEntity(db, {
        type: 'note',
        name: trimmed.slice(0, 60),
        description: '',
        tags: [],
        data: {
          content: trimmed,
          sessionId,
          createdAt: nowISO(),
        },
      });

      const relations: Promise<unknown>[] = [
        addRelation(db, { type: 'appears_in', sourceId: note.id, targetId: sessionId }),
      ];

      for (const npcId of contextNpcIds) {
        relations.push(addRelation(db, { type: 'related_to', sourceId: note.id, targetId: npcId }));
      }
      for (const threadId of contextThreadIds) {
        relations.push(
          addRelation(db, { type: 'related_to', sourceId: note.id, targetId: threadId }),
        );
      }
      if (contextLocationId) {
        relations.push(
          addRelation(db, { type: 'related_to', sourceId: note.id, targetId: contextLocationId }),
        );
      }

      await Promise.all(relations);
      toast.success('Notatka dodana');
      setContent('');
    } catch {
      toast.error('Nie udało się dodać notatki');
    } finally {
      setSaving(false);
    }
  }

  const contextParts: string[] = [];
  if (contextLocationId) contextParts.push('Lokacja');
  if (contextNpcIds.length > 0) contextParts.push(`${contextNpcIds.length} NPC`);
  if (contextThreadIds.length > 0) contextParts.push(`${contextThreadIds.length} wąt.`);

  return (
    <div className="flex flex-col gap-3 rounded-[1.45rem] bg-transparent">
      {contextParts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="app-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs">
            {contextLocationId && <MapPin className="text-success-600 h-3 w-3 shrink-0" />}
            {contextParts.join(' / ')}
          </span>
        </div>
      )}

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void handleAdd();
        }}
        placeholder="Szybka notatka... (Ctrl+Enter)"
        maxLength={500}
        rows={4}
        className="app-input text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:ring-primary-500/20 w-full resize-none rounded-2xl px-3 py-3 text-sm leading-6 focus:ring-2 focus:outline-none"
      />

      <button
        onClick={handleAdd}
        disabled={saving || !content.trim()}
        className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {saving ? 'Zapisywanie...' : 'Dodaj notatkę'}
      </button>

      {recentNotes && recentNotes.length > 0 && (
        <div className="mt-1 flex flex-col gap-2">
          <p className="text-surface-500 text-[11px] font-semibold tracking-[0.18em] uppercase">
            Ostatnie notatki
          </p>
          {recentNotes.slice(0, 5).map((note) => (
            <div
              key={note.id}
              className="text-surface-800 rounded-2xl border border-[rgba(210,166,67,0.18)] bg-[rgba(242,196,88,0.08)] px-3 py-2 text-xs leading-6"
            >
              <StickyNote className="mr-1 mb-0.5 inline h-3 w-3 text-[#c28b1a]" />
              {note.data.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
