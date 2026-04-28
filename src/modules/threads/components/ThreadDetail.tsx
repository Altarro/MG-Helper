import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { ArrowLeft, Edit2, Trash2, BookOpen, Milestone } from 'lucide-react';
import { useThreadById } from '../hooks/useThreadById';
import { useThreadSessions } from '../hooks/useThreadSessions';
import { ThreadForm } from './ThreadForm';
import { DetailNotFound } from '@shared/components/DetailNotFound';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
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
import { deleteEntity, updateEntity } from '@shared/db/operations';
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

  const threadTocItems = useMemo(() => {
    if (!thread || isEditing) return [];
    return [
      { id: 'thread-detail-kontekst', label: 'Kontekst' },
      { id: 'thread-detail-sesje', label: 'Sesje' },
      { id: 'thread-detail-presja', label: 'Presja' },
      { id: 'thread-detail-questline', label: 'Questline' },
      { id: 'thread-detail-wskazowki', label: 'Wskazówki' },
      { id: 'thread-detail-powiazania', label: 'Powiązania' },
      { id: 'thread-detail-notatki', label: 'Notatki MG' },
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

  async function handleToggleStatus() {
    const newStatus = thread!.data.status === 'active' ? 'completed' : 'active';
    try {
      await updateEntity(db, thread!.id, {
        data: { ...thread!.data, status: newStatus },
      });
      toast.success(newStatus === 'completed' ? 'Wątek zakończony' : 'Wątek reaktywowany');
    } catch {
      toast.error('Nie udało się zaktualizować statusu');
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
            description="Główne informacje potrzebne do pracy na sprawie przy stole."
            tone="accent"
            contentClassName="flex flex-col gap-5 lg:gap-6"
          >
            {/* Status toggle */}
            <button
              type="button"
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isCompleted
                  ? 'app-button-secondary'
                  : 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:bg-emerald-100'
              }`}
            >
              {isCompleted ? 'Reaktywuj wątek' : 'Oznacz jako zakończony'}
            </button>

            {/* Description */}
            {thread.description && (
              <div>
                <h2 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                  Opis
                </h2>
                <div
                  className="prose prose-sm text-surface-700 max-w-none"
                  dangerouslySetInnerHTML={{ __html: thread.description }}
                />
              </div>
            )}

            {/* Tags */}
            {thread.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {thread.tags.map((tag) => (
                  <span
                    key={tag}
                    className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {thread.data.resolution && (
              <div>
                <h2 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                  Rozwiazanie / efekt
                </h2>
                <p className="app-danger-card text-surface-800 rounded-[1.3rem] px-4 py-3 text-sm whitespace-pre-wrap">
                  {thread.data.resolution}
                </p>
              </div>
            )}
          </DetailSection>

          <DetailSection
            sectionId="thread-detail-sesje"
            title="Sesje i historia"
            description="Operacyjny ślad tego, gdzie ten wątek był obecny przy stole."
            contentClassName="flex flex-col gap-5"
          >
            <div>
              <h2 className="text-surface-500 mb-2 text-xs font-semibold tracking-wide uppercase">
                Sesje ({sessions?.length ?? 0})
              </h2>
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
            sectionId="thread-detail-presja"
            title="Presja fabularna"
            description="Główne zagrożenia, na które ten wątek wpływa albo przez które jest napedzany."
          >
            <NarrativeLinksSection
              title="Powiązane zagrożenia"
              items={relatedThreats}
              emptyMessage="Ten wątek nie ma jeszcze jawnie podpietych zagrożeń przez relacje affects."
              actionLabel="+ Dodaj zagrożenie"
              onAction={() => setShowThreatPicker(true)}
            />
          </DetailSection>

          <DetailSection
            sectionId="thread-detail-questline"
            title="Questline"
            description="Relacje nadrzędne i pochodne, ktore pozwalają czytać ten wątek jako odnogę, kontynuację albo konsekwencję."
          >
            <NarrativeLinksSection
              title="Wątki nadrzędne"
              items={parentThreads}
              emptyMessage="Ten wątek nie wynika jeszcze z innego wątku."
              actionLabel="+ Podepnij rodzica"
              onAction={() => setQuestlinePicker({ mode: 'parent', initialKind: 'followup' })}
              meta={(item) => {
                const kind = item.relation.meta?.threadDerivationKind;
                if (!kind) return 'Relacja legacy bez doprecyzowanego typu questline.';
                return `${getThreadDerivationDirectionLabel(kind, 'outgoing')} • ${getThreadDerivationKindLabel(kind)}`;
              }}
            />

            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-surface-500 text-xs font-semibold tracking-wide uppercase">
                    Wątki pochodne
                  </h2>
                  <p className="text-surface-400 mt-1 text-sm">
                    Podepnij istniejący wątek jako nastepstwo, odnogę, alternatywę albo
                    konsekwencję.
                  </p>
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
                      meta={() => getThreadDerivationDirectionLabel(group.kind, 'incoming')}
                    />
                  ))}
                  {legacyChildThreads.length > 0 && (
                    <NarrativeLinksSection
                      title="Legacy questline"
                      items={legacyChildThreads}
                      emptyMessage=""
                      meta={() => 'Relacja legacy bez doprecyzowanego typu questline.'}
                    />
                  )}
                </div>
              )}
            </div>
          </DetailSection>

          <DetailSection
            sectionId="thread-detail-wskazowki"
            title="Wskazówki wątku"
            description="Tropy, które prowadzą do tej sprawy i pomagają MG utrzymać ciąg poszlak."
          >
            <ClueSection parentId={thread.id} title="Powiązane wskazówki" />
          </DetailSection>

          <DetailSection
            sectionId="thread-detail-powiazania"
            title="Powiązania świata"
            description="Relacje dodatkowe poza głównym kontraktem fabularnym i historia sesji."
            action={null}
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-surface-500 text-xs font-semibold tracking-wide uppercase">
                  Pozostałe powiązania
                </h2>
                <button
                  onClick={() => setShowRelPicker(true)}
                  className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                >
                  + Dodaj
                </button>
              </div>
              <RelationList
                entityId={thread.id}
                excludeRelationTypes={['affects', 'derives_from', 'clues_for', 'appears_in']}
                emptyMessage="Brak dodatkowych relacji świata dla tego wątku."
              />
            </div>
          </DetailSection>
          <DetailSection
            sectionId="thread-detail-notatki"
            title="Notatki MG"
            description="Zaplecze robocze dla prowadzącego, oddzielone od głównej narracji."
          >
            <NotesList
              entityId={thread.id}
              showTitle={false}
              emptyMessage="Brak notatek podpietych do tego wątku."
            />
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

      {questlinePicker && (
        <ThreadQuestlinePickerModal
          currentThreadId={thread.id}
          mode={questlinePicker.mode}
          initialKind={questlinePicker.initialKind}
          onClose={() => setQuestlinePicker(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń wątek"
        description={`Czy na pewno chcesz usunąć wątek „${thread.name}"? Tej operacji nie można cofnąć.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
