import { useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  X,
  Plus,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useFrontById } from '../hooks/useFrontById';
import { useThreats } from '../hooks/useThreats';
import { useThreatById } from '../hooks/useThreatById';
import { FrontForm } from './FrontForm';
import { ThreatForm } from './ThreatForm';
import { ThreatCard } from './ThreatCard';
import { ClockWidget } from '@modules/clocks/components/ClockWidget';
import { TickProgress } from '@shared/components/TickProgress';
import { ClueSection } from '@shared/components/ClueSection';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { NarrativeLinksSection } from '@shared/components/NarrativeLinksSection';
import { RelationList } from '@shared/components/RelationList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { DetailSection } from '@shared/components/DetailSection';
import { NotesList } from '@modules/notes/components/NotesList';
import {
  addEntity,
  addRelation,
  deleteEntity,
  updateEntity,
} from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelatedEntities } from '@shared/hooks/useRelatedEntities';
import { useThreatDetailPath } from '@shared/hooks/useThreatDetailPath';
import { isClock } from '@modules/clocks/types';
import { toast } from 'sonner';
import { FRONT_CATEGORY_LABELS, THREAT_TYPE_LABELS } from '../types';
import { getThreatStatus } from '@shared/utils/entityData';
import type { FrontFormValues } from './FrontForm';
import type { ThreatFormValues } from './ThreatForm';

// ─── Threat detail side panel ─────────────────────────────────────────────────

interface ThreatDetailPanelProps {
  threatId: string;
  onClose: () => void;
}

