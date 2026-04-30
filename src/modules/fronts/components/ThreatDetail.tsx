import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams, Link, useLocation } from 'react-router';
import { AlertTriangle, ArrowLeft, Edit2, GitBranchPlus, Trash2 } from 'lucide-react';
import { useThreatById } from '../hooks/useThreatById';
import { useFronts } from '../hooks/useFronts';
import { ThreatForm } from './ThreatForm';
import { ThreatClockPreview } from './ThreatClockPreview';
import { DetailNotFound } from '@shared/components/DetailNotFound';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Modal } from '@shared/components/Modal';
import { NarrativeLinksSection } from '@shared/components/NarrativeLinksSection';
import { RelationList } from '@shared/components/RelationList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { ClueSection } from '@shared/components/ClueSection';
import { DetailSection } from '@shared/components/DetailSection';
import { DetailScrollTopFab } from '@shared/components/DetailScrollTopFab';
import { DetailTocBar } from '@shared/components/DetailTocBar';
import { NotesList } from '@modules/notes/components/NotesList';
import {
  addEntity,
  addRelation,
  assignBelongsTo,
  deleteEntity,
  deleteRelation,
  updateEntity,
} from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelatedEntities } from '@shared/hooks/useRelatedEntities';
import { useThreatDetailPath } from '@shared/hooks/useThreatDetailPath';
import { isClock } from '@modules/clocks/types';
import { markClockLinkedToThreat, markClockUnlinkedFromThreat } from '@modules/clocks/threatClockLink';
import { toast } from 'sonner';
import {
  THREAT_DEATH_REASON_PRESETS,
  THREAT_COMPLETION_OUTCOME_LABELS,
  inferThreatCompletionOutcomeFromClock,
  getThreatRadarArchetype,
  normalizeThreatPillars,
} from '../types';
import type { ThreatCompletionOutcome } from '../types';
import { getThreatStatus, getClockData } from '@shared/utils/entityData';
import { normalizeThreatLifecycle } from '@shared/utils/threatLifecycle';
import { buildDerivedThreatDefaults, getCompletedClockLabels } from '../utils/derivedThreat';
import { getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';
import type { ThreatFormValues } from './ThreatForm';

export function ThreatDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db, campaignId } = useCampaign();
  const { threat } = useThreatById(id);
  const { threat: forkSourceThreat } = useThreatById(threat?.data.forkThreatId);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [toggleReason, setToggleReason] = useState('');
  const [toggleReasonError, setToggleReasonError] = useState('');
  const [toggleCompletionOutcome, setToggleCompletionOutcome] =
    useState<ThreatCompletionOutcome>('resolved_early');
  const [confirmReactivate, setConfirmReactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showThreadPicker, setShowThreadPicker] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState<{
    relationId: string;
    title: string;
    description: string;
  } | null>(null);
  const [showDerivedModal, setShowDerivedModal] = useState(false);
  const [derivedSaving, setDerivedSaving] = useState(false);
  const [showFrontRelinkModal, setShowFrontRelinkModal] = useState(false);
  const [relinkFrontId, setRelinkFrontId] = useState('');
  const [relinkFrontSaving, setRelinkFrontSaving] = useState(false);
  const [confirmRestorePillarIndex, setConfirmRestorePillarIndex] = useState<number | null>(null);
  const returnToSessionLive = (location.state as { returnToSessionLive?: string } | null)
    ?.returnToSessionLive;
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
  const fronts = useFronts();

  const threatTocItems = useMemo(() => {
    if (!threat || !id || isEditing) return [];
    const t = threat;
    const items: { id: string; label: string }[] = [
      { id: 'threat-detail-kontekst', label: 'Kontekst' },
      { id: 'threat-detail-wskazowki', label: 'Wskazówki' },
    ];
    const hasHistoria = Boolean(
      forkSourceThreat || t.data.completionReason || t.data.reasonOfDead,
    );
    if (t.data.moves.length > 0) items.push({ id: 'threat-detail-ruchy', label: 'Ruchy' });
    if (normalizeThreatPillars(t.data.pillars).length > 0) items.push({ id: 'threat-detail-filary', label: 'Filary' });
    if (typeof t.data.inheritanceNotes === 'string' && t.data.inheritanceNotes.trim().length > 0) {
      items.push({ id: 'threat-detail-dziedzictwo', label: 'Dziedzictwo' });
    }
    if (hasHistoria) items.push({ id: 'threat-detail-historia', label: 'Historia' });
    if (t.description) items.push({ id: 'threat-detail-opis', label: 'Opis' });
    items.push({ id: 'threat-detail-zegar', label: 'Zegar presji' });
    items.push(
      { id: 'threat-detail-powiazania', label: 'Powiązania' },
      { id: 'threat-detail-notatki', label: 'Notatki MG' },
    );
    items.push({ id: 'threat-detail-tagi', label: 'Tagi' });
    return items;
  }, [threat, id, isEditing, forkSourceThreat]);

  useEffect(() => {
    if (!id || !linkedClock) return;
    const k = linkedClock.data.kind ?? 'free';
    if (k === 'session' || k === 'threat') return;
    void markClockLinkedToThreat(db, linkedClock.id);
  }, [db, id, linkedClock]);

  if (threat === undefined) return <LoadingSpinner />;

  if (!threat || !id) {
    return (
      <DetailNotFound
        icon={AlertTriangle}
        title="Nie znaleziono zagrożenia"
        description="Mogło zostać usunięte albo odnośnik jest nieaktualny."
        to="/threats"
        linkLabel="Wróć do listy zagrożeń"
      />
    );
  }

  const currentThreat = threat;
  const threatId = id;
  const normalizedPillars = normalizeThreatPillars(currentThreat.data.pillars);
  const threatStatus = getThreatStatus(currentThreat);
  const completedClockLabels = getCompletedClockLabels(linkedClock);
  const derivedThreatDefaults = buildDerivedThreatDefaults(currentThreat, linkedClock);
  const parentFrontEntity = parentFront?.[0]?.entity;

  function openToggleFlow() {
    if (threatStatus === 'completed') {
      setConfirmReactivate(true);
    } else {
      setToggleCompletionOutcome(inferThreatCompletionOutcomeFromClock(linkedClock ?? undefined));
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
          completionOutcome: toggleCompletionOutcome,
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
          completionOutcome: undefined,
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
      const lifecycle = normalizeThreatLifecycle(values.status, values.completionReason);
      await updateEntity(db, threatId, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          ...currentThreat.data,
          threatType: values.threatType,
          radarArchetype: values.radarArchetype,
          impulse: values.impulse,
          moves: values.moves,
          pillars: values.pillars,
          trigger: values.trigger,
          inheritanceNotes: values.inheritanceNotes,
          forkThreatId: values.forkThreatId,
          ...lifecycle,
          ...(values.status === 'completed'
            ? {
                completionOutcome:
                  values.completionOutcome ?? currentThreat.data.completionOutcome,
              }
            : { completionOutcome: undefined }),
        },
      });

      if (linkedClock && values.clock) {
        const clockData = getClockData(linkedClock);
        const seg = values.clock.segments;
        const rawLabels = (values.clock.tickLabels ?? []).slice(0, seg);
        const tickLabels = [...rawLabels];
        while (tickLabels.length < seg) tickLabels.push('');
        await updateEntity(db, linkedClock.id, {
          name: values.clock.name,
          data: {
            ...clockData,
            segments: seg,
            filled: Math.min(clockData.filled, seg),
            tickLabels: tickLabels.map((line) => line.slice(0, 300)),
            isActive: lifecycle.status !== 'completed',
          },
        });
      } else if (linkedClock && !values.clock) {
        const rel = await db.relations
          .where('sourceId')
          .equals(threatId)
          .filter((r) => r.type === 'tracks')
          .first();
        if (rel) await deleteRelation(db, rel.id);
        await markClockUnlinkedFromThreat(db, linkedClock.id);
      } else if (values.clock && !linkedClock) {
        const seg = values.clock.segments;
        const rawLabels = (values.clock.tickLabels ?? []).slice(0, seg);
        const tickLabels = [...rawLabels];
        while (tickLabels.length < seg) tickLabels.push('');
        const clockEntity = await addEntity(db, {
          type: 'clock',
          name: values.clock.name,
          description: '',
          tags: [],
          data: {
            kind: 'threat',
            segments: seg,
            filled: 0,
            tickLabels: tickLabels.map((line) => line.slice(0, 300)),
            isActive: lifecycle.status !== 'completed',
          },
        });
        await addRelation(db, { type: 'tracks', sourceId: threatId, targetId: clockEntity.id });
        await markClockLinkedToThreat(db, clockEntity.id);
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
      const lifecycle = normalizeThreatLifecycle(values.status, values.completionReason);
      const entity = await addEntity(db, {
        type: 'threat',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          threatType: values.threatType,
          radarArchetype: values.radarArchetype,
          impulse: values.impulse,
          moves: values.moves,
          pillars: values.pillars,
          trigger: values.trigger,
          inheritanceNotes: values.inheritanceNotes,
          forkThreatId: currentThreat.id,
          ...lifecycle,
          ...(values.status === 'completed' && values.completionOutcome
            ? { completionOutcome: values.completionOutcome }
            : {}),
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
        const seg = values.clock.segments;
        const rawLabels = (values.clock.tickLabels ?? []).slice(0, seg);
        const tickLabels = [...rawLabels];
        while (tickLabels.length < seg) tickLabels.push('');
        const clockEntity = await addEntity(db, {
          type: 'clock',
          name: values.clock.name,
          description: '',
          tags: [],
          data: {
            kind: 'threat',
            segments: seg,
            filled: 0,
            tickLabels: tickLabels.map((line) => line.slice(0, 300)),
            isActive: lifecycle.status !== 'completed',
          },
        });
        await addRelation(db, { type: 'tracks', sourceId: entity.id, targetId: clockEntity.id });
        await markClockLinkedToThreat(db, clockEntity.id);
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

  function openFrontRelinkModal() {
    const defaultFrontId = parentFrontEntity?.id ?? fronts?.[0]?.id ?? '';
    setRelinkFrontId(defaultFrontId);
    setShowFrontRelinkModal(true);
  }

  async function handleRelinkFront() {
    if (!relinkFrontId || relinkFrontSaving) return;

    setRelinkFrontSaving(true);
    try {
      await assignBelongsTo(db, {
        sourceId: threatId,
        targetId: relinkFrontId,
      });

      const selectedFront = fronts?.find((front) => front.id === relinkFrontId);
      const selectedFrontName = selectedFront?.name ?? 'wybrany front';

      if (parentFrontEntity?.id === relinkFrontId) {
        toast.success(`Przypisanie frontu "${selectedFrontName}" odświeżone`);
      } else if (parentFrontEntity) {
        toast.success(`Zmieniono front na "${selectedFrontName}"`);
      } else {
        toast.success(`Przypisano front "${selectedFrontName}"`);
      }

      setShowFrontRelinkModal(false);
    } catch {
      toast.error('Nie udało się przepiąć frontu');
    } finally {
      setRelinkFrontSaving(false);
    }
  }

  async function handleConfirmUnlink() {
    if (!unlinkConfirm) return;
    try {
      await deleteRelation(db, unlinkConfirm.relationId);
      toast.success('Usunięto powiązanie z tego widoku');
      setUnlinkConfirm(null);
    } catch {
      toast.error('Nie udało się usunąć powiązania');
    }
  }

  async function handleSetPillarDestroyed(index: number, destroyed: boolean) {
    const pillars = normalizeThreatPillars(currentThreat.data.pillars);
    const next = pillars.map((pillar, pillarIndex) =>
      pillarIndex === index ? { ...pillar, destroyed } : pillar,
    );
    try {
      await updateEntity(db, threatId, {
        data: {
          ...currentThreat.data,
          pillars: next,
        },
      });
      toast.success(destroyed ? 'Filar oznaczony jako zniszczony' : 'Filar przywrócony');
    } catch {
      toast.error('Nie udało się zaktualizować filaru');
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <Link
        to={backPath}
        className="text-surface-500 hover:text-primary-700 flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {returnToSessionLive ? 'Sesja na żywo' : 'Zagrożenia'}
      </Link>

      <div className="app-panel-strong flex flex-col gap-5 rounded-[1.9rem] border border-white/40 px-6 py-6 shadow-[0_28px_60px_rgba(18,45,66,0.12)] lg:flex-row lg:items-start lg:justify-between lg:px-7">
        <div className="flex items-center gap-4">
          <div className="app-danger-card rounded-[1.25rem] p-3 text-amber-700 shadow-[0_14px_28px_rgba(210,166,67,0.18)]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-surface-900 text-3xl font-semibold tracking-[-0.03em]">
              {currentThreat.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="app-danger-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                {getCatalogLabelByValue('threatType', currentThreat.data.threatType, campaignId)}
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  threatStatus === 'completed'
                    ? 'app-pill-muted'
                    : 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
                }`}
              >
                {threatStatus === 'completed' ? 'Zakończone' : 'Aktywne'}
              </span>
              {threatStatus === 'completed' && currentThreat.data.completionOutcome && (
                <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                  {THREAT_COMPLETION_OUTCOME_LABELS[currentThreat.data.completionOutcome]}
                </span>
              )}
              {threatStatus === 'completed' && !currentThreat.data.completionOutcome && (
                <span className="text-surface-500 text-xs font-medium">
                  Sposób zakończenia niezapisany (starszy wpis)
                </span>
              )}
            </div>
            <p className="text-surface-600 mt-3 text-xs">
              {parentFrontEntity
                ? `Front: ${parentFrontEntity.name}`
                : 'Front: brak przypisania'}
              {' • '}
              {linkedClock ? `Zegar: ${linkedClock.name}` : 'Zegar: brak'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => openToggleFlow()}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
              threatStatus === 'completed'
                ? 'border border-emerald-300/70 bg-emerald-100/75 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] hover:bg-emerald-100'
                : 'app-button-secondary'
            }`}
          >
            {threatStatus === 'completed' ? 'Wznów' : 'Zakończ'}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Edit2 className="h-3.5 w-3.5" /> {isEditing ? 'Anuluj' : 'Edytuj'}
          </button>
          {threatStatus === 'completed' && (
            <button
              type="button"
              onClick={() => setShowDerivedModal(true)}
              className="app-button-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
            >
              <GitBranchPlus className="h-3.5 w-3.5" /> Utwórz zagrożenie wynikające
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="app-button-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {!isEditing && (
        <DetailTocBar ariaLabel="Sekcje karty zagrożenia" items={threatTocItems} />
      )}

      {isEditing ? (
        <div className="app-panel rounded-[1.75rem] p-4 shadow-[0_20px_40px_rgba(18,45,66,0.08)] lg:p-6">
          <ThreatForm
            defaultValues={{
              name: currentThreat.name,
              threatType: currentThreat.data.threatType,
              radarArchetype: getThreatRadarArchetype(currentThreat.data),
              status: threatStatus,
              impulse: currentThreat.data.impulse,
              trigger: currentThreat.data.trigger ?? '',
              completionReason: currentThreat.data.completionReason ?? currentThreat.data.reasonOfDead ?? '',
              inheritanceNotes:
                typeof currentThreat.data.inheritanceNotes === 'string'
                  ? currentThreat.data.inheritanceNotes
                  : '',
              forkThreatId: currentThreat.data.forkThreatId,
              moves: currentThreat.data.moves,
              pillars: normalizeThreatPillars(currentThreat.data.pillars),
              description: currentThreat.description,
              tags: currentThreat.tags,
              clock: linkedClock
                ? {
                    name: linkedClock.name,
                    segments: linkedClock.data.segments,
                    tickLabels: [...(linkedClock.data.tickLabels ?? [])],
                  }
                : null,
              completionOutcome:
                currentThreat.data.completionOutcome ??
                (threatStatus === 'completed'
                  ? inferThreatCompletionOutcomeFromClock(linkedClock ?? undefined)
                  : undefined),
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
            sectionId="threat-detail-kontekst"
            title="Kontekst zagrożenia"
            tone="accent"
            contentClassName="flex flex-col gap-5 lg:gap-6"
          >
            {currentThreat.data.impulse && (
              <div className="app-danger-card rounded-[1.5rem] px-5 py-6">
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-amber-700 uppercase">
                  Impuls
                </h2>
                <p className="text-surface-800 text-sm italic">{currentThreat.data.impulse}</p>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="app-panel rounded-[1.5rem] p-6">
                <NarrativeLinksSection
                  title="Front nadrzędny"
                  items={parentFront}
                  emptyMessage="To zagrożenie nie jest jeszcze podpięte do żadnego frontu."
                  actionLabel={parentFrontEntity ? '+ Zmień front' : '+ Przypisz front'}
                  onAction={openFrontRelinkModal}
                  onRemoveItem={(item) =>
                    setUnlinkConfirm({
                      relationId: item.relation.id,
                      title: 'Usunąć powiązany front?',
                      description: `Czy na pewno chcesz usunąć front „${item.entity.name}" z tego widoku zagrożenia?`,
                    })}
                  removeAriaLabel={(item) => `Usuń front ${item.entity.name} z tego widoku`}
                />
              </div>

              <div className="app-panel rounded-[1.5rem] p-6">
                <NarrativeLinksSection
                  title="Powiązane wątki"
                  items={relatedThreads}
                  emptyMessage="To zagrożenie nie ma jeszcze podpiętych wątków przez relację affects."
                  actionLabel="+ Dodaj wątek"
                  onAction={() => setShowThreadPicker(true)}
                  onRemoveItem={(item) =>
                    setUnlinkConfirm({
                      relationId: item.relation.id,
                      title: 'Usunąć powiązany wątek?',
                      description: `Czy na pewno chcesz usunąć wątek „${item.entity.name}" z tego widoku zagrożenia?`,
                    })}
                  removeAriaLabel={(item) => `Usuń wątek ${item.entity.name} z tego widoku`}
                />
              </div>
            </div>

            <div id="threat-detail-wskazowki" className="scroll-mt-6">
              <div className="app-panel rounded-[1.5rem] p-6">
                <ClueSection
                  parentId={threatId}
                  title="Wskazówki zagrożenia"
                  onRemoveRelation={(item) =>
                    setUnlinkConfirm({
                      relationId: item.relation.id,
                      title: 'Usunąć wskazówkę z widoku?',
                      description: `Czy na pewno chcesz usunąć wskazówkę „${item.clue.name}" z tego widoku zagrożenia?`,
                    })}
                />
              </div>
            </div>
          </DetailSection>

          {currentThreat.data.moves.length > 0 && (
            <DetailSection sectionId="threat-detail-ruchy" title="Ruchy zagrożenia">
              <div className="app-panel rounded-[1.5rem] p-5 shadow-[0_12px_24px_rgba(18,45,66,0.06)] lg:p-6">
                <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-2">
                  {currentThreat.data.moves.map((move, index) => (
                    <li
                      key={index}
                      className="app-input-shell flex min-h-full min-w-0 gap-3 rounded-[1.25rem] border px-4 py-4 shadow-[0_12px_24px_rgba(18,45,66,0.04)]"
                    >
                      <span className="app-pill-muted inline-flex h-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                        {index + 1}
                      </span>
                      <p className="text-surface-800 min-w-0 flex-1 text-sm leading-6 break-words">{move}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </DetailSection>
          )}

          {normalizedPillars.length > 0 && (
            <DetailSection sectionId="threat-detail-filary" title="Filary zagrożenia">
              <div className="app-panel rounded-[1.5rem] p-5 shadow-[0_12px_24px_rgba(18,45,66,0.06)] lg:p-6">
                <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-2">
                  {normalizedPillars.map((pillar, index) => (
                    <li
                      key={`${pillar.label}:${index}`}
                      className="app-input-shell flex min-h-full min-w-0 gap-3 rounded-[1.25rem] border px-4 py-4 shadow-[0_12px_24px_rgba(18,45,66,0.04)]"
                    >
                      <span className="app-pill-muted inline-flex h-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex flex-1 items-start justify-between gap-3">
                        <p
                          className={`text-surface-800 min-w-0 flex-1 text-sm leading-6 break-words ${
                            pillar.destroyed ? 'line-through opacity-70' : ''
                          }`}
                        >
                          {pillar.label}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            pillar.destroyed
                              ? setConfirmRestorePillarIndex(index)
                              : void handleSetPillarDestroyed(index, true)}
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            pillar.destroyed
                              ? 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
                              : 'app-button-danger'
                          }`}
                        >
                          {pillar.destroyed ? 'Zniszczony' : 'Zniszcz'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </DetailSection>
          )}

          {typeof currentThreat.data.inheritanceNotes === 'string' &&
            currentThreat.data.inheritanceNotes.trim().length > 0 && (
              <DetailSection
                sectionId="threat-detail-dziedzictwo"
                title="Dziedzictwo zagrożenia"
              >
                <p className="text-surface-700 text-sm whitespace-pre-wrap">
                  {currentThreat.data.inheritanceNotes}
                </p>
              </DetailSection>
            )}

          {(forkSourceThreat || currentThreat.data.completionReason || currentThreat.data.reasonOfDead) && (
            <DetailSection
              sectionId="threat-detail-historia"
              title="Historia"
              contentClassName="flex flex-col gap-5"
            >
              <div className="grid gap-5 lg:grid-cols-2">
                {forkSourceThreat && (
                  <div className="app-panel rounded-[1.5rem] p-6">
                    <h2 className="text-surface-500 mb-2 text-xs font-semibold tracking-wide uppercase">
                      Powstało z zagrożenia
                    </h2>
                    {forkSourcePath ? (
                      <Link
                        to={forkSourcePath}
                        className="text-primary-700 text-sm font-medium hover:underline"
                      >
                        {forkSourceThreat.name}
                      </Link>
                    ) : (
                      <p className="text-surface-700 text-sm">{forkSourceThreat.name}</p>
                    )}
                  </div>
                )}

                {(currentThreat.data.completionReason ?? currentThreat.data.reasonOfDead) && (
                  <div
                    className={`app-danger-card rounded-[1.5rem] p-6 ${
                      forkSourceThreat ? '' : 'lg:col-span-2'
                    }`}
                  >
                    <h2 className="text-surface-500 mb-2 text-xs font-semibold tracking-wide uppercase">
                      Powód wygaszenia / śmierci
                    </h2>
                    <p className="text-surface-700 text-sm whitespace-pre-wrap">
                      {currentThreat.data.completionReason ?? currentThreat.data.reasonOfDead}
                    </p>
                  </div>
                )}
              </div>
            </DetailSection>
          )}

          {currentThreat.description && (
            <DetailSection sectionId="threat-detail-opis" title="Opis">
              <div className="app-panel min-w-0 w-full rounded-[1.5rem] p-5 lg:p-6">
                <div
                  className="prose prose-sm prose-headings:text-surface-800 prose-p:text-surface-800 prose-li:text-surface-800 prose-a:text-primary-700 min-w-0 w-full max-w-none text-pretty text-surface-800 [&_*]:max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentThreat.description }}
                />
              </div>
            </DetailSection>
          )}

          <DetailSection
            sectionId="threat-detail-zegar"
            title="Zegar presji"
            contentClassName="flex flex-col gap-5"
          >
            {!linkedClock ? (
              <div className="app-input-shell text-surface-500 rounded-[1.25rem] px-4 py-4 text-sm">
                <p>Brak powiązanego zegara.</p>
                <p className="mt-2 text-xs leading-relaxed">
                  Dodaj zegar i uzupełnij warunki w trybie <span className="text-surface-700 font-medium">Edytuj</span>.
                </p>
              </div>
            ) : (
              <ThreatClockPreview clock={linkedClock} triggerText={currentThreat.data.trigger} />
            )}
            {!linkedClock &&
              (currentThreat.data.trigger ?? '').split(/\r?\n/).some((l) => l.trim().length > 0) && (
                <div className="app-panel rounded-[1.5rem] p-6">
                  <h2 className="text-surface-500 mb-2 text-xs font-semibold tracking-wide uppercase">
                    Zegar tyka, gdy
                  </h2>
                  <ul className="list-none space-y-0.5 pl-0 text-sm leading-snug text-surface-700">
                    {(currentThreat.data.trigger ?? '')
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line, index) => (
                        <li key={`${currentThreat.id}-trigger-ro-${index}`} className="flex gap-0.5">
                          <span
                            className="text-primary-600/75 mt-[0.15em] shrink-0 text-[10px] leading-none"
                            aria-hidden
                          >
                            ▸
                          </span>
                          <span className="min-w-0">{line}</span>
                        </li>
                      ))}
                  </ul>
                  <p className="text-surface-500 mt-3 text-xs">
                    Po dodaniu zegara te warunki będą też widoczne na karcie zegara.
                  </p>
                </div>
              )}
          </DetailSection>

          <DetailSection
            sectionId="threat-detail-powiazania"
            title="Powiązania świata"
            action={
              <button
                type="button"
                onClick={() => setShowRelPicker(true)}
                className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
              >
                + Dodaj
              </button>
            }
          >
            <RelationList
              entityId={currentThreat.id}
              excludeRelationTypes={['belongs_to', 'affects', 'tracks', 'clues_for']}
              emptyMessage="Brak dodatkowych relacji świata dla tego zagrożenia."
            />
          </DetailSection>

          <DetailSection
            sectionId="threat-detail-notatki"
            title="Notatki MG"
          >
            <NotesList
              entityId={currentThreat.id}
              showTitle={false}
              emptyMessage="Brak notatek podpiętych do tego zagrożenia."
            />
          </DetailSection>

          <DetailSection
            sectionId="threat-detail-tagi"
            title="Tagi"
            contentClassName="flex flex-col gap-3"
          >
            {currentThreat.tags.length === 0 ? (
              <p className="text-surface-500 text-sm">Brak tagów — dodaj je w trybie edycji zagrożenia.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {currentThreat.tags.map((tag) => (
                  <span
                    key={tag}
                    className="app-danger-pill rounded-full px-2.5 py-1 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </DetailSection>

          <DetailScrollTopFab enabled={threatTocItems.length > 0} />
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
          <p className="text-surface-600 text-sm">Podaj powód zakończenia zagrożenia:</p>
          <textarea
            placeholder="Podaj powód zakończenia..."
            value={toggleReason}
            onChange={(e) => {
              setToggleReason(e.target.value);
              if (toggleReasonError) setToggleReasonError('');
            }}
            rows={4}
            className="app-input text-surface-800 mt-3 w-full rounded-[1.2rem] px-4 py-3 text-sm"
          />
          {toggleReasonError && <p className="mt-2 text-xs text-red-600">{toggleReasonError}</p>}

          <div className="mt-4 rounded-[1.1rem] border border-[rgba(86,93,94,0.14)] bg-[rgba(223,225,218,0.45)] p-3">
            <p className="text-surface-800 text-xs font-semibold tracking-wide uppercase">
              Jak zakończyło się zagrożenie?
            </p>
            <p className="text-surface-600 mt-1 text-xs leading-relaxed">
              <strong className="text-surface-800">Rozwiązane</strong> — padło lub zamknięte fabularnie przy niepełnym
              zegarze. <strong className="text-surface-800">Ukończone</strong> — kanoniczne domknięcie zegara
              (ostatni segment).
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              {(
                [
                  ['resolved_early', THREAT_COMPLETION_OUTCOME_LABELS.resolved_early],
                  ['completed_by_clock', THREAT_COMPLETION_OUTCOME_LABELS.completed_by_clock],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-transparent px-1 py-0.5 hover:border-[rgba(86,93,94,0.12)]"
                >
                  <input
                    type="radio"
                    name="threat-completion-outcome"
                    className="mt-0.5"
                    checked={toggleCompletionOutcome === value}
                    onChange={() => setToggleCompletionOutcome(value)}
                  />
                  <span className="text-surface-800 text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {THREAT_DEATH_REASON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setToggleReason(preset)}
                className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setToggleModalOpen(false)}
              className="app-button-secondary rounded-full px-4 py-2 text-sm font-medium"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmComplete()}
              disabled={toggleSaving}
              className={`rounded-full px-4 py-2 text-sm font-medium text-white ${toggleSaving ? 'bg-primary-600/70' : 'bg-danger-600 hover:bg-danger-700'}`}
            >
              Zakończ
            </button>
          </div>
        </Modal>
      )}

      {showDerivedModal && (
        <Modal title="Nowe zagrożenie wynikające" onClose={() => setShowDerivedModal(false)}>
          <div className="app-panel border-primary-200/50 text-surface-700 mb-4 rounded-[1.35rem] border px-4 py-4 text-sm">
            <p>
              Źródło: <span className="text-surface-900 font-medium">{currentThreat.name}</span>
            </p>
            {completedClockLabels.length > 0 ? (
              <div className="mt-2">
                <p className="text-surface-900 font-medium">Przenoszone ukończone kroki zegara:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                  {completedClockLabels.map((label, index) => (
                    <li key={`${index}-${label}`}>{label}</li>
                  ))}
                </ul>
              </div>
            ) : linkedClock && linkedClock.data.filled > 0 ? (
              <p className="mt-2">
                Zapiszę w opisie informację, że w źródle ukończono {linkedClock.data.filled} z{' '}
                {linkedClock.data.segments} segmentów zegara.
              </p>
            ) : (
              <p className="text-surface-600 mt-2">
                Źródłowy zegar nie ma ukończonych nazwanych kroków do przeniesienia.
              </p>
            )}
            {parentFrontEntity && (
              <p className="text-surface-600 mt-2">
                Nowe zagrożenie zostanie też automatycznie podpięte pod front:{' '}
                <span className="text-surface-900 font-medium">{parentFrontEntity.name}</span>.
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

      {showFrontRelinkModal && (
        <Modal title="Przepnij zagrożenie do frontu" onClose={() => setShowFrontRelinkModal(false)}>
          <div className="flex flex-col gap-4">
            {fronts === undefined ? (
              <p className="text-surface-600 text-sm">Ładowanie listy frontów...</p>
            ) : fronts.length === 0 ? (
              <>
                <p className="text-surface-600 text-sm">
                  Brak frontów do wyboru. Utwórz najpierw front, a potem wróć do tego zagrożenia.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFrontRelinkModal(false)}
                    className="app-button-secondary rounded-full px-4 py-2 text-sm font-medium"
                  >
                    Zamknij
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="threat-front-select"
                    className="text-surface-700 text-sm font-medium"
                  >
                    Wybierz front
                  </label>
                  <select
                    id="threat-front-select"
                    value={relinkFrontId}
                    onChange={(event) => setRelinkFrontId(event.target.value)}
                    className="app-input text-surface-800 focus:border-primary-500 rounded-[1.1rem] px-3 py-2.5 text-sm focus:outline-none"
                    autoFocus
                  >
                    {fronts.map((front) => (
                      <option key={front.id} value={front.id}>
                        {front.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="app-panel text-surface-600 rounded-[1.15rem] px-3 py-2.5 text-xs">
                  Zmiana zaktualizuje relację belongs_to tego zagrożenia.
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFrontRelinkModal(false)}
                    className="app-button-secondary rounded-full px-4 py-2 text-sm font-medium"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRelinkFront()}
                    disabled={!relinkFrontId || relinkFrontSaving}
                    className="app-button-primary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {relinkFrontSaving ? 'Zapisywanie...' : 'Zapisz'}
                  </button>
                </div>
              </>
            )}
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

      <ConfirmDialog
        open={unlinkConfirm !== null}
        title={unlinkConfirm?.title ?? 'Usunąć powiązanie?'}
        description={unlinkConfirm?.description ?? ''}
        onConfirm={() => void handleConfirmUnlink()}
        onCancel={() => setUnlinkConfirm(null)}
      />

      <ConfirmDialog
        open={confirmRestorePillarIndex !== null}
        title="Przywrócić filar?"
        description="Czy na pewno chcesz przywrócić filar?"
        confirmLabel="Przywróć"
        destructive={false}
        onConfirm={() => {
          if (confirmRestorePillarIndex === null) return;
          void handleSetPillarDestroyed(confirmRestorePillarIndex, false);
          setConfirmRestorePillarIndex(null);
        }}
        onCancel={() => setConfirmRestorePillarIndex(null)}
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
