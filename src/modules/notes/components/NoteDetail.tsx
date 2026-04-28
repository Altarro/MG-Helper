import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Calendar, Edit2, Plus, StickyNote, Trash2 } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNoteById } from '../hooks/useNoteById';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { DetailSection } from '@shared/components/DetailSection';
import { DetailScrollTopFab } from '@shared/components/DetailScrollTopFab';
import { DetailTocBar } from '@shared/components/DetailTocBar';
import { DetailNotFound } from '@shared/components/DetailNotFound';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { MarkdownExportButton } from '@shared/components/MarkdownExportButton';
import { RelationList } from '@shared/components/RelationList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { deleteEntity, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';
import type { Entity } from '@shared/types/entity';

export function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { note } = useNoteById(id);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRelationPicker, setShowRelationPicker] = useState(false);

  const returnToSessionLive =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnToSessionLive' in location.state &&
    typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/notes';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Notatki';

  const noteTocItems = useMemo(
    () => [
      { id: 'note-detail-tresc', label: 'Treść' },
      { id: 'note-detail-relacje', label: 'Relacje' },
    ],
    [],
  );

  if (note === undefined) return <LoadingSpinner />;

  if (!note) {
    return (
      <DetailNotFound
        icon={StickyNote}
        title="Notatka nie znaleziona"
        description="Mogła zostać usunięta albo odnośnik jest nieaktualny."
        to={backPath}
        linkLabel={returnToSessionLive ? 'Wróć do sesji na żywo' : 'Wróć do listy notatek'}
      />
    );
  }

  const currentNote = note;
  const parsedDate = parseISO(currentNote.data.createdAt);
  const formattedDate = isValid(parsedDate)
    ? format(parsedDate, 'd MMMM yyyy, HH:mm', { locale: pl })
    : '';

  async function handleSave() {
    const trimmed = editContent.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      await updateEntity(db, currentNote.id, {
        name: trimmed.slice(0, 60),
        data: { ...currentNote.data, content: trimmed },
      });
      toast.success('Notatka zaktualizowana');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać notatki');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, currentNote.id);
      toast.success('Notatka została usunięta');
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć notatki');
    }
  }

  function startEditing() {
    setEditContent(currentNote.data.content);
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
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        to={backPath}
        className="text-surface-500 hover:text-primary-700 flex w-fit items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="app-panel-strong flex flex-col gap-5 rounded-[1.9rem] border border-white/40 px-6 py-6 shadow-[0_28px_60px_rgba(18,45,66,0.12)] lg:flex-row lg:items-start lg:justify-between lg:px-7">
        <div className="flex items-center gap-4">
          <div className="rounded-[1.25rem] border border-amber-200/70 bg-amber-100/70 p-3 text-amber-800 shadow-[0_14px_28px_rgba(210,166,67,0.14)]">
            <StickyNote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-surface-900 text-3xl font-semibold tracking-[-0.03em]">
              {currentNote.name}
            </h1>
            {formattedDate && (
              <div className="text-surface-600 mt-3 inline-flex items-center gap-2 rounded-full border border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.72)] px-3 py-1 text-xs font-medium">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <MarkdownExportButton entity={currentNote} />
          {!isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edytuj
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="app-button-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Usuń
          </button>
        </div>
      </div>

      <DetailTocBar ariaLabel="Sekcje notatki" items={noteTocItems} />

      <DetailSection
        sectionId="note-detail-tresc"
        title="Treść notatki"
        description="Szybka, robocza notatka MG z sesji albo przygotowań."
        tone="accent"
      >
        {isEditing ? (
          <div className="flex flex-col gap-4">
            <textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              maxLength={500}
              rows={9}
              className="app-input text-surface-800 focus:border-primary-500 min-h-[220px] w-full rounded-[1.25rem] px-4 py-4 text-sm leading-7 focus:outline-none"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="app-button-secondary rounded-2xl px-4 py-3 text-sm font-medium"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || !editContent.trim()}
                className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium disabled:opacity-50"
              >
                {isSaving ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
          </div>
        ) : (
          <div className="app-panel rounded-[1.45rem] px-5 py-5 shadow-[0_14px_28px_rgba(18,45,66,0.06)]">
            <p className="text-surface-800 text-sm leading-7 whitespace-pre-wrap">
              {currentNote.data.content}
            </p>
          </div>
        )}
      </DetailSection>

      <DetailSection
        sectionId="note-detail-relacje"
        title="Relacje"
        description="Powiązania notatki z innymi fragmentami kampanii."
        action={
          <button
            type="button"
            onClick={() => setShowRelationPicker(true)}
            className="app-button-secondary inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Dodaj relację
          </button>
        }
      >
        <RelationList entityId={currentNote.id} onNavigate={handleNavigate} />
      </DetailSection>

      <DetailScrollTopFab />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Usuń notatkę"
        description="Czy na pewno chcesz usunąć tę notatkę?"
        confirmLabel="Usuń"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showRelationPicker && (
        <RelationPicker
          sourceId={currentNote.id}
          sourceType="note"
          onClose={() => setShowRelationPicker(false)}
        />
      )}
    </div>
  );
}
