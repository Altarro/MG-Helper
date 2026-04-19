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
        relations.push(
          addRelation(db, { type: 'related_to', sourceId: note.id, targetId: npcId }),
        );
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
    <div className="flex flex-col gap-2 rounded-xl border border-surface-200 bg-white p-3 shadow-sm">
      {/* Context chips */}
      {contextParts.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-0.5 text-xs text-surface-600">
            {contextLocationId && <MapPin className="h-3 w-3 text-green-600 shrink-0" />}
            {contextParts.join(' / ')}
          </span>
        </div>
      )}

      {/* Textarea + add button */}
      <div className="flex gap-1.5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void handleAdd();
          }}
          placeholder="Szybka notatka… (Ctrl+Enter)"
          maxLength={500}
          rows={3}
          className="flex-1 resize-none rounded-lg border border-surface-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
        />
      </div>
      <button
        onClick={handleAdd}
        disabled={saving || !content.trim()}
        className="flex items-center gap-1 rounded-lg bg-primary-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {saving ? '…' : 'Dodaj notatkę'}
      </button>

      {/* Last 5 notes preview */}
      {recentNotes && recentNotes.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">
            Ostatnie notatki
          </p>
          {recentNotes.slice(0, 5).map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-amber-200/70 bg-amber-50 px-2 py-1 text-xs text-surface-700"
            >
              <StickyNote className="mb-0.5 inline h-3 w-3 text-amber-500" />{' '}
              {note.data.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
