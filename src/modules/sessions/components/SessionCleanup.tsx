import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  CheckCircle2,
  Users,
  GitBranch,
  Trash2,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useSessionById } from '../hooks/useSessionById';
import { useLocations } from '@modules/locations/hooks/useLocations';
import { isNamedLocation } from '@modules/locations/types';
import { ThreatForm } from '@modules/fronts/components/ThreatForm';
import type { ThreatFormValues } from '@modules/fronts/components/ThreatForm';
import {
  addEntity,
  addRelation,
  deleteEntity,
  getEntityById,
  updateEntity,
} from '@shared/db/operations';
import { markClockLinkedToThreat } from '@modules/clocks/threatClockLink';
import { DetailNotFound } from '@shared/components/DetailNotFound';
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
import {
  THREAT_DEATH_REASON_PRESETS,
  inferThreatCompletionOutcomeFromClock,
} from '@modules/fronts/types';
import { isClock, type Clock } from '@modules/clocks/types';
import { useNotesBySession } from '@modules/notes/hooks/useNotesBySession';
import { type SessionData } from '../types';

// ── Data hooks ────────────────────────────────────────────────────────────────

function useSessionNpcsWithoutLocation(sessionId: string | undefined) {
  const { db } = useCampaign();
  return (
    useLiveQuery(async () => {
      if (!sessionId) return [];
      const rels = await db.relations
        .where('targetId')
        .equals(sessionId)
        .filter((r) => r.type === 'appears_in')
        .toArray();
      const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
      const npcs = entities.filter((e): e is Entity => !!e && e.type === 'npc');
      const result: Entity[] = [];
      for (const npc of npcs) {
        const count = await db.relations
          .where('targetId')
          .equals(npc.id)
          .filter((r) => r.type === 'contains')
          .count();
        if (count === 0) result.push(npc);
      }
      return result;
    }, [db, sessionId]) ?? []
  );
}

function useSessionLocationsWithoutParent(sessionId: string | undefined) {
  const { db } = useCampaign();
  return (
    useLiveQuery(async () => {
      if (!sessionId) return [];
      const rels = await db.relations
        .where('targetId')
        .equals(sessionId)
        .filter((r) => r.type === 'appears_in')
        .toArray();
      const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
      const locations = entities.filter((e): e is Entity => !!e && isNamedLocation(e));
      const result: Entity[] = [];
      for (const loc of locations) {
        const parents = await db.relations
          .where('targetId')
          .equals(loc.id)
          .filter((r) => r.type === 'contains')
          .toArray();
        const parentLocations = await Promise.all(
          parents.map((r) => getEntityById(db, r.sourceId)),
        );
        const hasLocationParent = parentLocations.some((e) => e?.type === 'location');
        if (!hasLocationParent) result.push(loc);
      }
      return result;
    }, [db, sessionId]) ?? []
  );
}

function useSessionDanglingThreads(sessionId: string | undefined) {
  const { db } = useCampaign();
  return (
    useLiveQuery(async () => {
      if (!sessionId) return [];
      const rels = await db.relations
        .where('targetId')
        .equals(sessionId)
        .filter((r) => r.type === 'appears_in')
        .toArray();
      const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
      const threads = entities.filter((e): e is Entity => !!e && e.type === 'thread');
      const result: Entity[] = [];
      for (const thread of threads) {
        const threadRels = await db.relations.where('sourceId').equals(thread.id).toArray();
        const hasParent = threadRels.some((r) => r.type === 'derives_from');
        const hasThreat = threadRels.some((r) => r.type === 'affects' || r.type === 'related_to');
        const receivedThreat = await db.relations
          .where('targetId')
          .equals(thread.id)
          .filter((r) => r.type === 'affects' || r.type === 'related_to')
          .count();
        if (!hasParent && !hasThreat && receivedThreat === 0) result.push(thread);
      }
      return result;
    }, [db, sessionId]) ?? []
  );
}

function useSessionCompletedThreats(sessionId: string | undefined) {
  const { db } = useCampaign();
  return (
    useLiveQuery(async () => {
      if (!sessionId) return [];
      const rels = await db.relations
        .where('targetId')
        .equals(sessionId)
        .filter((r) => r.type === 'appears_in')
        .toArray();
      const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
      const threats = entities.filter((e): e is Entity => !!e && e.type === 'threat');
      return threats.filter((t) => threatNeedsCleanupReason(t.data));
    }, [db, sessionId]) ?? []
  );
}

