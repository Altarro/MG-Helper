import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams, Link, useLocation } from 'react-router';
import { AlertTriangle, ArrowLeft, Edit2, GitBranchPlus, Trash2 } from 'lucide-react';
import { useThreatById } from '../hooks/useThreatById';
import { ThreatForm } from './ThreatForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Modal } from '@shared/components/Modal';
import { NarrativeLinksSection } from '@shared/components/NarrativeLinksSection';
import { RelationList } from '@shared/components/RelationList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { ClueSection } from '@shared/components/ClueSection';
import { DetailSection } from '@shared/components/DetailSection';
import { NotesList } from '@modules/notes/components/NotesList';
import { ClockWidget } from '@modules/clocks/components/ClockWidget';
import { TickProgress } from '@shared/components/TickProgress';
import {
  addEntity,
  addRelation,
  deleteEntity,
  updateEntity,
} from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelatedEntities } from '@shared/hooks/useRelatedEntities';
import { useThreatDetailPath } from '@shared/hooks/useThreatDetailPath';
import { CLOCK_SEGMENTS, isClock } from '@modules/clocks/types';
import { toast } from 'sonner';
import { THREAT_TYPE_LABELS, THREAT_DEATH_REASON_PRESETS } from '../types';
import { getThreatStatus, getClockData } from '@shared/utils/entityData';
import { normalizeThreatLifecycle } from '@shared/utils/threatLifecycle';
import { buildDerivedThreatDefaults, getCompletedClockLabels } from '../utils/derivedThreat';
import type { ThreatFormValues } from './ThreatForm';

