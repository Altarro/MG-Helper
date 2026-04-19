import { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { ArrowLeft, Edit2, Trash2, StickyNote, Calendar, Plus } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNoteById } from '../hooks/useNoteById';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { RelationList } from '@shared/components/RelationList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { MarkdownExportButton } from '@shared/components/MarkdownExportButton';
import { deleteEntity, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import type { Entity } from '@shared/types/entity';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';

export function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { note } = useNoteById(id);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const returnToSessionLive = typeof location.state === 'object'
    && location.state !== null
    && 'returnToSessionLive' in location.state
    && typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/notes';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Notatki';

  if (note === undefined) return <LoadingSpinner />;

  if (!note) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Notatka nie znaleziona.</p>
        <Link to="/notes" className="text-primary-600 hover:underline">
          ← Powrót do notatek
        </Link>
      </div>
    );
  }

  const dateStr = note.data.createdAt;
  let formatted = '';
  try {
    const d = parseISO(dateStr);
    if (isValid(d)) formatted = format(d, 'd MMMM yyyy, HH:mm', { locale: pl });
  } catch {
    // ignore
  }

  async function handleSave() {
    const trimmed = editContent.trim();
    if (!trimmed || !note) return;
    setSaving(true);
    try {
      await updateEntity(db, note.id, {
        name: trimmed.slice(0, 60),
        data: { ...note.data, content: trimmed },
      });
      toast.success('Notatka zaktualizowana');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!note) return;
    try {
      await deleteEntity(db, note.id);
      toast.success('Notatka usunięta');
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć');
    }
  }

  function startEdit() {
    setEditContent(note!.data.content);
    setIsEditing(true);
  }

  function handleNavigate(entity: Entity) {
    const detailPath = getEntityDetailPath(entity.type, entity.id);
    if (!detailPath) return;
    navigate(detailPath, {
      state: returnToSessionLive ? { returnToSessionLive } : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={backPath}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <StickyNote className="h-5 w-5 text-amber-500" />
        <span className="ml-auto flex items-center gap-1.5">
          <MarkdownExportButton entity={note} />
          {!isEditing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-50"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edytuj
            </button>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Usuń
          </button>
        </span>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={500}
              rows={6}
              className="w-full resize-none rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !editContent.trim()}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Zapisywanie…' : 'Zapisz'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-surface-300 px-4 py-2 text-sm text-surface-600 hover:bg-surface-50"
              >
                Anuluj
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-surface-800">{note.data.content}</p>
        )}
        {formatted && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-surface-400">
            <Calendar className="h-3.5 w-3.5" />
            {formatted}
          </div>
        )}
      </div>

      {/* Relations */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-700">Powiązania</h3>
          <button
            onClick={() => setShowRelPicker(true)}
            className="flex items-center gap-1 rounded-md border border-surface-200 px-2 py-1 text-xs text-surface-600 hover:bg-surface-50"
          >
            <Plus className="h-3 w-3" /> Dodaj
          </button>
        </div>
        <RelationList entityId={note.id} onNavigate={handleNavigate} />
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń notatkę"
        description="Czy na pewno chcesz usunąć tę notatkę?"
        confirmLabel="Usuń"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {showRelPicker && (
        <RelationPicker
          sourceId={note.id}
          sourceType="note"
          onClose={() => setShowRelPicker(false)}
        />
      )}
    </div>
  );
}