function useSessionLocationSurvivorExceptions(sessionId: string | undefined) {
  const { db } = useCampaign();
  return (
    useLiveQuery(async () => {
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
    }, [db, sessionId]) ?? []
  );
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
    <h2 className="border-surface-200 text-surface-800 mb-3 flex items-center gap-2 border-b pb-2 text-base font-semibold">
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
    <div className="border-surface-200 flex items-center gap-3 rounded-lg border bg-white p-3">
      <div className="min-w-0 flex-1">
        <Link
          to={`/npcs/${npc.id}`}
          className="text-surface-900 hover:text-primary-600 block truncate font-medium hover:underline"
        >
          {npc.name}
        </Link>
      </div>
      <select
        value={selectedLocationId}
        onChange={(e) => setSelectedLocationId(e.target.value)}
        className="border-surface-300 text-surface-800 focus-visible:ring-primary-500 rounded border px-2 py-1 text-sm focus:outline-none focus-visible:ring-2"
      >
        <option value="">— wybierz lokację —</option>
        {(locations ?? []).map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void handleAssign()}
        disabled={!selectedLocationId || saving}
        className="bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500/40 flex items-center gap-1.5 rounded-md px-3 py-1 text-sm text-white focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Przypisz
      </button>
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        aria-label="Usuń"
        className="border-surface-200 text-surface-400 focus-visible:ring-danger-500/40 rounded-md border p-1.5 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:outline-none"
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

function EntityCleanupRow({ entity, linkTo }: { entity: Entity; linkTo: string }) {
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
      <div className="border-surface-200 flex items-center gap-3 rounded-lg border bg-white p-3">
        <div className="min-w-0 flex-1">
          <Link
            to={linkTo}
            className="text-surface-900 hover:text-primary-600 block truncate font-medium hover:underline"
          >
            {entity.name}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setShowRelationPicker(true)}
          className="border-surface-300 text-surface-600 hover:bg-surface-50 flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs"
          aria-label={`Powiąż encję ${entity.name}`}
        >
          <Plus className="h-3 w-3" /> Powiąż
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label="Usuń"
          className="border-surface-200 text-surface-400 focus-visible:ring-danger-500/40 rounded-md border p-1.5 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:outline-none"
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

function CreateThreatFromThreadModal({ thread, onClose }: { thread: Entity; onClose: () => void }) {
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
        const seg = values.clock.segments;
        const raw = (values.clock.tickLabels ?? []).slice(0, seg);
        const tickLabels = [...raw];
        while (tickLabels.length < seg) tickLabels.push('');
        const clock = await addEntity(db, {
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
        await addRelation(db, { type: 'tracks', sourceId: threat.id, targetId: clock.id });
        await markClockLinkedToThreat(db, clock.id);
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
      <div className="text-surface-700 mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
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
      <div className="border-surface-200 rounded-lg border bg-white p-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link
              to={`/threads/${thread.id}`}
              className="text-surface-900 hover:text-primary-600 block truncate font-medium hover:underline"
            >
              {thread.name}
            </Link>
            <p className="text-surface-500 mt-1 text-xs">
              Ten wątek jest w sesji, ale nie ma jeszcze rodzica ani powiązanego zagrożenia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Usuń"
            className="border-surface-200 text-surface-400 rounded-md border p-1.5 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowRelationPicker(true)}
            className="border-surface-300 text-surface-700 hover:bg-surface-50 flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs"
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
            className="border-surface-300 text-surface-600 hover:bg-surface-50 rounded-md border px-2.5 py-1 text-xs"
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
      : typeof threat.data.reasonOfDead === 'string'
        ? threat.data.reasonOfDead
        : '';
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
    <div className="border-surface-200 rounded-lg border bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/threats/${threat.id}`}
            className="text-surface-900 hover:text-primary-600 block truncate font-medium hover:underline"
          >
            {threat.name}
          </Link>
          <p className="text-surface-500 mt-1 text-xs">
            Uzupełnij powód zakończenia, jeśli chcesz zapisać kontekst.
          </p>
        </div>
      </div>

      <div className="mt-3">
        {warnEmpty && (
          <div className="mb-2 rounded-md border border-amber-100 bg-amber-50 p-2 text-sm text-amber-700">
            Nie podano powodu zakończenia. Wstawiono domyślny powód. Kliknij „Zapisz powód”, aby
            potwierdzić.
          </div>
        )}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="border-surface-300 w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Powód zakończenia..."
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {THREAT_DEATH_REASON_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className="border-surface-300 text-surface-600 hover:bg-surface-50 rounded-full border px-3 py-1 text-xs"
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setReason('')}
            className="border-surface-300 text-surface-700 hover:bg-surface-50 rounded-md border px-3 py-1.5 text-sm"
          >
            Wyczyść
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
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
  const [acknowledgedFreeThreadIds, setAcknowledgedFreeThreadIds] = useState<Set<string>>(
    new Set(),
  );
  const [noteDecisions, setNoteDecisions] = useState<Record<string, 'keep' | 'archive' | 'delete'>>(
    {},
  );
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const npcsWithoutLocation = useSessionNpcsWithoutLocation(id);
  const locationsWithoutParent = useSessionLocationsWithoutParent(id);
  const danglingThreads = useSessionDanglingThreads(id);
  const visibleDanglingThreads = danglingThreads.filter(
    (thread) => !acknowledgedFreeThreadIds.has(thread.id),
  );
  const completedThreats = useSessionCompletedThreats(id);
  const survivorLocations = useSessionLocationSurvivorExceptions(id);
  const notes = useNotesBySession(id ?? '') ?? [];

  const cleanupDraftKey = useMemo(() => (id ? `session-cleanup-draft-${id}` : null), [id]);

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
        ? parsed.acknowledgedFreeThreadIds.filter(
            (item): item is string => typeof item === 'string',
          )
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
      <DetailNotFound
        icon={BookOpen}
        title="Sesja nie znaleziona"
        description="Mogła zostać usunięta albo odnośnik jest nieaktualny."
        to="/sessions"
        linkLabel="Wróć do listy sesji"
      />
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
                  sessionClockEndMode:
                    clock.data.filled >= clock.data.segments ? 'completed' : 'manual_stopped',
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
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 lg:px-6">
      <section className="app-panel-strong overflow-hidden rounded-[2.2rem] p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.48fr)]">
          <div className="relative px-6 py-7 lg:px-8">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,var(--color-warning-500)_0%,var(--color-success-500)_100%)]" />
            <Link
              to={`/sessions/${id}`}
              className="text-surface-600 hover:text-primary-800 mb-4 flex w-fit items-center gap-2 rounded-full px-2 py-1 text-sm transition-colors hover:bg-[rgba(223,225,218,0.72)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Sesja
            </Link>
            <div className="text-primary-700 mb-4 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
              Cleanup po sesji
            </div>
            <h1 className="text-primary-900 text-[2.25rem] leading-[0.98] font-semibold tracking-[-0.06em] lg:text-[3.4rem]">
              {title}
            </h1>
            <p className="text-surface-700 mt-4 max-w-[64ch] text-sm leading-7">
              Decyzje końcowe, brakujące powiązania i notatki live w jednej kolejce do zamknięcia.
            </p>
            <p className="text-surface-500 mt-3 text-xs font-medium">
              {draftSavedAt
                ? `Szkic sprzątania zapisany: ${new Date(draftSavedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
                : 'Szkic sprzątania zapisuje się automatycznie.'}
            </p>
          </div>
          <div className="border-t border-[rgba(86,93,94,0.1)] bg-[rgba(255,250,240,0.11)] p-5 lg:border-t-0 lg:border-l lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-primary-900 text-sm font-semibold">Postęp sprzątania</p>
              <span className="text-surface-700 text-xs font-medium">
                {completedDecisionCount}/{totalDecisionScope} decyzji
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(33,71,102,0.12)]">
              <div
                className="bg-primary-600 h-full rounded-full transition-all"
                style={{
                  width:
                    totalDecisionScope === 0
                      ? '100%'
                      : `${Math.round((completedDecisionCount / totalDecisionScope) * 100)}%`,
                }}
              />
            </div>
            <p className="text-surface-600 mt-2 text-xs">
              {openDecisionsCount === 0
                ? 'Wszystkie decyzje domknięte — możesz zakończyć sprzątanie.'
                : `Do domknięcia: ${openDecisionsCount}.`}
            </p>
          </div>
        </div>
      </section>

      {/* EmptyState */}
      {allClear && (
        <div className="app-panel border-success-500/20 flex flex-col items-center gap-3 rounded-[1.8rem] border bg-[rgba(106,143,135,0.1)] py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="text-lg font-semibold text-green-800">Sesja uporządkowana!</p>
          <p className="text-sm text-green-600">Wszystkie powiązania są kompletne.</p>
        </div>
      )}

      {/* Section: Postacie bez lokacji */}
      <section className="app-panel rounded-[1.8rem] p-5 lg:p-6">
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
            <p className="text-surface-500 mb-2 text-sm">Gdzie były pod koniec sesji?</p>
            {npcsWithoutLocation.map((npc) => (
              <NpcCleanupRow key={npc.id} npc={npc} sessionId={session.id} />
            ))}
          </div>
        )}
      </section>

      {/* Section: Lokacje bez rodzica */}
      <section className="app-panel rounded-[1.8rem] p-5 lg:p-6">
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
            <p className="text-surface-500 mb-2 text-sm">
              Te lokacje z sesji nie mają lokacji nadrzędnej.
            </p>
            {locationsWithoutParent.map((loc) => (
              <EntityCleanupRow key={loc.id} entity={loc} linkTo={`/locations/${loc.id}`} />
            ))}
          </div>
        )}
      </section>

      {/* Section: Wątki wiszące */}
      <section className="app-panel rounded-[1.8rem] p-5 lg:p-6">
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
            <p className="text-surface-500 mb-2 text-sm">
              Te wątki z sesji nie mają rodzica ani powiązanego zagrożenia.
            </p>
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
      <section className="app-panel rounded-[1.8rem] p-5 lg:p-6">
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
            <p className="text-surface-500 mb-2 text-sm">
              Uzupełnij powody zakończenia zagrożeń oznaczonych podczas sesji.
            </p>
            {completedThreats.map((threat) => (
              <ThreatCleanupRow key={threat.id} threat={threat} />
            ))}
          </div>
        )}
      </section>

      <section className="app-panel rounded-[1.8rem] p-5 lg:p-6">
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
            <p className="text-surface-500 mb-2 text-sm">
              Dla każdej notatki wybierz: zachowaj, archiwizuj lub usuń.
            </p>
            {notes.map((note) => {
              const decision = noteDecisions[note.id];
              return (
                <div key={note.id} className="border-surface-200 rounded-lg border bg-white p-3">
                  <p className="text-surface-800 text-sm">{note.data.content}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setNoteDecisions((prev) => ({ ...prev, [note.id]: 'keep' }))}
                      className={`rounded-md px-2.5 py-1 text-xs ${
                        decision === 'keep'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'border-surface-300 text-surface-700 border'
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
                          : 'border-surface-300 text-surface-700 border'
                      }`}
                      aria-label={`Notatka: archiwizuj`}
                    >
                      Archiwizuj
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteDecisions((prev) => ({ ...prev, [note.id]: 'delete' }))}
                      className={`rounded-md px-2.5 py-1 text-xs ${
                        decision === 'delete'
                          ? 'bg-danger-100 text-danger-800'
                          : 'border-surface-300 text-surface-700 border'
                      }`}
                      aria-label={`Notatka: usuń`}
                    >
                      Usuń
                    </button>
                    {!decision && (
                      <span className="text-danger-700 ml-1 text-xs">Wymagana decyzja</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="app-panel rounded-[1.8rem] p-5 lg:p-6">
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
            <p className="text-surface-500 mb-2 text-sm">
              Te lokacje zostały oznaczone jako ocalałe mimo zniszczenia lokacji nadrzędnej.
            </p>
            {survivorLocations.map((loc) => (
              <EntityCleanupRow key={loc.id} entity={loc} linkTo={`/locations/${loc.id}`} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="app-panel-strong sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-[1.6rem] p-4 shadow-[0_20px_42px_rgba(18,45,66,0.16)]">
        <button
          type="button"
          onClick={handleFinishLater}
          className="app-button-secondary rounded-2xl px-4 py-3 text-sm font-medium"
        >
          Dokończ później
        </button>
        <button
          type="button"
          onClick={() => void handleCompleteCleanup()}
          className="app-button-primary flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold"
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
