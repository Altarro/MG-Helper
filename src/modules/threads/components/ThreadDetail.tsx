import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { ArrowLeft, Edit2, Trash2, BookOpen, Milestone } from 'lucide-react';
import { useThreadById } from '../hooks/useThreadById';
import { useThreadSessions } from '../hooks/useThreadSessions';
import { ThreadForm } from './ThreadForm';
import { DetailNotFound } from '@shared/components/DetailNotFound';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Modal } from '@shared/components/Modal';
import { RelationList } from '@shared/components/RelationList';
import { NotesList } from '@modules/notes/components/NotesList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { MarkdownExportButton } from '@shared/components/MarkdownExportButton';
import { NarrativeLinksSection } from '@shared/components/NarrativeLinksSection';
import { ClueSection } from '@shared/components/ClueSection';
import { DetailSection } from '@shared/components/DetailSection';
import { DetailScrollTopFab } from '@shared/components/DetailScrollTopFab';
import { DetailTocBar } from '@shared/components/DetailTocBar';
import { useRelatedEntities } from '@shared/hooks/useRelatedEntities';
import { deleteEntity, deleteRelation, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { THREAD_KIND_LABELS, THREAD_PRIORITY_LABELS, THREAD_STATUS_LABELS } from '../types';
import {
  getThreadDerivationDirectionLabel,
  getThreadDerivationKindLabel,
  THREAD_DERIVATION_KIND_LABELS,
  THREAD_DERIVATION_KIND_OPTIONS,
} from '@shared/domain/storyContracts';
import { formatDate } from '@shared/utils/date';
import type { ThreadFormValues } from './ThreadForm';
import { ThreadQuestlinePickerModal } from './ThreadQuestlinePickerModal';

const THREAD_RESOLUTION_PRESETS = [
  'Wątek został domknięty przy stole.',
  'Bohaterowie rozwiązali sprawę i ponoszą jej konsekwencje.',
  'Wątek wygasł, ale zostawił otwarte następstwa.',
];

export function ThreadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { thread } = useThreadById(id);
  const sessions = useThreadSessions(id);
  const relatedThreats = useRelatedEntities(id, {
    relationTypes: ['affects'],
    direction: 'both',
    otherTypes: ['threat'],
  });
  const parentThreads = useRelatedEntities(id, {
    relationTypes: ['derives_from'],
    direction: 'outgoing',
    otherTypes: ['thread'],
  });
  const childThreads = useRelatedEntities(id, {
    relationTypes: ['derives_from'],
    direction: 'incoming',
    otherTypes: ['thread'],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const [showThreatPicker, setShowThreatPicker] = useState(false);
  const [showContextLinksPicker, setShowContextLinksPicker] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionResolution, setCompletionResolution] = useState('');
  const [completionResolutionError, setCompletionResolutionError] = useState('');
  const [unlinkConfirm, setUnlinkConfirm] = useState<{
    relationId: string;
    title: string;
    description: string;
  } | null>(null);
  const [questlinePicker, setQuestlinePicker] = useState<{
    mode: 'parent' | 'child';
    initialKind?: (typeof THREAD_DERIVATION_KIND_OPTIONS)[number];
  } | null>(null);
  const returnToSessionLive =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnToSessionLive' in location.state &&
    typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/threads';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Wątki';
  const relatedContextLinks = useRelatedEntities(id, {
    relationTypes: ['related_to'],
    direction: 'both',
    otherTypes: ['faction', 'location', 'npc', 'item'],
  });

  const threadTocItems = useMemo(() => {
    if (!thread || isEditing) return [];
    return [
      { id: 'thread-detail-kontekst', label: 'Kontekst' },
      { id: 'thread-detail-questline', label: 'Questline' },
      { id: 'thread-detail-sesje', label: 'Sesje' },
      { id: 'thread-detail-powiazania', label: 'Powiązania' },
      { id: 'thread-detail-notatki', label: 'Notatki MG' },
      { id: 'thread-detail-tagi', label: 'Tagi' },
    ];
  }, [thread, isEditing]);

  if (thread === undefined) return <LoadingSpinner />;

  if (!thread) {
    return (
      <DetailNotFound
        icon={Milestone}
        title="Wątek nie znaleziony"
        description="Mógł zostać usunięty albo odnośnik jest nieaktualny."
        to="/threads"
        linkLabel="Wróć do listy wątków"
      />
    );
  }

  async function handleUpdate(values: ThreadFormValues) {
    setSaving(true);
    try {
      await updateEntity(db, thread!.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          ...thread!.data,
          color: values.color,
          status: values.status,
          kind: values.kind,
          priority: values.priority,
          resolution: values.resolution,
        },
      });
      toast.success('Wątek zaktualizowany');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const name = thread!.name;
    try {
      await deleteEntity(db, thread!.id);
      toast.success(`Wątek „${name}" usunięty`);
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć wątku');
    }
  }

  function handleToggleStatus() {
    if (thread!.data.status === 'active') {
      setCompletionResolution(thread!.data.resolution ?? '');
      setCompletionResolutionError('');
      setCompletionModalOpen(true);
      return;
    }

    void handleReactivateThread();
  }

  async function handleReactivateThread() {
    try {
      await updateEntity(db, thread!.id, {
        data: { ...thread!.data, status: 'active', resolution: '' },
      });
      toast.success('Wątek reaktywowany');
    } catch {
      toast.error('Nie udało się zaktualizować statusu');
    }
  }

  async function handleConfirmCompleteThread() {
    const trimmed = completionResolution.trim();
    if (trimmed.length === 0) {
      setCompletionResolutionError('Podaj rozwiązanie lub efekt zakończenia wątku');
      toast.error('Podaj rozwiązanie / efekt');
      return;
    }

    setCompletionSaving(true);
    try {
      await updateEntity(db, thread!.id, {
        data: {
          ...thread!.data,
          status: 'completed',
          resolution: trimmed,
        },
      });
      toast.success('Wątek zakończony');
      setCompletionModalOpen(false);
    } catch {
      toast.error('Nie udało się zakończyć wątku');
    } finally {
      setCompletionSaving(false);
    }
  }

  async function handleConfirmUnlink() {
    if (!unlinkConfirm) return;
    try {
      await deleteRelation(db, unlinkConfirm.relationId);
      toast.success('Powiązanie usunięte');
      setUnlinkConfirm(null);
    } catch {
      toast.error('Nie udało się usunąć powiązania');
    }
  }

  const isCompleted = thread.data.status === 'completed';
  const resolvedChildThreads = childThreads ?? [];
  const childGroups = THREAD_DERIVATION_KIND_OPTIONS.map((kind) => ({
    kind,
    items: resolvedChildThreads.filter((item) => item.relation.meta?.threadDerivationKind === kind),
  })).filter((group) => group.items.length > 0);
  const legacyChildThreads = resolvedChildThreads.filter(
    (item) => !item.relation.meta?.threadDerivationKind,
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      {/* Back */}
      <Link
        to={backPath}
        className="text-surface-500 hover:text-primary-700 flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="app-panel-strong flex flex-col gap-5 rounded-[1.9rem] border border-white/40 px-6 py-6 shadow-[0_28px_60px_rgba(18,45,66,0.12)] lg:flex-row lg:items-start lg:justify-between lg:px-7">
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-3 shrink-0 rounded-full shadow-[0_8px_18px_rgba(18,45,66,0.16)]"
            style={{ backgroundColor: thread.data.color }}
            aria-hidden="true"
          />
          <div>
            <h1 className="text-surface-900 text-3xl font-semibold tracking-[-0.03em]">
              {thread.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  isCompleted
                    ? 'app-pill-muted'
                    : 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
                }`}
              >
                {THREAD_STATUS_LABELS[thread.data.status]}
              </span>
              <span className="app-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                {THREAD_KIND_LABELS[thread.data.kind ?? 'side']}
              </span>
              <span className="app-danger-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                Priorytet: {THREAD_PRIORITY_LABELS[thread.data.priority ?? 'normal']}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <MarkdownExportButton entity={thread} />
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edytuj
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="app-button-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="app-panel rounded-[1.75rem] p-4 shadow-[0_20px_40px_rgba(18,45,66,0.08)] lg:p-6">
          <ThreadForm
            defaultValues={{
              name: thread.name,
              description: thread.description,
              tags: thread.tags,
              color: thread.data.color,
              status: thread.data.status,
              kind: thread.data.kind ?? 'side',
              priority: thread.data.priority ?? 'normal',
              resolution: thread.data.resolution ?? '',
            }}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isSaving={saving}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <DetailTocBar ariaLabel="Sekcje karty wątku" items={threadTocItems} />
          <DetailSection
            sectionId="thread-detail-kontekst"
            title="Kontekst wątku"
            tone="accent"
            action={
              <button
                type="button"
                onClick={handleToggleStatus}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isCompleted
                    ? 'app-button-secondary'
                    : 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:bg-emerald-100'
                }`}
              >
                {isCompleted ? 'Reaktywuj wątek' : 'Oznacz jako zakończony'}
              </button>
            }
            contentClassName="flex flex-col gap-5 lg:gap-6"
          >
            {thread.description && (
              <div className="rounded-[1.2rem] border border-emerald-300/45 bg-emerald-100/55 px-5 py-4">
                <h2 className="text-emerald-800 mb-2 text-xs font-semibold tracking-wide uppercase">
                  Opis
                </h2>
                <div
                  className="prose prose-sm text-surface-700 max-w-none"
                  dangerouslySetInnerHTML={{ __html: thread.description }}
                />
              </div>
            )}

            {thread.data.resolution && (
              <div>
                <h2 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                  Rozwiązanie / efekt
                </h2>
                <p className="app-danger-card text-surface-800 rounded-[1.3rem] px-4 py-3 text-sm whitespace-pre-wrap">
                  {thread.data.resolution}
                </p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="app-panel rounded-[1.3rem] p-4">
                <NarrativeLinksSection
                  title="Powiązania"
                  items={relatedContextLinks}
                  emptyMessage="Ten wątek nie ma jeszcze podpiętych powiązań."
                  actionLabel="+ Dodaj powiązanie"
                  onAction={() => setShowContextLinksPicker(true)}
                  onRemoveItem={(item) =>
                    setUnlinkConfirm({
                      relationId: item.relation.id,
                      title: 'Usunąć powiązanie?',
                      description: `Czy na pewno chcesz usunąć powiązanie z „${item.entity.name}" z tego widoku wątku?`,
                    })}
                  removeAriaLabel={(item) => `Usuń powiązanie ${item.entity.name} z tego widoku`}
                />
              </div>

              <div className="app-panel rounded-[1.3rem] p-4">
                <NarrativeLinksSection
                  title="Powiązane zagrożenia"
                  items={relatedThreats}
                  emptyMessage="Ten wątek działa niezależnie od zagrożeń."
                  actionLabel="+ Dodaj zagrożenie"
                  onAction={() => setShowThreatPicker(true)}
                  onRemoveItem={(item) =>
                    setUnlinkConfirm({
                      relationId: item.relation.id,
                      title: 'Usunąć powiązane zagrożenie?',
                      description: `Czy na pewno chcesz usunąć zagrożenie „${item.entity.name}" z tego widoku wątku?`,
                    })}
                  removeAriaLabel={(item) => `Usuń zagrożenie ${item.entity.name} z tego widoku`}
                />
              </div>
            </div>

            <div className="app-panel rounded-[1.3rem] p-4">
              <ClueSection
                parentId={thread.id}
                title="Wskazówki wątku"
                onRemoveRelation={(item) =>
                  setUnlinkConfirm({
                    relationId: item.relation.id,
                    title: 'Usunąć wskazówkę z widoku?',
                    description: `Czy na pewno chcesz usunąć wskazówkę „${item.clue.name}" z tego widoku wątku?`,
                  })}
              />
            </div>
          </DetailSection>

          <DetailSection
            sectionId="thread-detail-questline"
            title="Questline"
          >
            <NarrativeLinksSection
              title="Wątki nadrzędne"
              items={parentThreads}
              emptyMessage="Ten wątek nie wynika jeszcze z innego wątku."
              actionLabel="+ Podepnij rodzica"
              onAction={() => setQuestlinePicker({ mode: 'parent', initialKind: 'followup' })}
              onRemoveItem={(item) =>
                setUnlinkConfirm({
                  relationId: item.relation.id,
                  title: 'Usunąć powiązanie questline?',
                  description: `Czy na pewno chcesz odpiąć nadrzędny wątek „${item.entity.name}"?`,
                })}
              removeAriaLabel={(item) => `Usuń nadrzędny wątek ${item.entity.name}`}
              meta={(item) => {
                const kind = item.relation.meta?.threadDerivationKind;
                if (!kind) return 'Relacja legacy bez doprecyzowanego typu questline.';
                return `${getThreadDerivationDirectionLabel(kind, 'outgoing')} • ${getThreadDerivationKindLabel(kind)}`;
              }}
            />

            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-surface-500 text-xs font-semibold tracking-wide uppercase">
                    Wątki pochodne
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {THREAD_DERIVATION_KIND_OPTIONS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setQuestlinePicker({ mode: 'child', initialKind: kind })}
                      className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                    >
                      + {THREAD_DERIVATION_KIND_LABELS[kind]}
                    </button>
                  ))}
                </div>
              </div>

              {childGroups.length === 0 && legacyChildThreads.length === 0 ? (
                <p className="text-surface-400 text-sm">
                  Ten wątek nie ma jeszcze odnóg ani następstw.
                </p>
              ) : (
                <div className="flex flex-col gap-5">
                  {childGroups.map((group) => (
                    <NarrativeLinksSection
                      key={group.kind}
                      title={THREAD_DERIVATION_KIND_LABELS[group.kind]}
                      items={group.items}
                      emptyMessage=""
                      onRemoveItem={(item) =>
                        setUnlinkConfirm({
                          relationId: item.relation.id,
                          title: 'Usunąć powiązanie questline?',
                          description: `Czy na pewno chcesz odpiąć pochodny wątek „${item.entity.name}"?`,
                        })}
                      removeAriaLabel={(item) => `Usuń pochodny wątek ${item.entity.name}`}
                      meta={() => getThreadDerivationDirectionLabel(group.kind, 'incoming')}
                    />
                  ))}
                  {legacyChildThreads.length > 0 && (
                    <NarrativeLinksSection
                      title="Legacy questline"
                      items={legacyChildThreads}
                      emptyMessage=""
                      onRemoveItem={(item) =>
                        setUnlinkConfirm({
                          relationId: item.relation.id,
                          title: 'Usunąć powiązanie questline?',
                          description: `Czy na pewno chcesz odpiąć pochodny wątek „${item.entity.name}"?`,
                        })}
                      removeAriaLabel={(item) => `Usuń pochodny wątek ${item.entity.name}`}
                      meta={() => 'Relacja legacy bez doprecyzowanego typu questline.'}
                    />
                  )}
                </div>
              )}
            </div>
          </DetailSection>

          <DetailSection
            sectionId="thread-detail-sesje"
            title="Sesje i historia"
            contentClassName="flex flex-col gap-5"
          >
            <div>
              {sessions === undefined ? (
                <LoadingSpinner />
              ) : sessions.length === 0 ? (
                <p className="text-surface-400 text-sm">
                  Brak powiązanych sesji. Dodaj relację <em>pojawia się w</em> poniżej.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {sessions.map((session) => (
                    <li key={session.id}>
                      <Link
                        to={`/sessions/${session.id}`}
                        className="app-input-shell hover:border-primary-300 flex items-center gap-2 rounded-[1.2rem] px-4 py-3 text-sm transition-colors hover:bg-[rgba(229,231,223,0.98)]"
                      >
                        <BookOpen className="text-surface-400 h-3.5 w-3.5 shrink-0" />
                        <span className="text-surface-700 font-medium">
                          Sesja #{session.data.number}
                        </span>
                        {session.data.date && (
                          <span className="text-surface-400 ml-auto text-xs">
                            {formatDate(session.data.date)}
                          </span>
                        )}
                        {session.name && session.name !== `Sesja ${session.data.number}` && (
                          <span className="text-surface-500 truncate text-xs">{session.name}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DetailSection>

          <DetailSection
            sectionId="thread-detail-powiazania"
            title="Powiązania świata"
            action={
              <button
                onClick={() => setShowRelPicker(true)}
                className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
              >
                + Dodaj
              </button>
            }
          >
            <RelationList
              entityId={thread.id}
              excludeRelationTypes={['affects', 'derives_from', 'clues_for', 'appears_in']}
              emptyMessage="Brak dodatkowych relacji świata dla tego wątku."
            />
          </DetailSection>
          <DetailSection
            sectionId="thread-detail-notatki"
            title="Notatki MG"
          >
            <NotesList
              entityId={thread.id}
              showTitle={false}
              emptyMessage="Brak notatek podpiętych do tego wątku."
            />
          </DetailSection>

          <DetailSection sectionId="thread-detail-tagi" title="Tagi">
            {thread.tags.length === 0 ? (
              <p className="text-surface-500 text-sm">Brak tagów — dodaj je w trybie edycji wątku.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {thread.tags.map((tag) => (
                  <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </DetailSection>

          <DetailScrollTopFab enabled={threadTocItems.length > 0} />
        </div>
      )}

      {showRelPicker && (
        <RelationPicker
          sourceId={thread.id}
          sourceType="thread"
          onClose={() => setShowRelPicker(false)}
        />
      )}

      {showThreatPicker && (
        <RelationPicker
          sourceId={thread.id}
          sourceType="thread"
          initialTargetType="threat"
          initialRelationType="affects"
          lockTargetType
          lockRelationType
          onClose={() => setShowThreatPicker(false)}
        />
      )}

      {showContextLinksPicker && (
        <RelationPicker
          sourceId={thread.id}
          sourceType="thread"
          initialTargetType="npc"
          initialRelationType="related_to"
          lockRelationType
          allowedTargetTypes={['faction', 'location', 'npc', 'item']}
          onClose={() => setShowContextLinksPicker(false)}
        />
      )}

      {questlinePicker && (
        <ThreadQuestlinePickerModal
          currentThreadId={thread.id}
          mode={questlinePicker.mode}
          initialKind={questlinePicker.initialKind}
          onClose={() => setQuestlinePicker(null)}
        />
      )}

      {completionModalOpen && (
        <Modal title="Rozwiązanie / efekt" onClose={() => setCompletionModalOpen(false)}>
          <p className="text-surface-600 text-sm">
            Opisz, jak wątek został zamknięty albo jaki efekt zostawia w kampanii.
          </p>
          <textarea
            value={completionResolution}
            onChange={(event) => {
              setCompletionResolution(event.target.value);
              if (completionResolutionError) setCompletionResolutionError('');
            }}
            rows={4}
            className="app-input text-surface-800 mt-3 w-full rounded-[1.2rem] px-4 py-3 text-sm"
            placeholder="Co stało się po zakończeniu wątku?"
            aria-invalid={completionResolutionError ? 'true' : 'false'}
          />
          {completionResolutionError && (
            <p className="mt-2 text-xs text-red-600">{completionResolutionError}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {THREAD_RESOLUTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setCompletionResolution(preset);
                  if (completionResolutionError) setCompletionResolutionError('');
                }}
                className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCompletionModalOpen(false)}
              className="app-button-secondary rounded-full px-4 py-2 text-sm font-medium"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmCompleteThread()}
              disabled={completionSaving}
              className="app-button-primary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {completionSaving ? 'Zapisywanie...' : 'Zakończ wątek'}
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń wątek"
        description={`Czy na pewno chcesz usunąć wątek „${thread.name}"? Tej operacji nie można cofnąć.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={Boolean(unlinkConfirm)}
        title={unlinkConfirm?.title ?? 'Usunąć powiązanie?'}
        description={unlinkConfirm?.description ?? ''}
        onConfirm={() => void handleConfirmUnlink()}
        onCancel={() => setUnlinkConfirm(null)}
      />
    </div>
  );
}
