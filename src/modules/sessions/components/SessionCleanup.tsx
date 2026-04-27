import { useEffect, useMemo, useState } from 'react';
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
import {
  normalizeThreatLifecycle,
  SESSION_COMPLETED_DEFAULT_REASON,
  threatNeedsCleanupReason,
} from '@shared/utils/threatLifecycle';
import { THREAT_DEATH_REASON_PRESETS, inferThreatCompletionOutcomeFromClock } from '@modules/fronts/types';
import { isClock, type Clock } from '@modules/clocks/types';
import { useNotesBySession } from '@modules/notes/hooks/useNotesBySession';
import { type SessionData } from '../types';

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
    return threats.filter((t) => threatNeedsCleanupReason(t.data));
  }, [db, sessionId]) ?? [];
}

function useSessionLocationSurvivorExceptions(sessionId: string | undefined) {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    if (!sessionId) return [];
    const rels = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
    return entities.filter(
      (e): e is Entity =>
        !!e &&
        e.type === 'location' &&
        (e.data as { survivedParentDestruction?: boolean }).survivedParentDestruction === true,
    );
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
        className="rounded border border-surface-300 px-2 py-1 text-sm text-surface-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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
        className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-40"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Przypisz
      </button>
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        aria-label="Usuń"
        className="rounded-md border border-surface-200 p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500/40"
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
          aria-label={`Powiąż encję ${entity.name}`}
        >
          <Plus className="h-3 w-3" /> Powiąż
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label="Usuń"
          className="rounded-md border border-surface-200 p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500/40"
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
      const lifecycle = normalizeThreatLifecycle(values.status, values.completionReason);
      const threat = await addEntity(db, {
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
          forkThreatId: values.forkThreatId,
          ...lifecycle,
        },
      });
      if (values.clock) {
        const clock = await addEntity(db, {
          type: 'clock',
          name: values.clock.name,
          description: '',
          tags: [],
          data: {
            kind: 'threat',
            segments: values.clock.segments,
            filled: 0,
            tickLabels: [],
            isActive: lifecycle.status !== 'completed',
          },
        });
        await addRelation(db, { type: 'tracks', sourceId: threat.id, targetId: clock.id });
      }
      await addRelation(db, { type: 'affects', sourceId: thread.id, targetId: threat.id });
      toast.success(`Dodano zagrożenie na bazie wątku "${thread.name}"`);
      onClose();
    } catch {
      toast.error('Nie udało się utworzyć zagrożenia');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nowe zagrożenie z wątku" size="lg" onClose={onClose}>
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-surface-700">
        Powstałe zagrożenie zostanie od razu powiązane z wątkiem przez relację `affects`.
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
        submitLabel="Dodaj zagrożenie"
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
      toast.success(`"${thread.name}" usunięto`);
    } catch {
      toast.error('Nie udało się usunąć');
    }
  }

  function handleLeaveFree() {
    onLeaveFree(thread.id);
    toast.success(`"${thread.name}" pozostawiono jako wolny wątek`);
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
              Ten wątek jest w sesji, ale nie ma jeszcze rodzica ani powiązanego zagrożenia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Usuń"
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
            <Plus className="h-3 w-3" /> Powiąż z zagrożeniem
          </button>
          <button
            type="button"
            onClick={() => setShowCreateThreat(true)}
            className="flex items-center gap-1 rounded-md border border-amber-300 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-50"
          >
            <Plus className="h-3 w-3" /> Nowe zagrożenie
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
        title={`Usunąć "${thread.name}"?`}
        description="Encja i jej relacje zostaną permanentnie usunięte."
        confirmLabel="Usuń"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function ThreatCleanupRow({ threat }: { threat: Entity }) {
  const { db } = useCampaign();
  const initial =
    typeof threat.data.completionReason === 'string'
      ? threat.data.completionReason
      : (typeof threat.data.reasonOfDead === 'string' ? threat.data.reasonOfDead : '');
  const [reason, setReason] = useState<string>(initial);
  const [saving, setSaving] = useState(false);
  const [warnEmpty, setWarnEmpty] = useState(false);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const trimmed = reason.trim();
      // If the textarea is empty, first click: insert default in UI and show inline warning.
      if (trimmed.length === 0) {
        setReason(SESSION_COMPLETED_DEFAULT_REASON);
        setWarnEmpty(true);
        setSaving(false);
        return;
      }

      const trackRel = await db.relations
        .where('sourceId')
        .equals(threat.id)
        .filter((r) => r.type === 'tracks')
        .first();

      let linkedClock: Clock | null = null;
      if (trackRel) {
        const clockEntity = await getEntityById(db, trackRel.targetId);
        if (clockEntity && isClock(clockEntity)) linkedClock = clockEntity;
      }

      const completionOutcome = inferThreatCompletionOutcomeFromClock(linkedClock);

      // Otherwise persist the provided reason and ensure threat is marked completed
      await updateEntity(db, threat.id, {
        data: {
          ...threat.data,
          ...normalizeThreatLifecycle('completed', trimmed),
          completionOutcome,
        },
      });
      setWarnEmpty(false);
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
        {warnEmpty && (
          <div className="mb-2 rounded-md border border-amber-100 bg-amber-50 p-2 text-sm text-amber-700">
            Nie podano powodu zakończenia. Wstawiono domyślny powód. Kliknij „Zapisz powód”, aby potwierdzić.
          </div>
        )}

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
  const { db } = useCampaign();
  const { session } = useSessionById(id);
  const [confirmCompleteWithOpen, setConfirmCompleteWithOpen] = useState(false);
  const [acknowledgedFreeThreadIds, setAcknowledgedFreeThreadIds] = useState<Set<string>>(new Set());
  const [noteDecisions, setNoteDecisions] = useState<Record<string, 'keep' | 'archive' | 'delete'>>({});
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const npcsWithoutLocation = useSessionNpcsWithoutLocation(id);
  const locationsWithoutParent = useSessionLocationsWithoutParent(id);
  const danglingThreads = useSessionDanglingThreads(id);
  const visibleDanglingThreads = danglingThreads.filter((thread) => !acknowledgedFreeThreadIds.has(thread.id));
  const completedThreats = useSessionCompletedThreats(id);
  const survivorLocations = useSessionLocationSurvivorExceptions(id);
  const notes = useNotesBySession(id ?? '') ?? [];

  const cleanupDraftKey = useMemo(
    () => (id ? `session-cleanup-draft-${id}` : null),
    [id],
  );

  useEffect(() => {
    if (!cleanupDraftKey) return;
    try {
      const raw = sessionStorage.getItem(cleanupDraftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        acknowledgedFreeThreadIds?: unknown;
        noteDecisions?: unknown;
        savedAt?: unknown;
      };
      const ids = Array.isArray(parsed.acknowledgedFreeThreadIds)
        ? parsed.acknowledgedFreeThreadIds.filter((item): item is string => typeof item === 'string')
        : [];
      setAcknowledgedFreeThreadIds(new Set(ids));
      if (parsed.noteDecisions && typeof parsed.noteDecisions === 'object') {
        const entries = Object.entries(parsed.noteDecisions as Record<string, unknown>).filter(
          ([noteId, decision]) =>
            typeof noteId === 'string' &&
            (decision === 'keep' || decision === 'archive' || decision === 'delete'),
        ) as Array<[string, 'keep' | 'archive' | 'delete']>;
        setNoteDecisions(Object.fromEntries(entries));
      }
      if (typeof parsed.savedAt === 'string') setDraftSavedAt(parsed.savedAt);
    } catch {
      // ignore corrupted draft
    }
  }, [cleanupDraftKey]);

  useEffect(() => {
    if (!cleanupDraftKey) return;
    try {
      const savedAt = new Date().toISOString();
      sessionStorage.setItem(
        cleanupDraftKey,
        JSON.stringify({
          acknowledgedFreeThreadIds: [...acknowledgedFreeThreadIds],
          noteDecisions,
          savedAt,
        }),
      );
      setDraftSavedAt(savedAt);
    } catch {
      // ignore storage failures
    }
  }, [acknowledgedFreeThreadIds, cleanupDraftKey, noteDecisions]);

  useEffect(() => {
    if (!session) return;
    const status = (session.data as SessionData).status;
    if (status === 'cleanup_pending') return;
    // Po zakończeniu sprzątania sesja ma `cleanup_completed` — nie cofaj do `cleanup_pending`,
    // bo wtedy blokada startu kolejnej sesji live wraca na stałe.
    if (status === 'cleanup_completed') return;
    void updateEntity(db, session.id, {
      data: {
        ...(session.data as SessionData),
        status: 'cleanup_pending',
      },
    });
  }, [db, session]);

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
    visibleDanglingThreads.length === 0 &&
    completedThreats.length === 0;
  const openDecisionsCount =
    npcsWithoutLocation.length +
    locationsWithoutParent.length +
    visibleDanglingThreads.length +
    completedThreats.length +
    notes.filter((note) => !noteDecisions[note.id]).length;
  const totalDecisionScope =
    npcsWithoutLocation.length +
    locationsWithoutParent.length +
    danglingThreads.length +
    completedThreats.length +
    notes.length;
  const completedDecisionCount = Math.max(0, totalDecisionScope - openDecisionsCount);

  async function handleCompleteCleanup(options?: { allowIncomplete?: boolean }) {
    if (!session || !id) return;
    const allowIncomplete = options?.allowIncomplete === true;
    if (!allowIncomplete && openDecisionsCount > 0) {
      setConfirmCompleteWithOpen(true);
      return;
    }
    try {
      const noteErrors: string[] = [];
      for (const note of notes) {
        const decision = noteDecisions[note.id];
        if (!decision) continue;
        try {
          if (decision === 'delete') {
            await deleteEntity(db, note.id);
            continue;
          }
          await updateEntity(db, note.id, {
            data: {
              ...note.data,
              cleanupDecision: decision,
              cleanupDecidedAt: new Date().toISOString(),
            },
          });
        } catch {
          noteErrors.push(note.name || `Notatka ${note.id}`);
        }
      }
      const sessionRelations = await db.relations
        .where('targetId')
        .equals(session.id)
        .filter((relation) => relation.type === 'appears_in')
        .toArray();
      const sessionClockIds = sessionRelations.map((relation) => relation.sourceId);
      if (sessionClockIds.length > 0) {
        const clockEntities = await db.entities.where('id').anyOf(sessionClockIds).toArray();
        await Promise.all(
          clockEntities
            .filter((entity): entity is Clock => isClock(entity))
            .filter((entity) => (entity.data.kind ?? 'free') === 'session')
            .map((clock) =>
              updateEntity(db, clock.id, {
                data: {
                  ...clock.data,
                  isActive: false,
                  sessionClockEndMode: clock.data.filled >= clock.data.segments ? 'completed' : 'manual_stopped',
                  sessionClockEndedAt: new Date().toISOString(),
                },
              }),
            ),
        );
      }
      await updateEntity(db, session.id, {
        data: {
          ...(session.data as SessionData),
          status: 'cleanup_completed',
          reportAvailable: true,
          reportGeneratedAt: new Date().toISOString(),
        },
      });
      if (cleanupDraftKey) {
        try {
          sessionStorage.removeItem(cleanupDraftKey);
        } catch {
          // ignore
        }
      }
      if (openDecisionsCount > 0) {
        toast.warning(
          `Sprzątanie zakończone mimo ${openDecisionsCount} niedomkniętych decyzji. Nieruszone elementy pozostawiono bez zmian.`,
        );
      } else if (noteErrors.length > 0) {
        toast.warning(
          `Sprzątanie zakończone, ale ${noteErrors.length} notatek nie udało się zaktualizować. Pozostały bez zmian.`,
        );
      } else {
        toast.success('Sprzątanie zakończone. Raport i decyzje są zapisane.');
      }
      navigate(`/sessions/${id}`);
    } catch {
      toast.error('Nie udało się zakończyć sprzątania');
    }
  }

  function handleFinishLater() {
    if (!id) return;
    toast.info('Sprzątanie zapisane w szkicu. Możesz dokończyć później.');
    navigate(`/sessions/${id}`);
  }

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
          <p className="mt-1 text-xs text-surface-500">
            {draftSavedAt
              ? `Szkic sprzątania zapisany: ${new Date(draftSavedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
              : 'Szkic sprzątania zapisuje się automatycznie.'}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[rgba(33,71,102,0.14)] bg-[rgba(111,146,164,0.08)] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-primary-900">Postęp sprzątania</p>
          <span className="text-xs font-medium text-surface-700">
            {completedDecisionCount}/{totalDecisionScope} decyzji
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(33,71,102,0.12)]">
          <div
            className="h-full rounded-full bg-primary-600 transition-all"
            style={{
              width: totalDecisionScope === 0 ? '100%' : `${Math.round((completedDecisionCount / totalDecisionScope) * 100)}%`,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-surface-600">
          {openDecisionsCount === 0
            ? 'Wszystkie decyzje domknięte — możesz zakończyć sprzątanie.'
            : `Do domknięcia: ${openDecisionsCount}.`}
        </p>
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

      <section className="mb-8">
        <SectionHeader
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Notatki live — decyzje"
          count={notes.length}
          iconColor="text-amber-600"
        />
        {notes.length === 0 ? (
          <SectionAllClear message="Brak notatek live do decyzji." />
        ) : (
          <div className="space-y-2">
            <p className="mb-2 text-sm text-surface-500">
              Dla każdej notatki wybierz: zachowaj, archiwizuj lub usuń.
            </p>
            {notes.map((note) => {
              const decision = noteDecisions[note.id];
              return (
                <div key={note.id} className="rounded-lg border border-surface-200 bg-white p-3">
                  <p className="text-sm text-surface-800">{note.data.content}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setNoteDecisions((prev) => ({ ...prev, [note.id]: 'keep' }))
                      }
                      className={`rounded-md px-2.5 py-1 text-xs ${
                        decision === 'keep'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'border border-surface-300 text-surface-700'
                      }`}
                      aria-label={`Notatka: zachowaj`}
                    >
                      Zachowaj
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNoteDecisions((prev) => ({ ...prev, [note.id]: 'archive' }))
                      }
                      className={`rounded-md px-2.5 py-1 text-xs ${
                        decision === 'archive'
                          ? 'bg-amber-100 text-amber-800'
                          : 'border border-surface-300 text-surface-700'
                      }`}
                      aria-label={`Notatka: archiwizuj`}
                    >
                      Archiwizuj
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNoteDecisions((prev) => ({ ...prev, [note.id]: 'delete' }))
                      }
                      className={`rounded-md px-2.5 py-1 text-xs ${
                        decision === 'delete'
                          ? 'bg-danger-100 text-danger-800'
                          : 'border border-surface-300 text-surface-700'
                      }`}
                      aria-label={`Notatka: usuń`}
                    >
                      Usuń
                    </button>
                    {!decision && (
                      <span className="ml-1 text-xs text-danger-700">Wymagana decyzja</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8">
        <SectionHeader
          icon={<MapPin className="h-4 w-4" />}
          title="Wyjątki dziedziczenia lokacji"
          count={survivorLocations.length}
          iconColor="text-emerald-600"
        />
        {survivorLocations.length === 0 ? (
          <SectionAllClear message="Brak lokacji oznaczonych jako ocalałe." />
        ) : (
          <div className="space-y-2">
            <p className="mb-2 text-sm text-surface-500">
              Te lokacje zostały oznaczone jako ocalałe mimo zniszczenia lokacji nadrzędnej.
            </p>
            {survivorLocations.map((loc) => (
              <EntityCleanupRow key={loc.id} entity={loc} linkTo={`/locations/${loc.id}`} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 rounded-lg border border-surface-200 bg-surface-50 p-4">
        <button
          type="button"
          onClick={handleFinishLater}
          className="rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
        >
          Dokończ później
        </button>
        <button
          type="button"
          onClick={() => void handleCompleteCleanup()}
          className="flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
        >
          Zakończ sprzątanie
        </button>
      </div>
      <ConfirmDialog
        open={confirmCompleteWithOpen}
        title="Zakończyć mimo niedomkniętych rzeczy?"
        description={`Pozostało ${openDecisionsCount} niedomkniętych decyzji. Zakończenie teraz zostawi nieruszone elementy bez zmian.`}
        confirmLabel="Zakończ mimo to"
        cancelLabel="Wróć do sprzątania"
        destructive={false}
        onConfirm={() => {
          setConfirmCompleteWithOpen(false);
          void handleCompleteCleanup({ allowIncomplete: true });
        }}
        onCancel={() => setConfirmCompleteWithOpen(false)}
      />
    </div>
  );
}