export function ThreatDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { threat } = useThreatById(id);
  const { threat: forkSourceThreat } = useThreatById(threat?.data.forkThreatId);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [toggleReason, setToggleReason] = useState('');
  const [toggleReasonError, setToggleReasonError] = useState('');
  const [confirmReactivate, setConfirmReactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showThreadPicker, setShowThreadPicker] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const [showDerivedModal, setShowDerivedModal] = useState(false);
  const [derivedSaving, setDerivedSaving] = useState(false);
  const [showQuickClockModal, setShowQuickClockModal] = useState(false);
  const [quickClockName, setQuickClockName] = useState('');
  const [quickClockSegments, setQuickClockSegments] = useState<number>(6);
  const [quickClockSaving, setQuickClockSaving] = useState(false);
  const returnToSessionLive = (location.state as { returnToSessionLive?: string } | null)?.returnToSessionLive;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/threats';

  const forkSourcePath = useThreatDetailPath(forkSourceThreat?.id);

  const linkedClock = useLiveQuery(async () => {
    if (!id) return null;

    const rel = await db.relations
      .where('sourceId')
      .equals(id)
      .filter((relation) => relation.type === 'tracks')
      .first();

    if (!rel) return null;
    const entity = await db.entities.get(rel.targetId);
    return entity && isClock(entity) ? entity : null;
  }, [db, id]);

  const parentFront = useRelatedEntities(id, {
    relationTypes: ['belongs_to'],
    direction: 'outgoing',
    otherTypes: ['front'],
  });
  const relatedThreads = useRelatedEntities(id, {
    relationTypes: ['affects'],
    direction: 'both',
    otherTypes: ['thread'],
  });

  if (threat === undefined) return <LoadingSpinner />;

  if (!threat || !id) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Zagrożenie nie znalezione.</p>
        <Link to="/threats" className="text-primary-600 hover:underline">
          ← Powrót do zagrożeń
        </Link>
      </div>
    );
  }

  const currentThreat = threat;
  const threatId = id;
  const threatStatus = getThreatStatus(currentThreat);
  const completedClockLabels = getCompletedClockLabels(linkedClock);
  const derivedThreatDefaults = buildDerivedThreatDefaults(currentThreat, linkedClock);
  const parentFrontEntity = parentFront?.[0]?.entity;

  function openToggleFlow() {
    if (threatStatus === 'completed') {
      setConfirmReactivate(true);
    } else {
      setToggleReason('');
      setToggleReasonError('');
      setToggleModalOpen(true);
    }
  }

  async function handleConfirmComplete() {
    const trimmed = toggleReason.trim();
    if (trimmed.length === 0) {
      setToggleReasonError('Podaj powód zakończenia zagrożenia');
      toast.error('Podaj powód zakończenia');
      return;
    }

    setToggleSaving(true);
    try {
      await updateEntity(db, threatId, {
        data: {
          ...currentThreat.data,
          ...normalizeThreatLifecycle('completed', trimmed),
        },
      });

      if (linkedClock) {
        const clockData = getClockData(linkedClock);
        await updateEntity(db, linkedClock.id, {
          data: {
            ...clockData,
            isActive: false,
          },
        });
      }

      toast.success('Zagrożenie zakończone');
      setToggleModalOpen(false);
    } catch {
      toast.error('Nie udało się oznaczyć zagrożenia jako zakończone');
    } finally {
      setToggleSaving(false);
    }
  }

  async function handleConfirmReactivate() {
    try {
      await updateEntity(db, threatId, {
        data: {
          ...currentThreat.data,
          ...normalizeThreatLifecycle('active', ''),
        },
      });

      if (linkedClock) {
        const clockData = getClockData(linkedClock);
        await updateEntity(db, linkedClock.id, {
          data: {
            ...clockData,
            isActive: true,
          },
        });
      }

      toast.success('Zagrożenie aktywowane');
      setConfirmReactivate(false);
    } catch {
      toast.error('Nie udało się wznowić zagrożenia');
    }
  }

  async function handleUpdate(values: ThreatFormValues) {
    setSaving(true);
    try {
      const lifecycle = normalizeThreatLifecycle(values.status, values.reasonOfDead);
      await updateEntity(db, threatId, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          ...currentThreat.data,
          threatType: values.threatType,
          impulse: values.impulse,
          moves: values.moves,
          trigger: values.trigger,
          inheritanceNotes: values.inheritanceNotes,
          forkThreatId: values.forkThreatId,
          ...lifecycle,
        },
      });

      if (linkedClock) {
        const clockData = getClockData(linkedClock);
        await updateEntity(db, linkedClock.id, {
          data: {
            ...clockData,
            isActive: lifecycle.status !== 'completed',
          },
        });
      }

      if (values.clock && !linkedClock) {
        const clockEntity = await addEntity(db, {
          type: 'clock',
          name: values.clock.name,
          description: '',
          tags: [],
          data: {
            segments: values.clock.segments,
            filled: 0,
            tickLabels: [],
            isActive: lifecycle.status !== 'completed',
          },
        });
        await addRelation(db, { type: 'tracks', sourceId: threatId, targetId: clockEntity.id });
      }

      toast.success('Zagrożenie zaktualizowane');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateDerivedThreat(values: ThreatFormValues) {
    setDerivedSaving(true);
    try {
      const lifecycle = normalizeThreatLifecycle(values.status, values.reasonOfDead);
      const entity = await addEntity(db, {
        type: 'threat',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          threatType: values.threatType,
          impulse: values.impulse,
          moves: values.moves,
          trigger: values.trigger,
          inheritanceNotes: values.inheritanceNotes,
          forkThreatId: currentThreat.id,
          ...lifecycle,
        },
      });

      if (parentFrontEntity) {
        await addRelation(db, {
          type: 'belongs_to',
          sourceId: entity.id,
          targetId: parentFrontEntity.id,
        });
      }

      if (values.clock) {
        const clockEntity = await addEntity(db, {
          type: 'clock',
          name: values.clock.name,
          description: '',
          tags: [],
          data: {
            segments: values.clock.segments,
            filled: 0,
            tickLabels: [],
            isActive: lifecycle.status !== 'completed',
          },
        });
        await addRelation(db, { type: 'tracks', sourceId: entity.id, targetId: clockEntity.id });
      }

      toast.success(`Utworzono zagrożenie wynikające "${values.name}"`);
      setShowDerivedModal(false);
      navigate(`/threats/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć zagrożenia wynikającego');
    } finally {
      setDerivedSaving(false);
    }
  }

  async function handleDelete() {
    try {
      if (linkedClock) {
        await deleteEntity(db, linkedClock.id);
      }

      await deleteEntity(db, threatId);
      toast.success(`Zagrożenie "${currentThreat.name}" usunięte`);
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć zagrożenia');
    }
  }

  async function handleCreateQuickClock() {
    const trimmedName = quickClockName.trim();
    if (!trimmedName || linkedClock) return;

    setQuickClockSaving(true);
    try {
      const clockEntity = await addEntity(db, {
        type: 'clock',
        name: trimmedName,
        description: '',
        tags: [],
        data: {
          segments: quickClockSegments as 4 | 6 | 8 | 10 | 12,
          filled: 0,
          tickLabels: [],
          isActive: threatStatus !== 'completed',
        },
      });
      await addRelation(db, { type: 'tracks', sourceId: threatId, targetId: clockEntity.id });
      toast.success(`Dodano zegar "${trimmedName}"`);
      setQuickClockName('');
      setQuickClockSegments(6);
      setShowQuickClockModal(false);
    } catch {
      toast.error('Nie udało się utworzyć zegara');
    } finally {
      setQuickClockSaving(false);
    }
  }

  async function handleTickLinkedClock() {
    if (!linkedClock) return;
    const data = linkedClock.data;
    if (data.filled >= data.segments || data.isActive === false) return;

    const nextFilled = data.filled + 1;
    try {
      await updateEntity(db, linkedClock.id, {
        data: {
          ...data,
          filled: nextFilled,
        },
      });

      if (nextFilled >= data.segments) {
        toast.success(`Zegar "${linkedClock.name}" wypełniony!`);
      }
    } catch {
      toast.error('Nie udało się odnotować kolejnego tyknięcia');
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <Link
        to={backPath}
        className="flex w-fit items-center gap-2 text-sm text-surface-500 hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" />
        {returnToSessionLive ? 'Sesja na żywo' : 'Zagrożenia'}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{currentThreat.name}</h1>
            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {THREAT_TYPE_LABELS[currentThreat.data.threatType]}
            </span>
            <span className={`ml-2 mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              threatStatus === 'completed' ? 'bg-surface-200 text-surface-700' : 'bg-green-100 text-green-700'
            }`}>
              {threatStatus === 'completed' ? 'Zakończone' : 'Aktywne'}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50"
          >
            <Edit2 className="h-3.5 w-3.5" /> {isEditing ? 'Anuluj' : 'Edytuj'}
          </button>
          {threatStatus === 'completed' && (
            <button
              type="button"
              onClick={() => setShowDerivedModal(true)}
              className="flex items-center gap-1.5 rounded-md border border-primary-200 px-3 py-1.5 text-sm text-primary-700 hover:bg-primary-50"
            >
              <GitBranchPlus className="h-3.5 w-3.5" /> Utwórz zagrożenie wynikające
            </button>
          )}
          <button
            type="button"
            onClick={() => openToggleFlow()}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
              threatStatus === 'completed'
                ? 'border-green-200 text-green-700 hover:bg-green-50'
                : 'border-surface-300 hover:bg-surface-50'
            }`}
          >
            {threatStatus === 'completed' ? 'Wznów' : 'Zakończ'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <ThreatForm
            defaultValues={{
              name: currentThreat.name,
              threatType: currentThreat.data.threatType,
              status: threatStatus,
              impulse: currentThreat.data.impulse,
              trigger: currentThreat.data.trigger ?? '',
              reasonOfDead: currentThreat.data.reasonOfDead ?? '',
              inheritanceNotes: typeof currentThreat.data.inheritanceNotes === 'string' ? currentThreat.data.inheritanceNotes : '',
              forkThreatId: currentThreat.data.forkThreatId,
              moves: currentThreat.data.moves,
              description: currentThreat.description,
              tags: currentThreat.tags,
              clock: linkedClock
                ? { name: linkedClock.name, segments: linkedClock.data.segments }
                : null,
            }}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setIsEditing(false)}
            currentThreatId={currentThreat.id}
          />
        </div>
      ) : (
        <>
          <DetailSection
            title="Kontekst zagrożenia"
            description="Główne informacje o presji fabularnej i jej miejscu w kampanii."
            tone="accent"
          >
            {currentThreat.data.impulse && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Impuls</h2>
                <p className="text-sm italic text-surface-800">{currentThreat.data.impulse}</p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-surface-200 bg-white p-5">
                <NarrativeLinksSection
                  title="Front nadrzędny"
                  items={parentFront}
                  emptyMessage="To zagrożenie nie jest jeszcze podpięte do żadnego frontu."
                />
              </div>

              <div className="rounded-xl border border-surface-200 bg-white p-5">
                <NarrativeLinksSection
                  title="Powiązane wątki"
                  items={relatedThreads}
                  emptyMessage="To zagrożenie nie ma jeszcze podpiętych wątków przez relację affects."
                  actionLabel="+ Dodaj wątek"
                  onAction={() => setShowThreadPicker(true)}
                />
              </div>
            </div>
          </DetailSection>

          {(currentThreat.data.trigger || forkSourceThreat || currentThreat.data.reasonOfDead) && (
            <DetailSection
              title="Historia i tykanie"
              description="Trigger, pochodzenie i stan wygaszenia zagrożenia."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {currentThreat.data.trigger && (
                  <div className="rounded-xl border border-surface-200 bg-white p-5">
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
                      Trigger tykania
                    </h2>
                    <p className="whitespace-pre-wrap text-sm text-surface-700">{currentThreat.data.trigger}</p>
                  </div>
                )}

                {forkSourceThreat && (
                  <div className="rounded-xl border border-surface-200 bg-white p-5">
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
                      Powstało z zagrożenia
                    </h2>
                    {forkSourcePath ? (
                      <Link to={forkSourcePath} className="text-sm font-medium text-primary-600 hover:underline">
                        {forkSourceThreat.name}
                      </Link>
                    ) : (
                      <p className="text-sm text-surface-700">{forkSourceThreat.name}</p>
                    )}
                  </div>
                )}

                {currentThreat.data.reasonOfDead && (
                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-5 lg:col-span-2">
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
                      Powód wygaszenia / śmierci
                    </h2>
                    <p className="whitespace-pre-wrap text-sm text-surface-700">{currentThreat.data.reasonOfDead}</p>
                  </div>
                )}
              </div>
            </DetailSection>
          )}

          {currentThreat.data.moves.length > 0 && (
            <DetailSection
              title="Ruchy zagrożenia"
              description="Lista ruchów, po których MG może sięgać podczas eskalacji."
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
                Ruchy zagrożenia
              </h2>
              <ul className="list-inside list-disc space-y-1.5">
                {currentThreat.data.moves.map((move, index) => (
                  <li key={index} className="text-sm text-surface-700">
                    {move}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {typeof currentThreat.data.inheritanceNotes === 'string' && currentThreat.data.inheritanceNotes.trim().length > 0 && (
            <DetailSection
              title="Dziedzictwo zagrożenia"
              description="To, co przeszło dalej po wcześniejszym zagrożeniu: skutki, etapy i konsekwencje."
            >
              <p className="whitespace-pre-wrap text-sm text-surface-700">{currentThreat.data.inheritanceNotes}</p>
            </DetailSection>
          )}

          {linkedClock && (
            <DetailSection
              title="Zegar presji"
              description="Operacyjny licznik eskalacji przypięty do tego zagrożenia."
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
                Powiązany zegar
              </h2>
              <Link
                to={`/clocks/${linkedClock.id}`}
                className="m-[-0.5rem] flex items-center gap-4 rounded-lg border border-transparent p-2 transition-colors hover:border-primary-200 hover:bg-primary-50"
              >
                <ClockWidget clock={linkedClock} size={56} showLabel />
                <div className="min-w-0">
                  <p className="font-medium text-surface-900">{linkedClock.name}</p>
                  <p className="text-sm text-surface-500">
                    {linkedClock.data.filled}/{linkedClock.data.segments} segmentów
                  </p>
                </div>
              </Link>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleTickLinkedClock()}
                  disabled={linkedClock.data.filled >= linkedClock.data.segments || linkedClock.data.isActive === false}
                  className="rounded-md border border-primary-200 bg-white px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-40"
                >
                  +1 tick
                </button>
              </div>

              {linkedClock.data.tickLabels && linkedClock.data.tickLabels.length > 0 && (
                <div className="mt-4">
                  <TickProgress
                    tickLabels={linkedClock.data.tickLabels}
                    filled={linkedClock.data.filled}
                    segments={linkedClock.data.segments}
                  />
                </div>
              )}
            </DetailSection>
          )}

          {!linkedClock && (
            <DetailSection
              title="Zegar presji"
              description="To zagrożenie nie ma jeszcze zegara, ale możesz dodać go od razu bez przechodzenia do edycji."
            >
              <button
                type="button"
                onClick={() => setShowQuickClockModal(true)}
                className="rounded-md border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
              >
                + Dodaj zegar
              </button>
            </DetailSection>
          )}

          {currentThreat.description && (
            <DetailSection
              title="Opis"
              description="Pełny opis zagrożenia i jego roli w kampanii."
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">Opis</h2>
              <div
                className="prose prose-sm max-w-none text-surface-700"
                dangerouslySetInnerHTML={{ __html: currentThreat.description }}
              />
            </DetailSection>
          )}

          {currentThreat.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentThreat.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <DetailSection
            title="Wskazówki zagrożenia"
            description="Tropy prowadzące bezpośrednio do tego zagrożenia."
          >
            <ClueSection parentId={threatId} title="Wskazówki" />
          </DetailSection>

          <DetailSection
            title="Powiązania świata"
            description="Relacje dodatkowe poza głównym kontraktem zagrożenia."
            action={(
              <button
                type="button"
                onClick={() => setShowRelPicker(true)}
                className="text-xs text-primary-600 hover:underline"
              >
                + Dodaj
              </button>
            )}
          >
            <RelationList
              entityId={currentThreat.id}
              excludeRelationTypes={['belongs_to', 'affects', 'tracks', 'clues_for']}
              emptyMessage="Brak dodatkowych relacji świata dla tego zagrożenia."
            />
          </DetailSection>

          <DetailSection
            title="Notatki MG"
            description="Zaplecze robocze dla prowadzącego poza główną presją i jej tropami."
          >
            <NotesList
              entityId={currentThreat.id}
              showTitle={false}
              emptyMessage="Brak notatek podpiętych do tego zagrożenia."
            />
          </DetailSection>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń zagrożenie"
        description={`Czy na pewno chcesz usunąć zagrożenie "${currentThreat.name}"? Tej operacji nie można cofnąć.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {toggleModalOpen && (
        <Modal title="Powód zakończenia" onClose={() => setToggleModalOpen(false)}>
          <p className="text-sm text-surface-600">Podaj powód zakończenia zagrożenia:</p>
          <textarea
            placeholder="Podaj powód zakończenia..."
            value={toggleReason}
            onChange={(e) => {
              setToggleReason(e.target.value);
              if (toggleReasonError) setToggleReasonError('');
            }}
            rows={4}
            className="mt-3 w-full rounded-md border border-surface-300 px-3 py-2 text-sm"
          />
          {toggleReasonError && (
            <p className="mt-2 text-xs text-red-600">{toggleReasonError}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {THREAT_DEATH_REASON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setToggleReason(preset)}
                className="rounded-full border border-surface-300 px-3 py-1 text-xs text-surface-600 hover:bg-surface-50"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setToggleModalOpen(false)}
              className="rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmComplete()}
              disabled={toggleSaving}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${toggleSaving ? 'bg-primary-600/70' : 'bg-danger-600 hover:bg-danger-700'}`}
            >
              Zakończ
            </button>
          </div>
        </Modal>
      )}

      {showDerivedModal && (
        <Modal title="Nowe zagrożenie wynikające" onClose={() => setShowDerivedModal(false)}>
          <div className="mb-4 rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-surface-700">
            <p>
              Źródło: <span className="font-medium text-surface-900">{currentThreat.name}</span>
            </p>
            {completedClockLabels.length > 0 ? (
              <div className="mt-2">
                <p className="font-medium text-surface-900">Przenoszone ukończone kroki zegara:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                  {completedClockLabels.map((label, index) => (
                    <li key={`${index}-${label}`}>{label}</li>
                  ))}
                </ul>
              </div>
            ) : linkedClock && linkedClock.data.filled > 0 ? (
              <p className="mt-2">
                Zapiszę w opisie informację, że w źródle ukończono {linkedClock.data.filled} z {linkedClock.data.segments} segmentów zegara.
              </p>
            ) : (
              <p className="mt-2 text-surface-600">
                Źródłowy zegar nie ma ukończonych nazwanych kroków do przeniesienia.
              </p>
            )}
            {parentFrontEntity && (
              <p className="mt-2 text-surface-600">
                Nowe zagrożenie zostanie też automatycznie podpięte pod front: <span className="font-medium text-surface-900">{parentFrontEntity.name}</span>.
              </p>
            )}
          </div>

          <ThreatForm
            defaultValues={derivedThreatDefaults}
            onSubmit={handleCreateDerivedThreat}
            isSaving={derivedSaving}
            onCancel={() => setShowDerivedModal(false)}
            submitLabel="Utwórz zagrożenie wynikające"
            currentThreatId={currentThreat.id}
          />
        </Modal>
      )}

      {showQuickClockModal && (
        <Modal title="Dodaj zegar do zagrożenia" onClose={() => setShowQuickClockModal(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="quick-clock-name" className="text-sm font-medium text-surface-700">
                Nazwa zegara
              </label>
              <input
                id="quick-clock-name"
                value={quickClockName}
                onChange={(event) => setQuickClockName(event.target.value)}
                placeholder="Np. Eskalacja rytuału"
                className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="quick-clock-segments" className="text-sm font-medium text-surface-700">
                Segmenty
              </label>
              <select
                id="quick-clock-segments"
                value={quickClockSegments}
                onChange={(event) => setQuickClockSegments(Number(event.target.value))}
                className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {CLOCK_SEGMENTS.map((segments) => (
                  <option key={segments} value={segments}>{segments}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowQuickClockModal(false)}
                className="rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => void handleCreateQuickClock()}
                disabled={!quickClockName.trim() || quickClockSaving}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {quickClockSaving ? 'Zapisywanie...' : 'Dodaj zegar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={confirmReactivate}
        title="Wznów zagrożenie"
        description={`Czy chcesz przywrócić zagrożenie "${currentThreat.name}" jako aktywne? Powód zakończenia zostanie usunięty.`}
        confirmLabel="Wznów"
        cancelLabel="Anuluj"
        destructive={false}
        onConfirm={handleConfirmReactivate}
        onCancel={() => setConfirmReactivate(false)}
      />

      {showThreadPicker && (
        <RelationPicker
          sourceId={currentThreat.id}
          sourceType="threat"
          initialTargetType="thread"
          initialRelationType="affects"
          lockTargetType
          lockRelationType
          onClose={() => setShowThreadPicker(false)}
        />
      )}

      {showRelPicker && (
        <RelationPicker
          sourceId={currentThreat.id}
          sourceType="threat"
          onClose={() => setShowRelPicker(false)}
        />
      )}
    </div>
  );
}
