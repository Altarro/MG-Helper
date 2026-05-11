import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, GitBranch, MapPin, MapPinOff, Plus, Search, X } from 'lucide-react';
import { Link } from 'react-router';
import { Modal } from '@shared/components/Modal';
import { useCampaign } from '@shared/db/CampaignContext';
import { addEntity, addRelation } from '@shared/db/operations';
import {
  THREAD_DERIVATION_KIND_LABELS,
  THREAD_DERIVATION_KIND_OPTIONS,
} from '@shared/domain/storyContracts';
import type { Entity } from '@shared/types';
import { toastRemoveEntityError, toastRemoveEntitySuccess } from '@shared/utils/toastSessionEntity';
import { THREAD_KIND_LABELS, THREAD_KINDS } from '@modules/threads/types';
import {
  ensureEntitiesAppearInSession,
  removeEntityFromSession,
} from '../utils/liveSessionCommands';
import { recordSessionSignal } from '../utils/sessionSignals';
import { toast } from 'sonner';

interface ThreadTreePanelProps {
  sessionId: string;
  openCardIds: string[];
  onOpenCard: (entityId: string) => void;
  onCloseCard: (entityId: string) => void;
}

type ThreadStatusFilter = 'all' | 'active' | 'completed';

interface ThreadPanelData {
  threads: Entity[];
  childMap: Map<string, string[]>;
  childIds: Set<string>;
  parentByChild: Map<string, string>;
  threatGroups: Array<{ threat: Entity; threadIds: string[] }>;
  freeThreadIds: string[];
}

const EMPTY_PANEL_DATA: ThreadPanelData = {
  threads: [],
  childMap: new Map<string, string[]>(),
  childIds: new Set<string>(),
  parentByChild: new Map<string, string>(),
  threatGroups: [],
  freeThreadIds: [],
};

interface ThreadCampaignPickerModalProps {
  excludedIds: Set<string>;
  onAdd: (entityIds: string[]) => Promise<void>;
  onClose: () => void;
}

