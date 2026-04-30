import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router';
import { ArrowLeft, Edit2, Trash2, X, Plus, AlertTriangle, Shield, Search, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useFrontById } from '../hooks/useFrontById';
import { useFronts } from '../hooks/useFronts';
import { useThreats } from '../hooks/useThreats';
import { useThreatById } from '../hooks/useThreatById';
import { FrontForm } from './FrontForm';
import { ThreatForm } from './ThreatForm';
import { ThreatCard } from './ThreatCard';
import { ThreatGenealogySection } from './ThreatGenealogySection';
import { ClockWidget } from '@modules/clocks/components/ClockWidget';
import { markClockLinkedToThreat, markClockUnlinkedFromThreat } from '@modules/clocks/threatClockLink';
import { TickProgress } from '@shared/components/TickProgress';
import { ClueSection } from '@shared/components/ClueSection';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { DetailNotFound } from '@shared/components/DetailNotFound';
import { EmptyState } from '@shared/components/EmptyState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { NarrativeLinksSection } from '@shared/components/NarrativeLinksSection';
import { RelationList } from '@shared/components/RelationList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { DetailSection } from '@shared/components/DetailSection';
import { DetailScrollTopFab } from '@shared/components/DetailScrollTopFab';
import { DetailTocBar } from '@shared/components/DetailTocBar';
import { EntityTypeBadge } from '@shared/components/EntityTypeBadge';
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
import { toast } from 'sonner';
import {
  FRONT_CATEGORY_LABELS,
  inferThreatCompletionOutcomeFromClock,
  getThreatRadarArchetype,
  normalizeThreatPillars,
} from '../types';
import { getThreatStatus, getClockData } from '@shared/utils/entityData';
import { normalizeThreatLifecycle } from '@shared/utils/threatLifecycle';
import { formatPolishThreatCount } from '@shared/utils/polishPlural';
import { getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';
import type { FrontFormValues } from './FrontForm';
import type { ThreatFormValues } from './ThreatForm';

interface ThreatDetailPanelProps {
  threatId: string;
  onClose: () => void;
}

function ThreatDetailPanel({ threatId, onClose }: ThreatDetailPanelProps) {
  const { db, campaignId } = useCampaign();
  const { threat } = useThreatById(threatId);
  const { threat: forkSourceThreat } = useThreatById(threat?.data.forkThreatId);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showThreadPicker, setShowThreadPicker] = useState(false);
  const forkSourcePath = useThreatDetailPath(forkSourceThreat?.id);

  const linkedClock = useLiveQuery(async () => {
    const rels = await db.relations
      .where('sourceId')
      .equals(threatId)
      .filter((relation) => relation.type === 'tracks')
      .toArray();

    if (!rels.length) return null;

    const rel = rels[0];
    if (!rel) return null;

    const entity = await db.entities.get(rel.targetId);
    return entity && isClock(entity) ? entity : null;
  }, [db, threatId]);

  const parentFront = useRelatedEntities(threatId, {
    relationTypes: ['belongs_to'],
    direction: 'outgoing',
    otherTypes: ['front'],
  });

  const relatedThreads = useRelatedEntities(threatId, {
    relationTypes: ['affects'],
    direction: 'both',
    otherTypes: ['thread'],
  });

  if (!threat) return null;

  async function handleUpdate(values: ThreatFormValues) {
    setSaving(true);
    try {
      const lifecycle = normalizeThreatLifecycle(values.status, values.completionReason);

      await updateEntity(db, threatId, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          ...threat!.data,
          threatType: values.threatType,
          radarArchetype: values.radarArchetype,
          impulse: values.impulse,
          moves: values.moves,
          pillars: values.pillars,
          trigger: values.trigger,
          inheritanceNotes: values.inheritanceNotes,
          forkThreatId: values.forkThreatId,
          ...lifecycle,
          ...(lifecycle.status === 'completed'
            ? {
                completionOutcome:
                  values.completionOutcome ??
                  threat!.data.completionOutcome ??
                  inferThreatCompletionOutcomeFromClock(linkedClock ?? undefined),
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

  async function handleDelete() {
    const name = threat!.name;

    try {
      if (linkedClock) {
        await deleteEntity(db, linkedClock.id);
      }

      await deleteEntity(db, threatId);
      toast.success(`Zagrożenie "${name}" usunięte`);
      onClose();
    } catch {
      toast.error('Nie udało się usunąć zagrożenia');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30">
      <div
        className="app-panel-strong flex h-full w-full max-w-lg flex-col overflow-y-auto rounded-l-[1.8rem] shadow-2xl"
        role="dialog"
        aria-label={`Zagrożenie: ${threat.name}`}
      >
        <div className="flex items-center justify-between border-b border-[rgba(86,93,94,0.14)] px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-warning-600 h-4 w-4" />
            <h2 className="text-surface-900 font-semibold">{threat.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-button-secondary text-surface-600 rounded-xl p-2 transition-colors"
            aria-label="Zamknij panel zagrożenia"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isEditing ? (
            <ThreatForm
              defaultValues={{
                name: threat.name,
                threatType: threat.data.threatType,
                radarArchetype: getThreatRadarArchetype(threat.data),
                status: getThreatStatus(threat),
                impulse: threat.data.impulse,
                trigger: threat.data.trigger ?? '',
                completionReason: threat.data.completionReason ?? threat.data.reasonOfDead ?? '',
                completionOutcome:
                  threat.data.completionOutcome ??
                  (getThreatStatus(threat) === 'completed'
                    ? inferThreatCompletionOutcomeFromClock(linkedClock ?? undefined)
                    : undefined),
                inheritanceNotes:
                  typeof threat.data.inheritanceNotes === 'string'
                    ? threat.data.inheritanceNotes
                    : '',
                forkThreatId: threat.data.forkThreatId,
                moves: threat.data.moves,
                pillars: normalizeThreatPillars(threat.data.pillars),
                description: threat.description,
                tags: threat.tags,
                clock: linkedClock
                  ? {
                      name: linkedClock.name,
                      segments: linkedClock.data.segments,
                      tickLabels: [...(linkedClock.data.tickLabels ?? [])],
                    }
                  : null,
              }}
              onSubmit={handleUpdate}
              isSaving={saving}
              onCancel={() => setIsEditing(false)}
              currentThreatId={threat.id}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="app-button-secondary flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edytuj
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="app-button-danger flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Usuń
                </button>
              </div>

              <div>
                <h3 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                  Rodzaj
                </h3>
                <p className="text-surface-700 text-sm">
                  {getCatalogLabelByValue('threatType', threat.data.threatType, campaignId)}
                </p>
              </div>

              {threat.data.impulse && (
                <div>
                  <h3 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                    Impuls
                  </h3>
                  <p className="text-surface-700 italic">{threat.data.impulse}</p>
                </div>
              )}

              {threat.data.trigger && (
                <div>
                  <h3 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                    Zegar tyka, gdy
                  </h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-surface-700">
                    {threat.data.trigger
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line, index) => (
                        <li key={`${threat.id}-trigger-${index}`}>{line}</li>
                      ))}
                  </ul>
                </div>
              )}

              {forkSourceThreat && (
                <div>
                  <h3 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                    Powstało z zagrożenia
                  </h3>
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

              {(threat.data.completionReason ?? threat.data.reasonOfDead) && (
                <div className="app-danger-card rounded-[1.2rem] px-4 py-3">
                  <h3 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                    Powód wygaszenia / śmierci
                  </h3>
                  <p className="text-surface-700 text-sm whitespace-pre-wrap">
                    {threat.data.completionReason ?? threat.data.reasonOfDead}
                  </p>
                </div>
              )}

              <NarrativeLinksSection
                title="Front nadrzędny"
                items={parentFront}
                emptyMessage="To zagrożenie nie jest jeszcze podpięte do żadnego frontu."
              />

              <NarrativeLinksSection
                title="Powiązane wątki"
                items={relatedThreads}
                emptyMessage="To zagrożenie nie ma jeszcze podpiętych wątków przez relację affects."
                actionLabel="+ Dodaj wątek"
                onAction={() => setShowThreadPicker(true)}
              />

              {threat.data.moves.length > 0 && (
                <div>
                  <h3 className="text-surface-500 mb-2 text-xs font-semibold tracking-wide uppercase">
                    Ruchy zagrożenia
                  </h3>
                  <ul className="list-inside list-disc space-y-1">
                    {threat.data.moves.map((move, index) => (
                      <li key={index} className="text-surface-700 text-sm">
                        {move}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {normalizeThreatPillars(threat.data.pillars).length > 0 && (
                <div>
                  <h3 className="text-surface-500 mb-2 text-xs font-semibold tracking-wide uppercase">
                    Filary zagrożenia
                  </h3>
                  <ul className="list-inside list-disc space-y-1">
                    {normalizeThreatPillars(threat.data.pillars).map((pillar, index) => (
                      <li
                        key={index}
                        className={`text-surface-700 text-sm ${pillar.destroyed ? 'line-through opacity-70' : ''}`}
                      >
                        {pillar.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {threat.description && (
                <div>
                  <h3 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                    Opis
                  </h3>
                  <div
                    className="prose prose-sm text-surface-700 max-w-none"
                    dangerouslySetInnerHTML={{ __html: threat.description }}
                  />
                </div>
              )}

              {threat.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {threat.tags.map((tag) => (
                    <span key={tag} className="app-danger-pill rounded-full px-2.5 py-1 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {linkedClock && (
                <div>
                  <h3 className="text-surface-500 mb-2 text-xs font-semibold tracking-wide uppercase">
                    Powiązany zegar
                  </h3>
                  <Link
                    to={`/clocks/${linkedClock.id}`}
                    className="app-input-shell hover:border-primary-300 m-[-0.25rem] flex items-center gap-3 rounded-[1.2rem] p-3 transition-colors hover:bg-[rgba(229,231,223,0.98)]"
                  >
                    <ClockWidget clock={linkedClock} size={48} showLabel />
                    <span className="text-surface-700 text-sm">{linkedClock.name}</span>
                  </Link>
                  {linkedClock.data.tickLabels && linkedClock.data.tickLabels.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-surface-400 mb-1 text-xs font-semibold tracking-wide uppercase">
                        Opisy tyknięć
                      </h4>
                      <ul className="space-y-1">
                        {linkedClock.data.tickLabels.map((label, index) => (
                          <li
                            key={index}
                            className={`text-xs ${
                              index === Math.max(0, linkedClock.data.filled - 1)
                                ? 'text-surface-800 font-semibold'
                                : index === linkedClock.data.filled
                                  ? 'text-surface-500 italic'
                                  : 'text-surface-400'
                            }`}
                          >
                            <span className="text-surface-300 mr-1.5">{index + 1}.</span>
                            {label}
                          </li>
                        ))}
                      </ul>
                      <TickProgress
                        tickLabels={linkedClock.data.tickLabels}
                        filled={linkedClock.data.filled}
                        segments={linkedClock.data.segments}
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>
              )}

              <ClueSection parentId={threatId} title="Wskazówki" />
            </div>
          )}
        </div>

        <ConfirmDialog
          open={confirmDelete}
          title="Usuń zagrożenie"
          description={`Czy na pewno chcesz usunąć zagrożenie "${threat.name}"? Tej operacji nie można cofnąć.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />

        {showThreadPicker && (
          <RelationPicker
            sourceId={threat.id}
            sourceType="threat"
            initialTargetType="thread"
            initialRelationType="affects"
            lockTargetType
            lockRelationType
            onClose={() => setShowThreadPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

export function FrontDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { db, campaignId } = useCampaign();
  const { front } = useFrontById(id);
  const threats = useThreats(id);
  const allThreats = useThreats();
  const fronts = useFronts();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showThreatForm, setShowThreatForm] = useState(false);
  const [threatComposerMode, setThreatComposerMode] = useState<'create' | 'existing'>('create');
  const [savingThreat, setSavingThreat] = useState(false);
  const [existingThreatQuery, setExistingThreatQuery] = useState('');
  const [assigningThreatId, setAssigningThreatId] = useState<string | null>(null);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const [showFactionPicker, setShowFactionPicker] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState<{
    relationId: string;
    title: string;
    description: string;
  } | null>(null);
  const selectedThreatId = searchParams.get('threat');
  const relatedFactions = useRelatedEntities(id ?? '', {
    relationTypes: ['related_to'],
    direction: 'both',
    otherTypes: ['faction'],
  });

  const returnToSessionLive =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnToSessionLive' in location.state &&
    typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;

  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/fronts';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Fronty';

  function closeThreat() {
    const next = new URLSearchParams(searchParams);
    next.delete('threat');
    setSearchParams(next);
  }

  const threatFrontRelations = useLiveQuery(
    async () => db.relations.where('type').equals('belongs_to').toArray(),
    [db],
  );

  const threatFrontMap = useMemo(
    () =>
      new Map(
        (threatFrontRelations ?? []).map((relation) => [relation.sourceId, relation.targetId]),
      ),
    [threatFrontRelations],
  );
  const threatFrontRelationByThreatId = useMemo(
    () =>
      new Map(
        (threatFrontRelations ?? [])
          .filter((relation) => relation.targetId === front?.id)
          .map((relation) => [relation.sourceId, relation.id]),
      ),
    [threatFrontRelations, front?.id],
  );

  const frontNameById = useMemo(
    () => new Map((fronts ?? []).map((frontEntity) => [frontEntity.id, frontEntity.name])),
    [fronts],
  );

  const filteredExistingThreats = useMemo(() => {
    const normalizedQuery = existingThreatQuery.trim().toLowerCase();

    return (allThreats ?? []).filter((threatEntity) => {
      if (!normalizedQuery) return true;

      return (
        threatEntity.name.toLowerCase().includes(normalizedQuery) ||
        getCatalogLabelByValue('threatType', threatEntity.data.threatType, campaignId)
          .toLowerCase()
          .includes(normalizedQuery) ||
        threatEntity.data.impulse.toLowerCase().includes(normalizedQuery) ||
        threatEntity.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [allThreats, existingThreatQuery]);

  const frontTocItems = useMemo(() => {
    if (!front || isEditing) return [];
    const items: { id: string; label: string }[] = [];
    if (front.data.goal) items.push({ id: 'front-detail-kontekst', label: 'Kontekst' });
    if (front.data.stakes.length > 0) items.push({ id: 'front-detail-stawki', label: 'Stawki' });
    if (front.description) items.push({ id: 'front-detail-opis', label: 'Opis' });
    items.push({ id: 'front-detail-zagrozenia', label: 'Zagrożenia' });
    if (threats && threats.length > 0) {
      items.push({ id: 'front-detail-genealogia', label: 'Genealogia' });
    }
    items.push(
      { id: 'front-detail-powiazania', label: 'Powiązania' },
      { id: 'front-detail-notatki', label: 'Notatki MG' },
      { id: 'front-detail-tagi', label: 'Tagi' },
    );
    return items;
  }, [front, isEditing, id, threats]);

  if (front === undefined) return <LoadingSpinner />;

  if (!front) {
    return (
      <DetailNotFound
        icon={Shield}
        title="Front nie znaleziony"
        description="Mógł zostać usunięty albo odnośnik jest nieaktualny."
        to="/fronts"
        linkLabel="Wróć do listy frontów"
      />
    );
  }

  async function handleUpdate(values: FrontFormValues) {
    setSaving(true);
    try {
      await updateEntity(db, front!.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          category: values.category,
          goal: values.goal,
          stakes: values.stakes,
        },
      });

      toast.success('Front zaktualizowany');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      if (threats && threats.length > 0) {
        await Promise.all(threats.map((threat) => deleteEntity(db, threat.id)));
      }

      await deleteEntity(db, front!.id);
      toast.success(`Front "${front!.name}" usunięty`);
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć frontu');
    }
  }

  async function handleAddThreat(values: ThreatFormValues) {
    setSavingThreat(true);
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
          forkThreatId: values.forkThreatId,
          ...lifecycle,
          ...(lifecycle.status === 'completed'
            ? { completionOutcome: values.completionOutcome ?? 'resolved_early' }
            : { completionOutcome: undefined }),
        },
      });

      await addRelation(db, { type: 'belongs_to', sourceId: entity.id, targetId: front!.id });

      if (values.clock) {
        const seg = values.clock.segments;
        const raw = (values.clock.tickLabels ?? []).slice(0, seg);
        const tickLabels = [...raw];
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

      toast.success(`Zagrożenie "${values.name}" dodane`);
      setShowThreatForm(false);
      setThreatComposerMode('create');
    } catch {
      toast.error('Nie udało się dodać zagrożenia');
    } finally {
      setSavingThreat(false);
    }
  }

  async function handleAssignExistingThreat(threatId: string) {
    const assignedFrontId = threatFrontMap.get(threatId);
    if (assignedFrontId === front!.id) return;

    setAssigningThreatId(threatId);
    try {
      await assignBelongsTo(db, {
        sourceId: threatId,
        targetId: front!.id,
      });

      const selectedThreat = (allThreats ?? []).find(
        (threatEntity) => threatEntity.id === threatId,
      );
      const selectedThreatName = selectedThreat?.name ?? 'Wybrane zagrożenie';

      if (assignedFrontId) {
        const previousFrontName = frontNameById.get(assignedFrontId) ?? 'inny front';
        toast.success(`Przepięto "${selectedThreatName}" z frontu "${previousFrontName}"`);
      } else {
        toast.success(`Podpięto istniejące zagrożenie "${selectedThreatName}"`);
      }

      setShowThreatForm(false);
      setThreatComposerMode('create');
      setExistingThreatQuery('');
    } catch {
      toast.error('Nie udało się podpiąć istniejącego zagrożenia');
    } finally {
      setAssigningThreatId(null);
    }
  }

  function openAttachThreatPanel() {
    setThreatComposerMode('existing');
    setShowThreatForm(true);
    requestAnimationFrame(() => {
      document.getElementById('front-detail-zagrozenia')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <Link
        to={backPath}
        className="text-surface-500 hover:text-surface-800 flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>

      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="text-primary-700 mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(33,71,102,0.1)]">
              <Shield className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-primary-700 mb-3 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
                Front
              </div>
              <h1 className="text-primary-900 text-3xl font-semibold tracking-[-0.04em] lg:text-[2.2rem]">
                {front.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-surface-600 inline-flex rounded-full border border-[rgba(86,93,94,0.14)] bg-[rgba(223,225,218,0.72)] px-3 py-1 text-sm">
                  {FRONT_CATEGORY_LABELS[front.data.category]}
                </span>
                {threats !== undefined && (
                  <span className="text-surface-500 text-sm">
                    {threats.length === 0
                      ? 'Brak podpiętych zagrożeń'
                      : formatPolishThreatCount(threats.length)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditing((current) => !current)}
              className="app-button-secondary flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4" /> Anuluj
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4" /> Edytuj
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="app-button-danger flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Usuń
            </button>
          </div>
        </div>
      </section>

      {!isEditing && (
        <DetailTocBar ariaLabel="Sekcje karty frontu" items={frontTocItems} className="shrink-0" />
      )}

      {isEditing ? (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-primary-900 text-base font-semibold tracking-[-0.02em]">
                Edycja frontu
              </h2>
              <p className="text-surface-600 mt-1 text-sm leading-6">
                Uporządkuj cel, stawki i notatki bez wychodzenia z ekranu detalu.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="app-button-secondary text-surface-600 rounded-xl p-2 transition-colors"
              aria-label="Zamknij edycję frontu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <FrontForm
            defaultValues={{
              name: front.name,
              category: front.data.category,
              goal: front.data.goal ?? '',
              stakes: front.data.stakes,
              description: front.description,
              tags: front.tags,
            }}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <>
          <DetailSection sectionId="front-detail-kontekst" title="Kontekst frontu" tone="accent">
            <div className="flex flex-col gap-6">
              {front.data.goal && (
                <div className="rounded-[1.2rem] border border-[rgba(163,122,201,0.3)] bg-[rgba(163,122,201,0.12)] px-5 py-4">
                  <h2 className="text-primary-700 mb-2 text-xs font-semibold tracking-wide uppercase">
                    Cel frontu
                  </h2>
                  <p className="text-surface-800 text-sm whitespace-pre-wrap">{front.data.goal}</p>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="app-panel rounded-[1.3rem] p-4">
                  <NarrativeLinksSection
                    title="Powiązane frakcje"
                    items={relatedFactions}
                    emptyMessage="Ten front nie ma jeszcze podpiętych frakcji."
                    actionLabel="+ Dodaj frakcję"
                    onAction={() => setShowFactionPicker(true)}
                    onRemoveItem={(item) =>
                      setUnlinkConfirm({
                        relationId: item.relation.id,
                        title: 'Usunąć powiązaną frakcję?',
                        description: `Czy na pewno chcesz usunąć frakcję „${item.entity.name}" z tego widoku frontu?`,
                      })}
                    removeAriaLabel={(item) => `Usuń frakcję ${item.entity.name} z tego widoku`}
                  />
                </div>

                <div className="app-panel rounded-[1.3rem] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-surface-500 text-xs font-semibold tracking-wide uppercase">
                      Powiązane zagrożenia
                    </h2>
                    <button
                      type="button"
                      onClick={openAttachThreatPanel}
                      className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                    >
                      + Dodaj zagrożenie
                    </button>
                  </div>
                  {!threats || threats.length === 0 ? (
                    <p className="text-surface-500 text-sm">
                      Brak podpiętych zagrożeń.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {threats.slice(0, 3).map((threat) => {
                        const relationId = threatFrontRelationByThreatId.get(threat.id);
                        return (
                          <div
                            key={threat.id}
                            className="app-input-shell flex min-w-0 items-stretch overflow-hidden rounded-[1.2rem]"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/threats/${threat.id}`, {
                                  state: returnToSessionLive ? { returnToSessionLive } : undefined,
                                })
                              }
                              className="hover:border-primary-300 flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(229,231,223,0.98)]"
                            >
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-surface-800 truncate font-medium">{threat.name}</span>
                                <EntityTypeBadge type="threat" size="sm" />
                              </span>
                              <ChevronRight className="text-surface-300 ml-auto h-4 w-4 shrink-0" />
                            </button>
                            <div className="flex shrink-0 items-center self-stretch border-l border-[rgba(86,93,94,0.14)] bg-transparent px-2">
                              {relationId ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUnlinkConfirm({
                                      relationId,
                                      title: 'Usunąć powiązane zagrożenie?',
                                      description: `Czy na pewno chcesz usunąć zagrożenie „${threat.name}" z tego widoku frontu?`,
                                    })}
                                  className="text-surface-400 hover:text-danger-700 hover:bg-danger-50 rounded-full p-1 transition-colors"
                                  aria-label={`Usuń zagrożenie ${threat.name} z tego widoku`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {id && (
                <div className="app-panel rounded-[1.3rem] p-4">
                  <ClueSection
                    parentId={id}
                    title="Wskazówki frontu"
                    onRemoveRelation={(item) =>
                      setUnlinkConfirm({
                        relationId: item.relation.id,
                        title: 'Usunąć wskazówkę z widoku?',
                        description: `Czy na pewno chcesz usunąć wskazówkę „${item.clue.name}" z tego widoku frontu?`,
                      })}
                  />
                </div>
              )}
            </div>
          </DetailSection>

          {front.data.stakes.length > 0 && (
            <DetailSection
              sectionId="front-detail-stawki"
              title="Stawki"
            >
              <div className="app-panel rounded-[1.5rem] p-5 shadow-[0_12px_24px_rgba(18,45,66,0.06)] lg:p-6">
                <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-2">
                  {front.data.stakes.map((stake, index) => (
                    <li
                      key={index}
                      className="app-input-shell flex min-h-full min-w-0 gap-3 rounded-[1.25rem] border px-4 py-4 shadow-[0_12px_24px_rgba(18,45,66,0.04)]"
                    >
                      <span className="app-pill-muted inline-flex h-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                        {index + 1}
                      </span>
                      <p className="text-surface-800 min-w-0 flex-1 text-sm leading-6 break-words">{stake}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </DetailSection>
          )}

          {front.description && (
            <DetailSection
              sectionId="front-detail-opis"
              title="Opis"
            >
              <div className="app-panel min-w-0 w-full rounded-[1.5rem] p-5 lg:p-6">
                <div
                  className="prose prose-sm prose-headings:text-surface-800 prose-p:text-surface-800 prose-li:text-surface-800 prose-a:text-primary-700 min-w-0 w-full max-w-none text-pretty text-surface-800 [&_*]:max-w-none"
                  dangerouslySetInnerHTML={{ __html: front.description }}
                />
              </div>
            </DetailSection>
          )}

        </>
      )}

      <DetailSection
        sectionId="front-detail-zagrozenia"
        title="Zagrożenia frontu"
      >
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-surface-900 text-base font-semibold">Zagrożenia</h2>
              {threats && threats.length > 0 && (
                <span className="app-danger-pill rounded-full px-2.5 py-1 text-xs">
                  {threats.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setThreatComposerMode('create');
                setShowThreatForm(true);
              }}
              className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" /> Nowe zagrożenie
            </button>
          </div>

          {showThreatForm && (
            <div className="app-panel rounded-[1.5rem] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-primary-900 text-sm font-semibold">
                    {threatComposerMode === 'create'
                      ? 'Nowe zagrożenie'
                      : 'Podepnij istniejące zagrożenie'}
                  </h3>
                  <p className="text-surface-600 mt-1 text-sm leading-6">
                    {threatComposerMode === 'create'
                      ? 'Dodaj kolejną presję przypiętą do tego frontu.'
                      : 'Wybierz zagrożenie z kampanii i przypisz je do tego frontu.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowThreatForm(false)}
                  className="app-button-secondary text-surface-600 rounded-xl p-2 transition-colors"
                  aria-label="Zamknij formularz zagrożenia"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setThreatComposerMode('create')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] transition-all ${
                    threatComposerMode === 'create'
                      ? 'app-pill'
                      : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
                  }`}
                >
                  Nowe
                </button>
                <button
                  type="button"
                  onClick={() => setThreatComposerMode('existing')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] transition-all ${
                    threatComposerMode === 'existing'
                      ? 'app-pill'
                      : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
                  }`}
                >
                  Istniejące
                </button>
              </div>

              {threatComposerMode === 'create' ? (
                <ThreatForm
                  onSubmit={handleAddThreat}
                  isSaving={savingThreat}
                  onCancel={() => setShowThreatForm(false)}
                  submitLabel="Dodaj zagrożenie"
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="text-surface-500 pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
                    <input
                      type="search"
                      value={existingThreatQuery}
                      onChange={(event) => setExistingThreatQuery(event.target.value)}
                      placeholder="Szukaj zagrożeń po nazwie, typie, impulsie albo tagach..."
                      className="app-input text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-2xl py-3 pr-4 pl-11 text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>

                  {allThreats === undefined ? (
                    <LoadingSpinner />
                  ) : filteredExistingThreats.length === 0 ? (
                    <div className="app-input-shell rounded-[1.35rem] px-4 py-5 text-center">
                      <p className="text-surface-600 text-sm">
                        Nie znaleziono istniejących zagrożeń pasujących do wyszukiwania.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {filteredExistingThreats.map((threatEntity) => {
                        const assignedFrontId = threatFrontMap.get(threatEntity.id);
                        const assignedFrontName = assignedFrontId
                          ? (frontNameById.get(assignedFrontId) ?? 'Nieznany front')
                          : null;
                        const isAlreadyAttached = assignedFrontId === front.id;
                        const isCompleted = getThreatStatus(threatEntity) === 'completed';

                        return (
                          <article
                            key={threatEntity.id}
                            className="app-danger-card flex min-h-52 flex-col gap-3 rounded-[1.35rem] p-5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="text-surface-900 truncate text-[1.02rem] font-semibold tracking-[-0.02em]">
                                  {threatEntity.name}
                                </h4>
                                {threatEntity.data.impulse && (
                                  <p className="text-surface-700 mt-2 line-clamp-2 text-sm leading-6 italic">
                                    {threatEntity.data.impulse}
                                  </p>
                                )}
                              </div>
                              <span className="app-danger-pill shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
                                {getCatalogLabelByValue('threatType', threatEntity.data.threatType, campaignId)}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  isCompleted
                                    ? 'app-pill-muted'
                                    : 'text-success-600 border border-[rgba(95,155,125,0.22)] bg-[rgba(95,155,125,0.16)]'
                                }`}
                              >
                                {isCompleted ? 'Wygaszone' : 'Aktywne'}
                              </span>
                              <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
                                {assignedFrontName
                                  ? isAlreadyAttached
                                    ? 'Już w tym froncie'
                                    : `Obecnie: ${assignedFrontName}`
                                  : 'Bez przypisanego frontu'}
                              </span>
                              {threatEntity.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={`${threatEntity.id}:${tag}`}
                                  className="app-danger-pill rounded-full px-2.5 py-1 text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <div className="mt-auto flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/threats/${threatEntity.id}`, {
                                    state: returnToSessionLive
                                      ? { returnToSessionLive }
                                      : undefined,
                                  })
                                }
                                className="text-primary-700 text-sm font-medium hover:underline"
                              >
                                Otwórz detal
                              </button>
                              <button
                                type="button"
                                disabled={assigningThreatId !== null || isAlreadyAttached}
                                onClick={() => {
                                  void handleAssignExistingThreat(threatEntity.id);
                                }}
                                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                                  isAlreadyAttached ? 'app-button-secondary' : 'app-button-primary'
                                }`}
                              >
                                {assigningThreatId === threatEntity.id
                                  ? 'Przypinam...'
                                  : isAlreadyAttached
                                    ? 'Już przypięte'
                                    : assignedFrontId
                                      ? 'Przepnij do frontu'
                                      : 'Podepnij do frontu'}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {threats === undefined ? (
            <LoadingSpinner />
          ) : threats.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="text-surface-300 h-8 w-8" />}
              title="Brak zagrożeń"
              description="Dodaj pierwsze zagrożenie do tego frontu."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setThreatComposerMode('create');
                    setShowThreatForm(true);
                  }}
                  className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" /> Nowe zagrożenie
                </button>
              }
            />
          ) : (
            <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {threats.map((threat) => (
                <ThreatCard
                  key={threat.id}
                  threat={threat}
                  onClick={() =>
                    navigate(`/threats/${threat.id}`, {
                      state: returnToSessionLive ? { returnToSessionLive } : undefined,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </DetailSection>

      {!isEditing && threats && threats.length > 0 && (
        <DetailSection
          sectionId="front-detail-genealogia"
          title="Genealogia zagrożeń"
        >
          <ThreatGenealogySection threats={threats} returnToSessionLive={returnToSessionLive} />
        </DetailSection>
      )}

      {selectedThreatId && <ThreatDetailPanel threatId={selectedThreatId} onClose={closeThreat} />}

      {showRelPicker && (
        <RelationPicker
          sourceId={front.id}
          sourceType="front"
          onClose={() => setShowRelPicker(false)}
        />
      )}

      {showFactionPicker && (
        <RelationPicker
          sourceId={front.id}
          sourceType="front"
          initialTargetType="faction"
          initialRelationType="related_to"
          lockTargetType
          lockRelationType
          onClose={() => setShowFactionPicker(false)}
        />
      )}

      <DetailSection
        sectionId="front-detail-powiazania"
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
          entityId={front.id}
          excludeRelationTypes={['belongs_to', 'clues_for']}
          emptyMessage="Brak dodatkowych relacji świata dla tego frontu."
        />
      </DetailSection>

      <DetailSection
        sectionId="front-detail-notatki"
        title="Notatki MG"
      >
        <NotesList
          entityId={front.id}
          showTitle={false}
          emptyMessage="Brak notatek podpiętych do tego frontu."
        />
      </DetailSection>

      <DetailSection sectionId="front-detail-tagi" title="Tagi">
        {front.tags.length === 0 ? (
          <p className="text-surface-500 text-sm">Brak tagów — dodaj je w trybie edycji frontu.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {front.tags.map((tag) => (
              <span key={tag} className="app-pill rounded-full px-2.5 py-1 text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailScrollTopFab enabled={!isEditing && frontTocItems.length > 0} />

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń front"
        description={`Czy na pewno chcesz usunąć front "${front.name}"? Ta operacja jest nieodwracalna.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={unlinkConfirm !== null}
        title={unlinkConfirm?.title ?? 'Usunąć powiązanie?'}
        description={unlinkConfirm?.description ?? ''}
        onConfirm={() => void handleConfirmUnlink()}
        onCancel={() => setUnlinkConfirm(null)}
      />
    </div>
  );
}
