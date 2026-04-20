import { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { ArrowLeft, Edit2, Trash2, BookOpen } from 'lucide-react';
import { useThreadById } from '../hooks/useThreadById';
import { useThreadSessions } from '../hooks/useThreadSessions';
import { ThreadForm } from './ThreadForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { RelationList } from '@shared/components/RelationList';
import { NotesList } from '@modules/notes/components/NotesList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { MarkdownExportButton } from '@shared/components/MarkdownExportButton';
import { NarrativeLinksSection } from '@shared/components/NarrativeLinksSection';
import { ClueSection } from '@shared/components/ClueSection';
import { DetailSection } from '@shared/components/DetailSection';
import { useRelatedEntities } from '@shared/hooks/useRelatedEntities';
import { deleteEntity, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import {
  THREAD_KIND_LABELS,
  THREAD_PRIORITY_LABELS,
  THREAD_STATUS_LABELS,
} from '../types';
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
  const returnToSessionLive = typeof location.state === 'object'
    && location.state !== null
    && 'returnToSessionLive' in location.state
    && typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/threads';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Wątki';

  if (thread === undefined) return <LoadingSpinner />;

  if (!thread) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Wątek nie istnieje.</p>
        <Link to="/threads" className="text-primary-600 hover:underline">
          ← Wróć do listy wątków
        </Link>
      </div>
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
  const legacyChildThreads = resolvedChildThreads.filter((item) => !item.relation.meta?.threadDerivationKind);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link to={backPath} className="flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 w-fit">
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: thread.data.color }}
            aria-hidden="true"
          />
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{thread.name}</h1>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                isCompleted
                  ? 'bg-surface-100 text-surface-500'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {THREAD_STATUS_LABELS[thread.data.status]}
            </span>
            <span className="ml-2 mt-1 inline-block rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
              {THREAD_KIND_LABELS[thread.data.kind ?? 'side']}
            </span>
            <span className="ml-2 mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Priorytet: {THREAD_PRIORITY_LABELS[thread.data.priority ?? 'normal']}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          <MarkdownExportButton entity={thread} />
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edytuj
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
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
          <DetailSection
            title="Kontekst wątku"
            description="Główne informacje potrzebne do pracy na sprawie przy stole."
            tone="accent"
          >
          {/* Status toggle */}
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium w-fit transition-colors ${
              isCompleted
                ? 'border-surface-300 bg-surface-50 text-surface-600 hover:bg-surface-100'
                : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {isCompleted ? 'Reaktywuj wątek' : 'Oznacz jako zakończony'}
          </button>

          {/* Description */}
          {thread.description && (
            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">Opis</h2>
              <div
                className="prose prose-sm max-w-none text-surface-700"
                dangerouslySetInnerHTML={{ __html: thread.description }}
              />
            </div>
          )}

          {/* Tags */}
          {thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {thread.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {thread.data.resolution && (
            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">
                Rozwiazanie / efekt
              </h2>
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-surface-800 whitespace-pre-wrap">
                {thread.data.resolution}
              </p>
            </div>
          )}

          </DetailSection>

          <DetailSection
            title="Sesje i historia"
            description="Operacyjny ślad tego, gdzie ten wątek był obecny przy stole."
          >
            <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
              Sesje ({sessions?.length ?? 0})
            </h2>
            {sessions === undefined ? (
              <LoadingSpinner />
            ) : sessions.length === 0 ? (
              <p className="text-sm text-surface-400">Brak powiązanych sesji. Dodaj relację <em>pojawia się w</em> poniżej.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      to={`/sessions/${session.id}`}
                      className="flex items-center gap-2 rounded-md border border-surface-100 bg-surface-50 px-3 py-2 text-sm hover:border-primary-200 hover:bg-primary-50"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-surface-400 shrink-0" />
                      <span className="font-medium text-surface-700">Sesja #{session.data.number}</span>
                      {session.data.date && (
                        <span className="text-xs text-surface-400 ml-auto">{formatDate(session.data.date)}</span>
                      )}
                      {session.name && session.name !== `Sesja ${session.data.number}` && (
                        <span className="truncate text-xs text-surface-500">{session.name}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </DetailSection>

          <DetailSection
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
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
                  Wątki pochodne
                </h2>
                <p className="mt-1 text-sm text-surface-400">
                  Podepnij istniejący wątek jako nastepstwo, odnogę, alternatywę albo konsekwencję.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {THREAD_DERIVATION_KIND_OPTIONS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setQuestlinePicker({ mode: 'child', initialKind: kind })}
                    className="rounded-full border border-surface-300 px-2.5 py-1 text-xs font-medium text-surface-600 hover:bg-surface-50"
                  >
                    + {THREAD_DERIVATION_KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
            </div>

            {childGroups.length === 0 && legacyChildThreads.length === 0 ? (
              <p className="text-sm text-surface-400">Ten wątek nie ma jeszcze odnóg ani następstw.</p>
            ) : (
              <div className="flex flex-col gap-4">
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
            title="Wskazówki wątku"
            description="Tropy, które prowadzą do tej sprawy i pomagają MG utrzymać ciąg poszlak."
          >
            <ClueSection parentId={thread.id} title="Powiązane wskazówki" />
          </DetailSection>

          <DetailSection
            title="Powiązania świata"
            description="Relacje dodatkowe poza głównym kontraktem fabularnym i historia sesji."
            action={(
              <button
                onClick={() => setShowRelPicker(true)}
                className="text-xs text-primary-600 hover:underline"
              >
                + Dodaj
              </button>
            )}
          >
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-500">Pozostałe powiązania</h2>
              <button
                onClick={() => setShowRelPicker(true)}
                className="text-xs text-primary-600 hover:underline"
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
            title="Notatki MG"
            description="Zaplecze robocze dla prowadzącego, oddzielone od głównej narracji."
          >
            <NotesList
              entityId={thread.id}
              showTitle={false}
              emptyMessage="Brak notatek podpietych do tego wątku."
            />
          </DetailSection>
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
