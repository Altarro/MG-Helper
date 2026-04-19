import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, MapPin, CheckCircle2, Users, GitBranch, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useSessionById } from '../hooks/useSessionById';
import { useLocations } from '@modules/locations/hooks/useLocations';
import { isNamedLocation } from '@modules/locations/types';
import { ThreatForm } from '@modules/fronts/components/ThreatForm';
import type { ThreatFormValues } from '@modules/fronts/components/ThreatForm';
import { addEntity, addRelation, deleteEntity, getEntityById, updateEntity } from '@shared/db/operations';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Modal } from '@shared/components/Modal';
import { RelationPicker } from '@shared/components/RelationPicker';
import { toast } from 'sonner';
import type { Entity } from '@shared/types/entity';
import { setNpcCurrentLocation } from '../utils/liveSessionCommands';
import { getThreatStatus } from '@shared/utils/entityData';
import { THREAT_DEATH_REASON_PRESETS } from '@modules/fronts/types';

// ── Data hooks ────────────────────────────────────────────────────────────────

function useSessionNpcsWithoutLocation(sessionId: string | undefined) {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    if (!sessionId) return [];
    const rels = await db.relations
      .where('targetId').equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
    const npcs = entities.filter((e): e is Entity => !!e && e.type === 'npc');
    const result: Entity[] = [];
    for (const npc of npcs) {
      const count = await db.relations.where('targetId').equals(npc.id).filter((r) => r.type === 'contains').count();
      if (count === 0) result.push(npc);
    }
    return result;
  }, [db, sessionId]) ?? [];
}

function useSessionLocationsWithoutParent(sessionId: string | undefined) {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    if (!sessionId) return [];
    const rels = await db.relations
      .where('targetId').equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
    const locations = entities.filter((e): e is Entity => !!e && isNamedLocation(e));
    const result: Entity[] = [];
    for (const loc of locations) {
      const parents = await db.relations.where('targetId').equals(loc.id).filter((r) => r.type === 'contains').toArray();
      const parentLocations = await Promise.all(parents.map((r) => getEntityById(db, r.sourceId)));
      const hasLocationParent = parentLocations.some((e) => e?.type === 'location');
      if (!hasLocationParent) result.push(loc);
    }
    return result;
  }, [db, sessionId]) ?? [];
}

function useSessionDanglingThreads(sessionId: string | undefined) {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    if (!sessionId) return [];
    const rels = await db.relations
      .where('targetId').equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
    const threads = entities.filter((e): e is Entity => !!e && e.type === 'thread');
    const result: Entity[] = [];
    for (const thread of threads) {
      const threadRels = await db.relations.where('sourceId').equals(thread.id).toArray();
      const hasParent = threadRels.some((r) => r.type === 'derives_from');
      const hasThreat = threadRels.some((r) => r.type === 'affects' || r.type === 'related_to');
      const receivedThreat = await db.relations.where('targetId').equals(thread.id).filter((r) => r.type === 'affects' || r.type === 'related_to').count();
      if (!hasParent && !hasThreat && receivedThreat === 0) result.push(thread);
    }
    return result;
  }, [db, sessionId]) ?? [];
}

function useSessionCompletedThreats(sessionId: string | undefined) {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    if (!sessionId) return [];
    const rels = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
    const threats = entities.filter((e): e is Entity => !!e && e.type === 'threat');
    return threats.filter((t) => {
      const isCompleted = getThreatStatus(t) === 'completed';
      if (!isCompleted) return false;
      const reason = typeof t.data.reasonOfDead === 'string' ? t.data.reasonOfDead.trim() : '';
      return reason.length === 0 || reason === 'Zakończone w sesji';
    });
  }, [db, sessionId]) ?? [];
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
  iconColor,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  iconColor: string;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 border-b border-surface-200 pb-2 text-base font-semibold text-surface-800">
      <span className={iconColor}>{icon}</span>
      {title}
      {count > 0 && (
        <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          {count}
        </span>
      )}
    </h2>
  );
}

