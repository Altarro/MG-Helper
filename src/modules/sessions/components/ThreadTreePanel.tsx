import { useMemo, useState } from 'react';
import { Plus, ChevronRight, GitBranch, MapPin, MapPinOff, X, Search } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { useCampaign } from '@shared/db/CampaignContext';
import { addEntity, addRelation } from '@shared/db/operations';
import { toast } from 'sonner';
import type { Entity } from '@shared/types';
import { THREAD_KIND_LABELS, THREAD_KINDS } from '@modules/threads/types';
import { THREAD_DERIVATION_KIND_LABELS, THREAD_DERIVATION_KIND_OPTIONS } from '@shared/domain/storyContracts';
import { removeEntityFromSession } from '../utils/liveSessionCommands';
import { Modal } from '@shared/components/Modal';

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

function ThreadCampaignPickerModal({ excludedIds, onAdd, onClose }: ThreadCampaignPickerModalProps) {
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const entities = useLiveQuery(
    () => db.entities.where('type').equals('thread').toArray(),
    [db],
  ) ?? [];

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
      <div className="mb-3 flex items-center gap-2 rounded-md border border-surface-200 px-2.5 py-2">
        <Search className="h-3.5 w-3.5 text-surface-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj wątków..."
          className="w-full text-sm outline-none placeholder:text-surface-400"
          autoFocus
        />
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border border-surface-200">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-surface-400">
            {available.length === 0 ? 'Wszystkie wątki kampanii są już w sesji.' : 'Brak wyników.'}
          </p>
        ) : (
          <ul className="divide-y divide-surface-100">
            {filtered.map((entity) => (
              <li key={entity.id}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-50">
                  <input
                    type="checkbox"
                    checked={selected.has(entity.id)}
                    onChange={() => toggle(entity.id)}
                    className="h-4 w-4 rounded border-surface-300 accent-primary-600"
                  />
                  <span className="truncate text-surface-800">{entity.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-surface-100 pt-3">
        <span className="text-xs text-surface-500">
          {selected.size > 0 ? `Wybrano: ${selected.size}` : 'Wybierz wątki do dodania'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-50"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={selected.size === 0 || saving}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Dodaj
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ThreadTreePanel({ sessionId, openCardIds, onOpenCard, onCloseCard }: ThreadTreePanelProps) {
  const { db } = useCampaign();
  const [addingMode, setAddingMode] = useState<'root' | 'child' | null>(null);
  const [parentThreadId, setParentThreadId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<(typeof THREAD_KINDS)[number]>('side');
  const [newDerivationKind, setNewDerivationKind] = useState<(typeof THREAD_DERIVATION_KIND_OPTIONS)[number]>('followup');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<ThreadStatusFilter>('all');
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);

  const panelData = useLiveQuery(async () => {
    const rels = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const ids = rels.map((r) => r.sourceId);
    if (ids.length === 0) return EMPTY_PANEL_DATA;
    const threads = await db.entities
      .where('id')
      .anyOf(ids)
      .filter((e) => e.type === 'thread')
      .toArray();
    const threadMap = new Map(threads.map((thread) => [thread.id, thread]));
    const derives = await db.relations
      .where('sourceId')
      .anyOf(threads.map((thread) => thread.id))
      .filter((r) => r.type === 'derives_from' && threadMap.has(r.targetId))
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

    const threatEntities = candidateThreatIds.size > 0
      ? await db.entities.where('id').anyOf([...candidateThreatIds]).toArray()
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
        const childrenIds = (panelData.childMap.get(thread.id) ?? []).filter((childId) => allowedSet.has(childId));
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
        type: 'threat' as const,
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
  }, [panelData, threadById, collapsedIds, statusFilter]);

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
        data: { color: '#6366f1', status: 'active', kind: newKind, priority: 'normal', resolution: '' },
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
      toast.success(`Wątek „${trimmed}" dodany`);
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
      toast.success(`${thread.name} usunięty z sesji`);
    } catch {
      toast.error('Nie udało się usunąć z sesji');
    }
  }

  async function handleAddFromCampaign(entityIds: string[]) {
    try {
      await Promise.all(
        entityIds.map((entityId) =>
          addRelation(db, { type: 'appears_in', sourceId: entityId, targetId: sessionId })),
      );
      toast.success(`Dodano ${entityIds.length} ${entityIds.length === 1 ? 'wątek' : 'wątki'} z kampanii`);
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
        className={`group flex items-center gap-2 px-3 py-2 hover:bg-surface-50 ${isCompleted ? 'opacity-70' : ''}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
      >
        <button
          type="button"
          onClick={() => {
            if (!hasChildren) return;
            setCollapsedIds((prev) => {
              const next = new Set(prev);
              if (next.has(thread.id)) next.delete(thread.id);
              else next.add(thread.id);
              return next;
            });
          }}
          className={`shrink-0 rounded p-0.5 ${hasChildren ? 'text-surface-400 hover:bg-surface-100 hover:text-surface-600' : 'text-transparent'}`}
        >
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${hasChildren && !isCollapsed ? 'rotate-90' : ''}`} />
        </button>
        <button
          type="button"
          title={inScene ? 'Usuń ze sceny' : 'Dodaj do sceny'}
          onClick={() => (inScene ? onCloseCard(thread.id) : onOpenCard(thread.id))}
          className={`shrink-0 rounded p-1 transition-colors ${
            inScene
              ? 'text-primary-500 hover:bg-red-50 hover:text-red-500'
              : 'text-surface-300 hover:bg-surface-100 hover:text-surface-500'
          }`}
        >
          {inScene ? <MapPin className="h-3.5 w-3.5" /> : <MapPinOff className="h-3.5 w-3.5" />}
        </button>
        <Link
          to={`/threads/${thread.id}`}
          state={{ returnToSessionLive: sessionId }}
          className="min-w-0 flex-1 truncate text-sm font-medium text-surface-800 hover:text-primary-700"
        >
          {thread.name}
        </Link>
        <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
          {THREAD_KIND_LABELS[kind]}
        </span>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
          isCompleted ? 'bg-surface-200 text-surface-600' : 'bg-green-100 text-green-700'
        }`}>
          {isCompleted ? 'Zakończony' : 'Aktywny'}
        </span>
        <button
          type="button"
          title="Dodaj podwątek"
          onClick={() => {
            setAddingMode('child');
            setParentThreadId(thread.id);
          }}
          className="shrink-0 rounded p-1 text-surface-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-100 hover:text-primary-600"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Usuń z sesji"
          onClick={() => void handleRemoveFromSession(thread)}
          className="shrink-0 rounded p-1 text-surface-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </li>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-surface-200 bg-surface-50 px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-surface-500">Wątki w sesji</span>
          <span className="rounded-full bg-surface-200 px-2 py-0.5 text-[10px] font-semibold text-surface-600">
            {panelData.threads.length}
          </span>
        </div>
        <div className="mb-2 grid grid-cols-2 gap-1.5">
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
            className="flex items-center justify-center gap-1 rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-700 transition-colors hover:bg-surface-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Dodaj wątek
          </button>
          <button
            type="button"
            onClick={() => setCampaignPickerOpen(true)}
            className="rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-700 transition-colors hover:bg-surface-50"
          >
            Dodaj z kampanii
          </button>
        </div>
        <div className="flex items-center gap-1">
          {([
            ['all', 'Wszystkie'],
            ['active', 'Aktywne'],
            ['completed', 'Zakończone'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                statusFilter === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-surface-600 ring-1 ring-inset ring-surface-200 hover:bg-surface-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {addingMode && (
        <div className="border-b border-surface-200 bg-surface-50/70 px-3 py-2">
          {addingMode === 'child' && parentThreadId && (
            <p className="mb-1 text-xs text-surface-500">
              Podwątek dla: <span className="font-semibold text-surface-700">{threadById.get(parentThreadId)?.name}</span>
            </p>
          )}
          <div className="flex flex-col gap-1 rounded border border-surface-200 bg-white p-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddThread();
                if (e.key === 'Escape') resetAddForm();
              }}
              placeholder="Nazwa watku..."
              className="flex-1 rounded border border-surface-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1">
              {THREAD_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setNewKind(kind)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    newKind === kind
                      ? 'bg-primary-600 text-white'
                      : 'border border-surface-300 text-surface-600 hover:bg-white'
                  }`}
                >
                  {THREAD_KIND_LABELS[kind]}
                </button>
              ))}
            </div>
            {addingMode === 'child' && (
              <select
                value={newDerivationKind}
                onChange={(e) => setNewDerivationKind(e.target.value as (typeof THREAD_DERIVATION_KIND_OPTIONS)[number])}
                className="rounded border border-surface-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
              >
                {THREAD_DERIVATION_KIND_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {THREAD_DERIVATION_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={resetAddForm}
                className="rounded-md border border-surface-300 px-2 py-1 text-xs text-surface-600 hover:bg-surface-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => void handleAddThread()}
                disabled={!newName.trim()}
                className="rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Dodaj
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!groupedRows.hasAnyRows ? (
          <p className="p-6 text-center text-sm text-surface-400">Brak wątków w sesji</p>
        ) : (
          <div className="space-y-3 p-2">
            {groupedRows.threatSections.map((section) => (
              <section key={section.threat.id} className="overflow-hidden rounded-lg border border-surface-200">
                <div className="flex items-center justify-between border-b border-surface-200 bg-orange-50/70 px-2.5 py-1.5">
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
                      className={`h-3.5 w-3.5 text-surface-400 transition-transform ${
                        collapsedGroups.has(`threat:${section.threat.id}`) ? '' : 'rotate-90'
                      }`}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wide text-surface-600">Zagrożenie</span>
                  </button>
                  <div className="ml-2 flex min-w-0 items-center gap-2">
                    <Link
                      to={`/threats/${section.threat.id}`}
                      state={{ returnToSessionLive: sessionId }}
                      className="truncate text-xs font-semibold uppercase tracking-wide text-orange-700 hover:underline"
                    >
                      {section.threat.name}
                    </Link>
                    <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-200">
                      {section.rows.length}
                    </span>
                  </div>
                </div>
                {!collapsedGroups.has(`threat:${section.threat.id}`) && (
                  <ul className="divide-y divide-surface-100">
                    {section.rows.map(({ thread, depth, hasChildren }) => renderThreadRow(thread, depth, hasChildren))}
                  </ul>
                )}
              </section>
            ))}

            {groupedRows.freeRows.length > 0 && (
              <section className="overflow-hidden rounded-lg border border-surface-200">
                <div className="flex items-center justify-between border-b border-surface-200 bg-surface-50 px-2.5 py-1.5">
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
                      className={`h-3.5 w-3.5 text-surface-400 transition-transform ${collapsedGroups.has('free') ? '' : 'rotate-90'}`}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wide text-surface-600">Wolne wątki</span>
                  </button>
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-surface-600 ring-1 ring-inset ring-surface-200">
                    {groupedRows.freeRows.length}
                  </span>
                </div>
                {!collapsedGroups.has('free') && (
                  <ul className="divide-y divide-surface-100">
                    {groupedRows.freeRows.map(({ thread, depth, hasChildren }) => renderThreadRow(thread, depth, hasChildren))}
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

// Export icon for use in CollapsiblePanel
export { GitBranch as ThreadIcon };