function ThreadCampaignPickerModal({
  excludedIds,
  onAdd,
  onClose,
}: ThreadCampaignPickerModalProps) {
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const entities =
    useLiveQuery(() => db.entities.where('type').equals('thread').toArray(), [db]) ?? [];

  const available = entities.filter((entity) => !excludedIds.has(entity.id));
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? available.filter((entity) => entity.name.toLowerCase().includes(normalizedQuery))
    : available;

  function toggle(entityId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId);
      else next.add(entityId);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    try {
      await onAdd([...selected]);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Dodaj wątki z kampanii" size="md" onClose={onClose}>
      <div className="app-input-shell mb-3 flex items-center gap-2 rounded-[1.15rem] px-3 py-2.5">
        <Search className="text-surface-400 h-3.5 w-3.5" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj wątków..."
          className="placeholder:text-surface-400 w-full text-sm outline-none"
          autoFocus
        />
      </div>

      <div className="app-panel max-h-72 overflow-y-auto rounded-[1.25rem] p-1">
        {filtered.length === 0 ? (
          <p className="text-surface-400 p-3 text-sm">
            {available.length === 0 ? 'Wszystkie wątki kampanii są już w sesji.' : 'Brak wyników.'}
          </p>
        ) : (
          <ul className="divide-surface-100 divide-y">
            {filtered.map((entity) => (
              <li key={entity.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-[0.95rem] px-3 py-2.5 text-sm hover:bg-[rgba(229,231,223,0.98)]">
                  <input
                    type="checkbox"
                    checked={selected.has(entity.id)}
                    onChange={() => toggle(entity.id)}
                    className="border-surface-300 accent-primary-600 h-4 w-4 rounded"
                  />
                  <span className="text-surface-800 truncate">{entity.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-surface-100 mt-4 flex items-center justify-between border-t pt-3">
        <span className="text-surface-500 text-xs">
          {selected.size > 0 ? `Wybrano: ${selected.size}` : 'Wybierz wątki do dodania'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="app-button-secondary rounded-xl px-3 py-2 text-sm font-medium"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={selected.size === 0 || saving}
            className="app-button-primary rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Dodaj do sesji
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ThreadTreePanel({
  sessionId,
  openCardIds,
  onOpenCard,
  onCloseCard,
}: ThreadTreePanelProps) {
  const { db } = useCampaign();
  const [addingMode, setAddingMode] = useState<'root' | 'child' | null>(null);
  const [parentThreadId, setParentThreadId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<(typeof THREAD_KINDS)[number]>('side');
  const [newDerivationKind, setNewDerivationKind] =
    useState<(typeof THREAD_DERIVATION_KIND_OPTIONS)[number]>('followup');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<ThreadStatusFilter>('all');
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);

  const panelData =
    useLiveQuery(async () => {
      const relations = await db.relations
        .where('targetId')
        .equals(sessionId)
        .filter((relation) => relation.type === 'appears_in')
        .toArray();
      const ids = relations.map((relation) => relation.sourceId);
      if (ids.length === 0) return EMPTY_PANEL_DATA;

      const threads = await db.entities
        .where('id')
        .anyOf(ids)
        .filter((entity) => entity.type === 'thread')
        .toArray();
      const threadMap = new Map(threads.map((thread) => [thread.id, thread]));
      const derives = await db.relations
        .where('sourceId')
        .anyOf(threads.map((thread) => thread.id))
        .filter((relation) => relation.type === 'derives_from' && threadMap.has(relation.targetId))
        .toArray();

      const childIds = new Set<string>();
      const childMap = new Map<string, string[]>();
      const parentByChild = new Map<string, string>();

      for (const relation of derives) {
        childIds.add(relation.sourceId);
        parentByChild.set(relation.sourceId, relation.targetId);
        const children = childMap.get(relation.targetId) ?? [];
        children.push(relation.sourceId);
        childMap.set(relation.targetId, children);
      }

      const threadIds = threads.map((thread) => thread.id);
      const [outgoingAffects, incomingAffects] = await Promise.all([
        db.relations
          .where('sourceId')
          .anyOf(threadIds)
          .filter((relation) => relation.type === 'affects')
          .toArray(),
        db.relations
          .where('targetId')
          .anyOf(threadIds)
          .filter((relation) => relation.type === 'affects')
          .toArray(),
      ]);

      const candidateThreatIds = new Set<string>();
      for (const relation of outgoingAffects) candidateThreatIds.add(relation.targetId);
      for (const relation of incomingAffects) candidateThreatIds.add(relation.sourceId);

      const threatEntities =
        candidateThreatIds.size > 0
          ? await db.entities
              .where('id')
              .anyOf([...candidateThreatIds])
              .toArray()
          : [];
      const threatMap = new Map(
        threatEntities
          .filter((entity) => entity.type === 'threat')
          .map((threat) => [threat.id, threat] as const),
      );

      const threadThreatIds = new Map<string, Set<string>>();
      for (const thread of threads) threadThreatIds.set(thread.id, new Set<string>());
      for (const relation of outgoingAffects) {
        if (threatMap.has(relation.targetId)) {
          threadThreatIds.get(relation.sourceId)?.add(relation.targetId);
        }
      }
      for (const relation of incomingAffects) {
        if (threatMap.has(relation.sourceId)) {
          threadThreatIds.get(relation.targetId)?.add(relation.sourceId);
        }
      }

      const threatGroupsMap = new Map<string, Set<string>>();
      const freeThreadIds: string[] = [];

      for (const thread of threads) {
        const relatedThreatIds = [...(threadThreatIds.get(thread.id) ?? new Set<string>())];
        if (relatedThreatIds.length === 0) {
          freeThreadIds.push(thread.id);
          continue;
        }

        for (const threatId of relatedThreatIds) {
          const bucket = threatGroupsMap.get(threatId) ?? new Set<string>();
          bucket.add(thread.id);
          threatGroupsMap.set(threatId, bucket);
        }
      }

      const threatGroups = [...threatGroupsMap.entries()]
        .map(([threatId, groupedThreadIds]) => {
          const threat = threatMap.get(threatId);
          if (!threat) return null;
          return {
            threat,
            threadIds: [...groupedThreadIds],
          };
        })
        .filter((group): group is { threat: Entity; threadIds: string[] } => group !== null)
        .sort((a, b) => a.threat.name.localeCompare(b.threat.name, 'pl'));

      return {
        threads: threads.sort((a, b) => a.name.localeCompare(b.name, 'pl')),
        childMap,
        childIds,
        parentByChild,
        threatGroups,
        freeThreadIds,
      };
    }, [db, sessionId]) ?? EMPTY_PANEL_DATA;

  const threadById = useMemo(
    () => new Map(panelData.threads.map((thread) => [thread.id, thread])),
    [panelData.threads],
  );
  const sceneThreadIds = useMemo(
    () => new Set(openCardIds.filter((id) => threadById.get(id)?.type === 'thread')),
    [openCardIds, threadById],
  );

  const groupedRows = useMemo(() => {
    type Row = { thread: Entity; depth: number; hasChildren: boolean };

    const flattenForIds = (allowedThreadIds: string[]): Row[] => {
      const groupSet = new Set(allowedThreadIds);
      const matchesFilter = (thread: Entity) => {
        const status = (thread.data.status as string | undefined) ?? 'active';
        if (statusFilter === 'all') return true;
        return status === statusFilter;
      };

      const allowedSet = new Set<string>();
      for (const threadId of allowedThreadIds) {
        const thread = threadById.get(threadId);
        if (!thread || !matchesFilter(thread)) continue;

        let currentId: string | undefined = thread.id;
        while (currentId && groupSet.has(currentId)) {
          if (allowedSet.has(currentId)) break;
          allowedSet.add(currentId);
          currentId = panelData.parentByChild.get(currentId);
        }
      }

      const roots = panelData.threads
        .filter((thread) => {
          if (!allowedSet.has(thread.id)) return false;
          const parentId = panelData.parentByChild.get(thread.id);
          return !parentId || !allowedSet.has(parentId);
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

      const result: Row[] = [];
      const pushBranch = (thread: Entity, depth: number) => {
        const childrenIds = (panelData.childMap.get(thread.id) ?? []).filter((childId) =>
          allowedSet.has(childId),
        );
        const hasChildren = childrenIds.length > 0;
        result.push({ thread, depth, hasChildren });
        if (!hasChildren || collapsedIds.has(thread.id)) return;

        const children = childrenIds
          .map((childId) => threadById.get(childId))
          .filter((threadEntity): threadEntity is Entity => threadEntity !== undefined)
          .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
        for (const child of children) pushBranch(child, depth + 1);
      };

      for (const root of roots) pushBranch(root, 0);
      return result;
    };

    const threatSections = panelData.threatGroups
      .map((group) => ({
        threat: group.threat,
        rows: flattenForIds(group.threadIds),
      }))
      .filter((section) => section.rows.length > 0);
    const freeRows = flattenForIds(panelData.freeThreadIds);

    return {
      threatSections,
      freeRows,
      hasAnyRows: threatSections.length > 0 || freeRows.length > 0,
    };
  }, [collapsedIds, panelData, statusFilter, threadById]);

  function resetAddForm() {
    setNewName('');
    setNewKind('side');
    setNewDerivationKind('followup');
    setAddingMode(null);
    setParentThreadId(null);
  }

  async function handleAddThread() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    try {
      const thread = await addEntity(db, {
        type: 'thread',
        name: trimmed,
        description: '',
        tags: [],
        data: {
          color: '#6366f1',
          status: 'active',
          kind: newKind,
          priority: 'normal',
          stakes: [],
          resolution: '',
        },
      });

      const operations: Promise<unknown>[] = [
        addRelation(db, { type: 'appears_in', sourceId: thread.id, targetId: sessionId }),
      ];

      if (addingMode === 'child' && parentThreadId) {
        operations.push(
          addRelation(db, {
            type: 'derives_from',
            sourceId: thread.id,
            targetId: parentThreadId,
            meta: { threadDerivationKind: newDerivationKind },
          }),
        );
      }

      await Promise.all(operations);
      await recordSessionSignal(db, {
        sessionId,
        signalType: 'thread_created_in_session',
        entityType: thread.type,
        entityId: thread.id,
        entityName: thread.name,
        metadata: {
          mode: addingMode ?? 'root',
          parentThreadId: addingMode === 'child' ? parentThreadId : null,
          kind: newKind,
          derivationKind: addingMode === 'child' ? newDerivationKind : null,
        },
      });
      toast.success(`Wątek „${trimmed}” dodany`);
      resetAddForm();
    } catch {
      toast.error('Nie udało się dodać wątku');
    }
  }

  async function handleRemoveFromSession(thread: Entity) {
    try {
      const removed = await removeEntityFromSession(db, thread.id, sessionId);
      if (!removed) return;
      onCloseCard(thread.id);
      toast.success(toastRemoveEntitySuccess('thread', thread.name));
    } catch {
      toast.error(toastRemoveEntityError('thread'));
    }
  }

  async function handleAddFromCampaign(entityIds: string[]) {
    try {
      const addedCount = await ensureEntitiesAppearInSession(db, entityIds, sessionId);
      if (addedCount === 0) {
        toast.message('Wybrane wątki są już w sesji');
        return;
      }
      toast.success(
        `Dodano do sesji ${addedCount} ${addedCount === 1 ? 'wątek' : 'wątki'} z kampanii`,
      );
    } catch {
      toast.error('Nie udało się dodać wątków z kampanii');
    }
  }

  function renderThreadRow(thread: Entity, depth: number, hasChildren: boolean) {
    const inScene = sceneThreadIds.has(thread.id);
    const kind = (thread.data.kind as (typeof THREAD_KINDS)[number] | undefined) ?? 'side';
    const isCollapsed = collapsedIds.has(thread.id);
    const isCompleted = (thread.data.status as string | undefined) === 'completed';

    return (
      <li
        key={thread.id}
        className={`group flex items-center gap-1.5 px-2 py-2.5 transition-colors hover:bg-[rgba(229,231,223,0.98)] ${
          isCompleted ? 'opacity-70' : ''
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => {
              setCollapsedIds((prev) => {
                const next = new Set(prev);
                if (next.has(thread.id)) next.delete(thread.id);
                else next.add(thread.id);
                return next;
              });
            }}
            className="text-surface-400 hover:bg-surface-100 hover:text-surface-600 shrink-0 rounded p-0.5"
            title={
              isCollapsed ? `Rozwiń podwątki: ${thread.name}` : `Zwiń podwątki: ${thread.name}`
            }
            aria-label={
              isCollapsed ? `Rozwiń podwątki: ${thread.name}` : `Zwiń podwątki: ${thread.name}`
            }
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span aria-hidden="true" className="h-3 w-3 shrink-0" />
        )}

        <button
          type="button"
          title={inScene ? 'Odepnij ze sceny' : 'Przypnij do sceny'}
          aria-label={`${inScene ? 'Odepnij ze sceny' : 'Przypnij do sceny'}: ${thread.name}`}
          onClick={() => (inScene ? onCloseCard(thread.id) : onOpenCard(thread.id))}
          className={`shrink-0 rounded p-1 transition-colors ${
            inScene
              ? 'text-primary-500 hover:bg-red-50 hover:text-red-500'
              : 'text-surface-300 hover:bg-surface-100 hover:text-surface-500'
          }`}
        >
          {inScene ? <MapPinOff className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
        </button>

        <Link
          to={`/threads/${thread.id}`}
          state={{ returnToSessionLive: sessionId }}
          className="text-surface-800 hover:text-primary-700 min-w-0 flex-1 truncate pr-1 text-sm font-medium"
        >
          {thread.name}
        </Link>

        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-medium text-violet-700">
          {THREAD_KIND_LABELS[kind]}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
            isCompleted
              ? 'app-pill-muted'
              : 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800'
          }`}
        >
          {isCompleted ? 'Zakończony' : 'Aktywny'}
        </span>

        <button
          type="button"
          title="Dodaj podwątek"
          aria-label={`Dodaj podwątek do: ${thread.name}`}
          onClick={() => {
            setAddingMode('child');
            setParentThreadId(thread.id);
          }}
          className="text-surface-300 hover:bg-surface-100 hover:text-primary-600 shrink-0 rounded p-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus:opacity-100"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          title="Usuń z sesji"
          aria-label={`Usuń z sesji: ${thread.name}`}
          onClick={() => void handleRemoveFromSession(thread)}
          className="text-surface-300 shrink-0 rounded p-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 focus:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </li>
    );
  }

  return (
    <div className="app-panel flex flex-col overflow-hidden rounded-[1.45rem]">
      <div className="border-b border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.56)] px-4 py-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-surface-500 text-xs font-semibold tracking-[0.18em] uppercase">
            Wątki w sesji
          </span>
          <span className="app-pill-muted rounded-full px-2.5 py-1 text-[10px] font-semibold">
            {panelData.threads.length}
          </span>
        </div>

        <p className="text-surface-700 mb-3 text-sm">
          Wątki obecne w sesji, ich odnogi i relacje z zagrożeniami.
        </p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (addingMode === 'root') {
                resetAddForm();
                return;
              }
              setAddingMode('root');
              setParentThreadId(null);
            }}
            className="app-button-secondary flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Dodaj do sesji
          </button>

          <button
            type="button"
            onClick={() => setCampaignPickerOpen(true)}
            className="app-button-secondary rounded-xl px-3 py-2.5 text-sm font-medium"
          >
            Dodaj z kampanii
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', 'Wszystkie'],
              ['active', 'Aktywne'],
              ['completed', 'Zakończone'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                statusFilter === value
                  ? 'app-pill'
                  : 'app-pill-muted hover:bg-[rgba(229,231,223,0.98)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {addingMode && (
        <div className="border-b border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.48)] px-4 py-4">
          {addingMode === 'child' && parentThreadId && (
            <p className="text-surface-500 mb-2 text-xs">
              Podwątek dla:{' '}
              <span className="text-surface-700 font-semibold">
                {threadById.get(parentThreadId)?.name}
              </span>
            </p>
          )}

          <div className="app-panel flex flex-col gap-2 rounded-[1.25rem] p-3">
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleAddThread();
                if (event.key === 'Escape') resetAddForm();
              }}
              placeholder="Nazwa wątku..."
              className="app-input focus:border-primary-500 flex-1 rounded-[1rem] px-3 py-2 text-sm focus:outline-none"
            />

            <div className="flex flex-wrap gap-1">
              {THREAD_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setNewKind(kind)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    newKind === kind
                      ? 'app-pill'
                      : 'app-pill-muted hover:bg-[rgba(229,231,223,0.98)]'
                  }`}
                >
                  {THREAD_KIND_LABELS[kind]}
                </button>
              ))}
            </div>

            {addingMode === 'child' && (
              <select
                value={newDerivationKind}
                onChange={(event) =>
                  setNewDerivationKind(
                    event.target.value as (typeof THREAD_DERIVATION_KIND_OPTIONS)[number],
                  )
                }
                className="app-input focus:border-primary-500 rounded-[1rem] px-3 py-2 text-sm focus:outline-none"
              >
                {THREAD_DERIVATION_KIND_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {THREAD_DERIVATION_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetAddForm}
                className="app-button-secondary rounded-xl px-3 py-2 text-xs font-medium"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => void handleAddThread()}
                disabled={!newName.trim()}
                className="app-button-primary rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50"
              >
                Dodaj
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {!groupedRows.hasAnyRows ? (
          <div className="p-4">
            <div className="app-input-shell text-surface-500 rounded-[1.25rem] border-dashed px-4 py-5 text-center text-sm">
              Brak wątków w sesji. Dodaj wątek do sesji albo podepnij go z kampanii.
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {groupedRows.threatSections.map((section) => (
              <section key={section.threat.id} className="app-panel overflow-hidden rounded-[1.25rem]">
                <div className="border-b border-[rgba(210,166,67,0.22)] bg-[rgba(242,196,88,0.12)] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCollapsedGroups((prev) => {
                          const next = new Set(prev);
                          const key = `threat:${section.threat.id}`;
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        });
                      }}
                      className="flex min-w-0 items-center gap-1.5"
                    >
                      <ChevronRight
                        className={`text-surface-400 h-3.5 w-3.5 transition-transform ${
                          collapsedGroups.has(`threat:${section.threat.id}`) ? '' : 'rotate-90'
                        }`}
                      />
                      <span className="text-surface-600 text-xs font-semibold tracking-[0.14em] uppercase">
                        Zagrożenie
                      </span>
                    </button>
                    <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-orange-200 ring-inset">
                      {section.rows.length}
                    </span>
                  </div>
                  <Link
                    to={`/threats/${section.threat.id}`}
                    state={{ returnToSessionLive: sessionId }}
                    className="mt-1 block truncate pl-5 text-sm font-semibold text-orange-700 hover:underline"
                  >
                    {section.threat.name}
                  </Link>
                </div>

                {!collapsedGroups.has(`threat:${section.threat.id}`) && (
                  <ul className="divide-surface-100 divide-y">
                    {section.rows.map(({ thread, depth, hasChildren }) =>
                      renderThreadRow(thread, depth, hasChildren),
                    )}
                  </ul>
                )}
              </section>
            ))}

            {groupedRows.freeRows.length > 0 && (
              <section className="app-panel overflow-hidden rounded-[1.25rem]">
                <div className="flex items-center justify-between border-b border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.48)] px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCollapsedGroups((prev) => {
                        const next = new Set(prev);
                        const key = 'free';
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      });
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <ChevronRight
                      className={`text-surface-400 h-3.5 w-3.5 transition-transform ${
                        collapsedGroups.has('free') ? '' : 'rotate-90'
                      }`}
                    />
                    <span className="text-surface-600 text-xs font-semibold tracking-[0.16em] uppercase">
                      Wolne wątki
                    </span>
                  </button>
                  <span className="text-surface-600 ring-surface-200 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset">
                    {groupedRows.freeRows.length}
                  </span>
                </div>

                {!collapsedGroups.has('free') && (
                  <ul className="divide-surface-100 divide-y">
                    {groupedRows.freeRows.map(({ thread, depth, hasChildren }) =>
                      renderThreadRow(thread, depth, hasChildren),
                    )}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {campaignPickerOpen && (
        <ThreadCampaignPickerModal
          excludedIds={new Set(panelData.threads.map((thread) => thread.id))}
          onAdd={handleAddFromCampaign}
          onClose={() => setCampaignPickerOpen(false)}
        />
      )}
    </div>
  );
}

export { GitBranch as ThreadIcon };