function SectionAllClear({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

// ── NPC row ────────────────────────────────────────────────────────────────────

function NpcCleanupRow({ npc, sessionId }: { npc: Entity; sessionId: string }) {
  const { db } = useCampaign();
  const locations = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleAssign() {
    if (!selectedLocationId) return;
    setSaving(true);
    try {
      await setNpcCurrentLocation(db, npc.id, selectedLocationId, sessionId);
      toast.success(`Przypisano lokację dla ${npc.name}`);
    } catch {
      toast.error('Błąd podczas przypisywania lokacji');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, npc.id);
      toast.success(`${npc.name} usunięty`);
    } catch {
      toast.error('Nie udało się usunąć');
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white p-3">
      <div className="flex-1 min-w-0">
        <Link to={`/npcs/${npc.id}`} className="font-medium text-surface-900 hover:text-primary-600 hover:underline truncate block">
          {npc.name}
        </Link>
      </div>
      <select
        value={selectedLocationId}
        onChange={(e) => setSelectedLocationId(e.target.value)}
        className="rounded border border-surface-300 px-2 py-1 text-sm text-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">— wybierz lokację —</option>
        {(locations ?? []).map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void handleAssign()}
        disabled={!selectedLocationId || saving}
        className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700 disabled:opacity-40"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Przypisz
      </button>
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        aria-label="Usuń"
        className="rounded-md border border-surface-200 p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <ConfirmDialog
        open={confirmDelete}
        title={`Usunąć ${npc.name}?`}
        description="Postać i jej relacje zostaną permanentnie usunięte."
        confirmLabel="Usuń"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// ── Generic entity row (location / thread) ─────────────────────────────────────

function EntityCleanupRow({
  entity,
  linkTo,
}: {
  entity: Entity;
  linkTo: string;
}) {
  const { db } = useCampaign();
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    try {
      await deleteEntity(db, entity.id);
      toast.success(`„${entity.name}" usunięto`);
    } catch {
      toast.error('Nie udało się usunąć');
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white p-3">
        <div className="flex-1 min-w-0">
          <Link to={linkTo} className="font-medium text-surface-900 hover:text-primary-600 hover:underline truncate block">
            {entity.name}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setShowRelationPicker(true)}
          className="flex items-center gap-1 rounded-md border border-surface-300 px-2.5 py-1 text-xs text-surface-600 hover:bg-surface-50"
        >
          <Plus className="h-3 w-3" /> Powiąż
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label="Usuń"
          className="rounded-md border border-surface-200 p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {showRelationPicker && (
        <RelationPicker
          sourceId={entity.id}
          sourceType={entity.type}
          onClose={() => setShowRelationPicker(false)}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title={`Usunąć „${entity.name}"?`}
        description="Encja i jej relacje zostaną permanentnie usunięte."
        confirmLabel="Usuń"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

// ── SessionCleanup ─────────────────────────────────────────────────────────────

function CreateThreatFromThreadModal({
  thread,
  onClose,
}: {
  thread: Entity;
  onClose: () => void;
}) {
  const { db } = useCampaign();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(values: ThreatFormValues) {
    setSaving(true);
    try {
      const threat = await addEntity(db, {
        type: 'threat',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          threatType: values.threatType,
          status: values.status,
          impulse: values.impulse,
          moves: values.moves,
          trigger: values.trigger,
          reasonOfDead: values.reasonOfDead,
          forkThreatId: values.forkThreatId,
        },
      });
      if (values.clock) {
        const clock = await addEntity(db, {
          type: 'clock',
          name: values.clock.name,
          description: '',
          tags: [],
          data: { segments: values.clock.segments, filled: 0, tickLabels: [], isActive: true },
        });
        await addRelation(db, { type: 'tracks', sourceId: threat.id, targetId: clock.id });
      }
      await addRelation(db, { type: 'affects', sourceId: thread.id, targetId: threat.id });
      toast.success(`Dodano zagrozenie na bazie watku "${thread.name}"`);
      onClose();
    } catch {
      toast.error('Nie udalo sie utworzyc zagrozenia');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nowe zagrozenie z watku" size="lg" onClose={onClose}>
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-surface-700">
        Powstale zagrozenie zostanie od razu powiazane z watkiem przez relacje `affects`.
      </div>
      <ThreatForm
        defaultValues={{
          name: thread.name,
          description: thread.description,
          tags: thread.tags,
        }}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSaving={saving}
        submitLabel="Dodaj zagrozenie"
      />
    </Modal>
  );
}

function ThreadCleanupRow({
  thread,
  onLeaveFree,
}: {
  thread: Entity;
  onLeaveFree: (threadId: string) => void;
}) {
  const { db } = useCampaign();
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const [showCreateThreat, setShowCreateThreat] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    try {
      await deleteEntity(db, thread.id);
      toast.success(`"${thread.name}" usunieto`);
    } catch {
      toast.error('Nie udalo sie usunac');
    }
  }

  function handleLeaveFree() {
    onLeaveFree(thread.id);
    toast.success(`"${thread.name}" pozostawiono jako wolny watek`);
  }

  return (
    <>
      <div className="rounded-lg border border-surface-200 bg-white p-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link to={`/threads/${thread.id}`} className="block truncate font-medium text-surface-900 hover:text-primary-600 hover:underline">
              {thread.name}
            </Link>
            <p className="mt-1 text-xs text-surface-500">
              Ten watek jest w sesji, ale nie ma jeszcze rodzica ani powiazanego zagrozenia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Usun"
            className="rounded-md border border-surface-200 p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowRelationPicker(true)}
            className="flex items-center gap-1 rounded-md border border-surface-300 px-2.5 py-1 text-xs text-surface-700 hover:bg-surface-50"
          >
            <Plus className="h-3 w-3" /> Powiaz z zagrozeniem
          </button>
          <button
            type="button"
            onClick={() => setShowCreateThreat(true)}
            className="flex items-center gap-1 rounded-md border border-amber-300 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-50"
          >
            <Plus className="h-3 w-3" /> Nowe zagrozenie
          </button>
          <button
            type="button"
            onClick={handleLeaveFree}
            className="rounded-md border border-surface-300 px-2.5 py-1 text-xs text-surface-600 hover:bg-surface-50"
          >
            Zostaw wolny
          </button>
        </div>
      </div>

      {showRelationPicker && (
        <RelationPicker
          sourceId={thread.id}
          sourceType="thread"
          initialTargetType="threat"
          initialRelationType="affects"
          lockTargetType
          lockRelationType
          onClose={() => setShowRelationPicker(false)}
        />
      )}
      {showCreateThreat && (
        <CreateThreatFromThreadModal thread={thread} onClose={() => setShowCreateThreat(false)} />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title={`Usunac "${thread.name}"?`}
        description="Encja i jej relacje zostana permanentnie usuniete."
        confirmLabel="Usun"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function ThreatCleanupRow({ threat }: { threat: Entity }) {
  const { db } = useCampaign();
  const [reason, setReason] = useState<string>(threat.data.reasonOfDead ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const nextReason = reason.trim() || 'Zakończone w sesji';
      await updateEntity(db, threat.id, {
        data: {
          ...threat.data,
          reasonOfDead: nextReason,
        },
      });
      toast.success('Powód zakończenia zapisany');
    } catch {
      toast.error('Nie udało się zapisać powodu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-surface-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link to={`/threats/${threat.id}`} className="block truncate font-medium text-surface-900 hover:text-primary-600 hover:underline">
            {threat.name}
          </Link>
          <p className="mt-1 text-xs text-surface-500">Uzupełnij powód zakończenia, jeśli chcesz zapisać kontekst.</p>
        </div>
      </div>

      <div className="mt-3">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-surface-300 px-3 py-2 text-sm"
          placeholder="Powód zakończenia..."
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {THREAT_DEATH_REASON_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className="rounded-full border border-surface-300 px-3 py-1 text-xs text-surface-600 hover:bg-surface-50"
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setReason('')}
            className="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-50"
          >
            Wyczyść
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Zapisz powód
          </button>
        </div>
      </div>
    </div>
  );
}

export function SessionCleanup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useSessionById(id);
  const [acknowledgedFreeThreadIds, setAcknowledgedFreeThreadIds] = useState<Set<string>>(new Set());
  const npcsWithoutLocation = useSessionNpcsWithoutLocation(id);
  const locationsWithoutParent = useSessionLocationsWithoutParent(id);
  const danglingThreads = useSessionDanglingThreads(id);
  const visibleDanglingThreads = danglingThreads.filter((thread) => !acknowledgedFreeThreadIds.has(thread.id));
  const completedThreats = useSessionCompletedThreats(id);

  if (session === undefined) return <LoadingSpinner />;

  if (!session) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Sesja nie znaleziona.</p>
        <Link to="/sessions" className="text-primary-600 hover:underline">← Powrót do sesji</Link>
      </div>
    );
  }

  const title = session.name || `Sesja ${session.data.number}`;
  const allClear =
    npcsWithoutLocation.length === 0 &&
    locationsWithoutParent.length === 0 &&
    visibleDanglingThreads.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link to={`/sessions/${id}`} className="flex items-center gap-1 text-sm text-surface-400 hover:text-surface-700">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900">{title} — Sprzątanie</h1>
          <p className="text-sm text-surface-500">Uzupełnij brakujące informacje po sesji</p>
        </div>
      </div>

      {/* EmptyState */}
      {allClear && (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-xl border border-green-200 bg-green-50 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="text-lg font-semibold text-green-800">Sesja uporządkowana!</p>
          <p className="text-sm text-green-600">Wszystkie powiązania są kompletne.</p>
        </div>
      )}

      {/* Section: Postacie bez lokacji */}
      <section className="mb-8">
        <SectionHeader
          icon={<Users className="h-4 w-4" />}
          title="Postacie bez lokacji"
          count={npcsWithoutLocation.length}
          iconColor="text-amber-500"
        />
        {npcsWithoutLocation.length === 0 ? (
          <SectionAllClear message="Wszystkie postacie mają przypisaną lokację." />
        ) : (
          <div className="space-y-2">
            <p className="mb-2 text-sm text-surface-500">Gdzie były pod koniec sesji?</p>
            {npcsWithoutLocation.map((npc) => (
              <NpcCleanupRow key={npc.id} npc={npc} sessionId={session.id} />
            ))}
          </div>
        )}
      </section>

      {/* Section: Lokacje bez rodzica */}
      <section className="mb-8">
        <SectionHeader
          icon={<MapPin className="h-4 w-4" />}
          title="Lokacje bez rodzica"
          count={locationsWithoutParent.length}
          iconColor="text-blue-500"
        />
        {locationsWithoutParent.length === 0 ? (
          <SectionAllClear message="Wszystkie lokacje mają przypisaną lokację nadrzędną." />
        ) : (
          <div className="space-y-2">
            <p className="mb-2 text-sm text-surface-500">Te lokacje z sesji nie mają lokacji nadrzędnej.</p>
            {locationsWithoutParent.map((loc) => (
              <EntityCleanupRow key={loc.id} entity={loc} linkTo={`/locations/${loc.id}`} />
            ))}
          </div>
        )}
      </section>

      {/* Section: Wątki wiszące */}
      <section className="mb-8">
        <SectionHeader
          icon={<GitBranch className="h-4 w-4" />}
          title="Wątki wiszące"
          count={visibleDanglingThreads.length}
          iconColor="text-purple-500"
        />
        {visibleDanglingThreads.length === 0 ? (
          <SectionAllClear message="Wszystkie wątki są powiązane." />
        ) : (
          <div className="space-y-2">
            <p className="mb-2 text-sm text-surface-500">Te wątki z sesji nie mają rodzica ani powiązanego zagrożenia.</p>
            {visibleDanglingThreads.map((thread) => (
              <ThreadCleanupRow
                key={thread.id}
                thread={thread}
                onLeaveFree={(threadId) => {
                  setAcknowledgedFreeThreadIds((prev) => new Set([...prev, threadId]));
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section: Zagrożenia (do uzupełnienia powodu) */}
      <section className="mb-8">
        <SectionHeader
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Zagrożenia"
          count={completedThreats.length}
          iconColor="text-amber-500"
        />
        {completedThreats.length === 0 ? (
          <SectionAllClear message="Brak zakończonych zagrożeń wymagających powodu." />
        ) : (
          <div className="space-y-2">
            <p className="mb-2 text-sm text-surface-500">Uzupełnij powody zakończenia zagrożeń oznaczonych podczas sesji.</p>
            {completedThreats.map((threat) => (
              <ThreatCleanupRow key={threat.id} threat={threat} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 rounded-lg border border-surface-200 bg-surface-50 p-4">
        <button
          type="button"
          onClick={() => void navigate(`/sessions/${id}`)}
          className="flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Zakończ sprzątanie
        </button>
      </div>
    </div>
  );
}