function ThreatDetailPanel({ threatId, onClose }: ThreatDetailPanelProps) {
  const { db } = useCampaign();
  const { threat } = useThreatById(threatId);
  const { threat: forkSourceThreat } = useThreatById(threat?.data.forkThreatId);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showThreadPicker, setShowThreadPicker] = useState(false);
  const forkSourcePath = useThreatDetailPath(forkSourceThreat?.id);

  // Load clock linked via 'tracks' relation
  const linkedClock = useLiveQuery(async () => {
    const rels = await db.relations
      .where('sourceId').equals(threatId)
      .filter((r) => r.type === 'tracks')
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
    if (!threat) return;
    setSaving(true);
    try {
      await updateEntity(db, threatId, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          ...threat.data,
          threatType: values.threatType,
          impulse: values.impulse,
          moves: values.moves,
          trigger: values.trigger,
          status: values.status,
          reasonOfDead: values.reasonOfDead,
          forkThreatId: values.forkThreatId,
        },
      });
      // Create a linked clock if one was added and doesn't exist yet
      if (values.clock && !linkedClock) {
        const clockEntity = await addEntity(db, {
          type: 'clock',
          name: values.clock.name,
          description: '',
          tags: [],
          data: { segments: values.clock.segments, filled: 0, tickLabels: [], isActive: true },
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

  async function handleDelete() {
    if (!threat) return;
    const name = threat.name;
    try {
      // Cascade: delete linked clock if any
      if (linkedClock) {
        await deleteEntity(db, linkedClock.id);
      }
      await deleteEntity(db, threatId);
      toast.success(`Zagrożenie „${name}" usunięte`);
      onClose();
    } catch {
      toast.error('Nie udało się usunąć zagrożenia');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30">
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl"
        role="dialog"
        aria-label={`Zagrożenie: ${threat.name}`}
      >
        <div className="flex items-center justify-between border-b border-surface-200 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-surface-900">{threat.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-surface-100">
            <X className="h-5 w-5 text-surface-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isEditing ? (
            <ThreatForm
              defaultValues={{
                name: threat.name,
                threatType: threat.data.threatType,
                status: getThreatStatus(threat),
                impulse: threat.data.impulse,
                trigger: threat.data.trigger ?? '',
                reasonOfDead: threat.data.reasonOfDead ?? '',
                forkThreatId: threat.data.forkThreatId,
                moves: threat.data.moves,
                description: threat.description,
                tags: threat.tags,
                clock: linkedClock
                  ? { name: linkedClock.name, segments: linkedClock.data.segments }
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
                  onClick={() => setIsEditing(true)}
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

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">
                  Rodzaj
                </h3>
                <p className="text-sm text-surface-700">
                  {THREAT_TYPE_LABELS[threat.data.threatType]}
                </p>
              </div>

              {threat.data.impulse && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">
                    Impuls
                  </h3>
                  <p className="italic text-surface-700">{threat.data.impulse}</p>
                </div>
              )}

              {threat.data.trigger && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">
                    Trigger tykania
                  </h3>
                  <p className="text-sm whitespace-pre-wrap text-surface-700">{threat.data.trigger}</p>
                </div>
              )}

              {forkSourceThreat && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">
                    Powstalo z zagrozenia
                  </h3>
                  {forkSourcePath ? (
                    <Link to={forkSourcePath} className="text-sm font-medium text-primary-600 hover:underline">
                      {forkSourceThreat.name}
                    </Link>
                  ) : (
                    <p className="text-sm text-surface-700">{forkSourceThreat.name}</p>
                  )}
                </div>
              )}

              {threat.data.reasonOfDead && (
                <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">
                    Powod wygaszenia / smierci
                  </h3>
                  <p className="text-sm whitespace-pre-wrap text-surface-700">{threat.data.reasonOfDead}</p>
                </div>
              )}

              <NarrativeLinksSection
                title="Front nadrzedny"
                items={parentFront}
                emptyMessage="To zagrozenie nie jest jeszcze podpiete do zadnego frontu."
              />

              <NarrativeLinksSection
                title="Powiazane watki"
                items={relatedThreads}
                emptyMessage="To zagrozenie nie ma jeszcze podpietych watkow przez relacje affects."
                actionLabel="+ Dodaj watek"
                onAction={() => setShowThreadPicker(true)}
              />

              {threat.data.moves.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
                    Ruchy zagrożenia
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {threat.data.moves.map((move, i) => (
                      <li key={i} className="text-sm text-surface-700">
                        {move}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {threat.description && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">
                    Opis
                  </h3>
                  <div
                    className="prose prose-sm max-w-none text-surface-700"
                    dangerouslySetInnerHTML={{ __html: threat.description }}
                  />
                </div>
              )}

              {threat.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {threat.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Linked clock */}
              {linkedClock && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
                    Powiązany zegar
                  </h3>
                  <Link
                    to={`/clocks/${linkedClock.id}`}
                    className="flex items-center gap-3 rounded-lg border border-transparent p-2 -m-2 transition-colors hover:border-primary-200 hover:bg-primary-50"
                  >
                    <ClockWidget clock={linkedClock} size={48} showLabel />
                    <span className="text-sm text-surface-700">{linkedClock.name}</span>
                  </Link>
                  {linkedClock.data.tickLabels && linkedClock.data.tickLabels.length > 0 && (
                    <div className="mt-2">
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-400">
                        Opisy tyknięć
                      </h4>
                      <ul className="space-y-1">
                        {linkedClock.data.tickLabels.map((label, i) => (
                          <li key={i} className={`text-xs ${i === Math.max(0, linkedClock.data.filled - 1) ? 'font-semibold text-surface-800' : i === linkedClock.data.filled ? 'italic text-surface-500' : 'text-surface-400'}`}>
                            <span className="mr-1.5 text-surface-300">{i + 1}.</span>
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
              {/* Clues section */}
              <ClueSection parentId={threatId} title="Wskazówki" />
            </div>
          )}
        </div>

        <ConfirmDialog
          open={confirmDelete}
          title="Usuń zagrożenie"
          description={`Czy na pewno chcesz usunąć zagrożenie „${threat.name}"? Tej operacji nie można cofnąć.`}
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

// ─── FrontDetail ─────────────────────────────────────────────────────────────

export function FrontDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { db } = useCampaign();
  const { front } = useFrontById(id);
  const threats = useThreats(id);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showThreatForm, setShowThreatForm] = useState(false);
  const [savingThreat, setSavingThreat] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const selectedThreatId = searchParams.get('threat');
  const returnToSessionLive = typeof location.state === 'object'
    && location.state !== null
    && 'returnToSessionLive' in location.state
    && typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/fronts';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Fronty';

  function closeThreat() {
    const next = new URLSearchParams(searchParams);
    next.delete('threat');
    setSearchParams(next);
  }

  if (front === undefined) return <LoadingSpinner />;

  if (!front) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Front nie znaleziony.</p>
        <Link to="/fronts" className="text-primary-600 hover:underline">
          ← Powrót do frontów
        </Link>
      </div>
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
    try {      // Cascade: delete all child threats first
      if (threats && threats.length > 0) {
        await Promise.all(threats.map((t) => deleteEntity(db, t.id)));
      }      await deleteEntity(db, front!.id);
      toast.success(`Front „${front!.name}" usunięty`);
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć frontu');
    }
  }

  async function handleAddThreat(values: ThreatFormValues) {
    setSavingThreat(true);
    try {
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
          status: values.status,
          reasonOfDead: values.reasonOfDead,
          forkThreatId: values.forkThreatId,
        },
      });
      await addRelation(db, { type: 'belongs_to', sourceId: entity.id, targetId: front!.id });

      // Optionally create a linked clock
      if (values.clock) {
        const clockEntity = await addEntity(db, {
          type: 'clock',
          name: values.clock.name,
          description: '',
          tags: [],
          data: { segments: values.clock.segments, filled: 0, tickLabels: [], isActive: true },
        });
        await addRelation(db, { type: 'tracks', sourceId: entity.id, targetId: clockEntity.id });
      }

      toast.success(`Zagrożenie „${values.name}" dodane`);
      setShowThreatForm(false);
    } catch {
      toast.error('Nie udało się dodać zagrożenia');
    } finally {
      setSavingThreat(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back */}
      <Link
        to={backPath}
        className="flex w-fit items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800"
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 shrink-0 text-primary-500" />
          <div>
            <h1 className="text-xl font-semibold text-surface-900">{front.name}</h1>
            <span className="text-sm text-surface-500">
              {FRONT_CATEGORY_LABELS[front.data.category]}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50"
          >
            {isEditing ? (
              <><X className="h-3.5 w-3.5" /> Anuluj</>
            ) : (
              <><Edit2 className="h-3.5 w-3.5" /> Edytuj</>
            )}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {/* Edit form */}
      {isEditing && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
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
      )}

      {/* Goal */}
      {!isEditing && front.data.goal && (
        <DetailSection
          title="Kontekst frontu"
          description="Glowna os kampanii i najwazniejszy cel, wokol ktorego porzadkujesz zagrozenia."
          tone="accent"
        >
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-600">Cel frontu</h2>
          <p className="text-sm text-surface-800 whitespace-pre-wrap">{front.data.goal}</p>
        </DetailSection>
      )}

      {/* Stakes */}
      {!isEditing && front.data.stakes.length > 0 && (
        <DetailSection
          title="Stawki"
          description="Pytania i ryzyka, ktore ten front stawia przed kampania."
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
            Stawki
          </h2>
          <ul className="list-disc list-inside space-y-1.5">
            {front.data.stakes.map((stake, i) => (
              <li key={i} className="text-sm text-surface-700">
                {stake}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {/* Description */}
      {!isEditing && front.description && (
        <DetailSection
          title="Opis"
          description="Pelny opis frontu i jego roli w strukturze kampanii."
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
            Opis
          </h2>
          <div
            className="prose prose-sm max-w-none text-surface-700"
            dangerouslySetInnerHTML={{ __html: front.description }}
          />
        </DetailSection>
      )}

      {/* Tags */}
      {!isEditing && front.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {front.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Clues section */}
      {!isEditing && id && (
        <DetailSection
          title="Wskazowki frontu"
          description="Tropy i sekrety, ktore prowadza bezposrednio do glownej osi kampanii."
        >
          <ClueSection parentId={id} title="Wskazówki frontu" />
        </DetailSection>
      )}

      {/* Threats section */}
      <DetailSection
        title="Zagrozenia frontu"
        description="Glowne presje podpiete do tej osi kampanii."
      >
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-surface-900">
            Zagrożenia
            {threats && threats.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-700">
                {threats.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowThreatForm(true)}
            className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" /> Nowe zagrożenie
          </button>
        </div>

        {showThreatForm && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="mb-4 text-sm font-semibold text-surface-900">Nowe zagrożenie</h3>
            <ThreatForm
              onSubmit={handleAddThreat}
              isSaving={savingThreat}
              onCancel={() => setShowThreatForm(false)}
              submitLabel="Dodaj zagrożenie"
            />
          </div>
        )}

        {threats === undefined ? (
          <LoadingSpinner />
        ) : threats.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8 text-surface-300" />}
            title="Brak zagrożeń"
            description="Dodaj pierwsze zagrożenie do tego frontu."
            action={
              <button
                onClick={() => setShowThreatForm(true)}
                className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                <Plus className="h-4 w-4" /> Nowe zagrożenie
              </button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {threats.map((threat) => (
              <ThreatCard
                key={threat.id}
                threat={threat}
                onClick={() => navigate(`/threats/${threat.id}`, {
                  state: returnToSessionLive ? { returnToSessionLive } : undefined,
                })}
              />
            ))}
          </div>
        )}
      </div>
      </DetailSection>

      {/* Threat side panel */}
      {selectedThreatId && (
        <ThreatDetailPanel
          threatId={selectedThreatId}
          onClose={closeThreat}
        />
      )}

      {showRelPicker && (
        <RelationPicker
          sourceId={front.id}
          sourceType="front"
          onClose={() => setShowRelPicker(false)}
        />
      )}

      <DetailSection
        title="Powiazania swiata"
        description="Relacje dodatkowe poza glowna osia fabularna i przypietymi zagrozeniami."
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
          entityId={front.id}
          excludeRelationTypes={['belongs_to', 'clues_for']}
          emptyMessage="Brak dodatkowych relacji swiata dla tego frontu."
        />
      </DetailSection>

      <DetailSection
        title="Notatki MG"
        description="Zaplecze robocze dla prowadzacego, oddzielone od glownej osi i jej tropow."
      >
        <NotesList
          entityId={front.id}
          showTitle={false}
          emptyMessage="Brak notatek podpietych do tego frontu."
        />
      </DetailSection>

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń front"
        description={`Czy na pewno chcesz usunąć front „${front.name}"? Ta operacja jest nieodwracalna.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
