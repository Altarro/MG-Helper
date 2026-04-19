import { useState } from 'react';
import { MapPin, Clock, AlertTriangle, StickyNote, Users, GitBranch, Plus, Search, X, ExternalLink } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { SpotlightTracker } from './SpotlightTracker';
import { ActiveThreatsPanel } from './ActiveThreatsPanel';
import { SessionTimeline } from './SessionTimeline';
import { LocationTreePanel } from './LocationTreePanel';
import { SessionNpcPanel } from './SessionNpcPanel';
import { QuickNotePanel } from '@modules/notes/components/QuickNotePanel';
import { LocationPickerModal } from './LocationPickerModal';
import { addEntity } from '@shared/db/operations';
import { getThreadData } from '@shared/utils/entityData';
import { isThread, THREAD_COLORS, THREAD_KIND_LABELS, THREAD_KINDS } from '@modules/threads/types';
import { Link } from 'react-router';
import { toast } from 'sonner';
import type { SpotlightState } from '../types';
import type { Thread } from '@modules/threads/types';
import {
  useCurrentSceneNpcIds,
  useLiveLocation,
  useSessionThreadBoard,
  useSessionThreatCount,
  useSessionThreadIds,
  useSessionThreads,
} from '../hooks/useLiveSessionQueries';
import {
  ensureEntitiesAppearInSession,
  ensureEntityAppearsInSession,
  removeEntityFromSession,
  toggleSessionThreadStatus,
} from '../utils/liveSessionCommands';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'spotlight' | 'threats' | 'notes' | 'timeline' | 'map' | 'npcs' | 'threads';

interface Tab { id: TabId; label: string; Icon: LucideIcon }

const TABS: Tab[] = [
  { id: 'npcs',      label: 'NPC',        Icon: Users },
  { id: 'threads',   label: 'Wątki',      Icon: GitBranch },
  { id: 'spotlight', label: 'Spot',       Icon: Users },
  { id: 'threats',   label: 'Zagrożenia', Icon: AlertTriangle },
  { id: 'notes',     label: 'Notatki',    Icon: StickyNote },
  { id: 'timeline',  label: 'Czas',       Icon: Clock },
  { id: 'map',       label: 'Mapa',       Icon: MapPin },
];

const CORE_TABS: TabId[] = ['npcs', 'threads', 'threats'];
const SUPPORT_TABS: TabId[] = ['spotlight', 'notes', 'timeline', 'map'];

const PANEL_KEY = (sessionId: string) => `hud-panel-${sessionId}`;

function loadOpenPanel(sessionId: string): TabId | null {
  try {
    const raw = sessionStorage.getItem(PANEL_KEY(sessionId));
    if (raw === 'null' || !raw) return null;
    return raw as TabId;
  } catch { return null; }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SessionHudTrayProps {
  sessionId: string;
  currentLocationId: string | null;
  onLocationChange: (id: string | null) => void;
  spotlightState: SpotlightState;
  onSpotlightChange: (s: SpotlightState) => void;
  onRequestNameScene?: () => void;
}

function ThreadListRow({
  thread,
  onToggleStatus,
  onRemove,
}: {
  thread: Thread;
  onToggleStatus: (thread: Thread) => void;
  onRemove: (threadId: string, threadName: string) => void;
}) {
  const data = getThreadData(thread);

  return (
    <div className="group flex items-center gap-3 px-3 py-2 hover:bg-surface-50">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: data.color }} />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm text-surface-800">{thread.name}</span>
        {data.kind && (
          <span className="mt-1 inline-flex rounded-full bg-surface-100 px-1.5 py-0.5 text-[10px] font-medium text-surface-600">
            {THREAD_KIND_LABELS[data.kind]}
          </span>
        )}
      </div>
      <button
        onClick={() => onToggleStatus(thread)}
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-75 ${
          data.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-surface-500'
        }`}
        title={data.status === 'active' ? 'Oznacz jako zakonczony' : 'Oznacz jako aktywny'}
      >
        {data.status === 'active' ? 'Aktywny' : 'Zakonczony'}
      </button>
      <Link to={`/threads/${thread.id}`} className="text-surface-300 opacity-0 hover:text-surface-600 group-hover:opacity-100">
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
      <button
        onClick={() => onRemove(thread.id, thread.name)}
        className="text-surface-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
        title="Usun z sesji"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ThreadsPanel({
  sessionId,
  currentLocationId,
}: {
  sessionId: string;
  currentLocationId: string | null;
}) {
  const { db } = useCampaign();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickColor, setQuickColor] = useState<string>(THREAD_COLORS[5]);
  const [quickKind, setQuickKind] = useState<(typeof THREAD_KINDS)[number]>('side');
  const [quickSaving, setQuickSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState<'active' | 'completed' | 'all'>('active');

  const sessionThreads = useSessionThreads(sessionId);
  const threadBoard = useSessionThreadBoard(sessionId);
  const currentLocation = useLiveLocation(currentLocationId);
  const currentSceneNpcIds = useCurrentSceneNpcIds(sessionId, currentLocationId);

  const visible = showCompleted === 'all'
    ? sessionThreads
    : sessionThreads.filter((t) => getThreadData(t).status === showCompleted);
  const visibleThreadIds = new Set(visible.map((thread) => thread.id));
  const visibleThreatGroups = threadBoard.threatGroups
    .map((group) => ({
      ...group,
      threads: group.threads.filter((thread) => visibleThreadIds.has(thread.id)),
    }))
    .filter((group) => group.threads.length > 0);
  const visibleFreeThreads = threadBoard.freeThreads.filter((thread) => visibleThreadIds.has(thread.id));
  const renderLegacyFlatList = false;

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = quickName.trim();
    if (!trimmed || quickSaving) return;
    setQuickSaving(true);
    try {
      const thread = await addEntity(db, {
        type: 'thread', name: trimmed, description: '', tags: [],
        data: { color: quickColor, status: 'active', kind: quickKind, priority: 'normal', resolution: '' },
      });
      await ensureEntityAppearsInSession(db, thread.id, sessionId);
      toast.success(`Wątek „${trimmed}" dodany`);
      setQuickName('');
      setQuickKind('side');
      setQuickAddOpen(false);
    } catch {
      toast.error('Nie udało się dodać wątku');
    } finally {
      setQuickSaving(false);
    }
  }

  async function handleRemove(threadId: string, threadName: string) {
    try {
      const removed = await removeEntityFromSession(db, threadId, sessionId);
      if (!removed) return;
      toast.success(`„${threadName}" usunięty z sesji`);
    } catch {
      toast.error('Nie udało się usunąć');
    }
  }

  async function handleToggleStatus(thread: Thread) {
    try {
      await toggleSessionThreadStatus(db, thread);
    } catch {
      toast.error('Nie udało się zmienić statusu');
    }
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-surface-100 px-3 py-2">
        <div className="flex rounded-lg border border-surface-200 overflow-hidden text-xs">
          {(['active', 'completed', 'all'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setShowCompleted(opt)}
              className={`px-2.5 py-1 font-medium transition-colors ${
                showCompleted === opt
                  ? 'bg-surface-800 text-white'
                  : 'text-surface-500 hover:bg-surface-50'
              }`}
            >
              {opt === 'active' ? 'Aktywne' : opt === 'completed' ? 'Zamknięte' : 'Wszystkie'}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setQuickAddOpen((v) => !v)}
          className="flex items-center gap-1 rounded-md border border-surface-200 px-2 py-1 text-xs text-surface-600 hover:bg-surface-50"
        >
          <Plus className="h-3 w-3" /> Nowy
        </button>
        <button
          onClick={() => setCampaignPickerOpen(true)}
          className="flex items-center gap-1 rounded-md border border-surface-200 px-2 py-1 text-xs text-surface-600 hover:bg-surface-50"
        >
          <Search className="h-3 w-3" /> Z kampanii
        </button>
      </div>

      {/* Quick-add form */}
      {quickAddOpen && (
        <form onSubmit={(e) => { void handleQuickAdd(e); }} className="flex flex-col gap-2 border-b border-surface-100 px-3 py-2">
          <div className="flex gap-1">
            {THREAD_COLORS.map((c) => (
              <button
                key={c} type="button"
                onClick={() => setQuickColor(c)}
                className="h-4 w-4 rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: c, outline: quickColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {THREAD_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setQuickKind(kind)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  quickKind === kind
                    ? 'bg-primary-600 text-white'
                    : 'border border-surface-300 text-surface-600 hover:bg-surface-50'
                }`}
              >
                {THREAD_KIND_LABELS[kind]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              autoFocus value={quickName} onChange={(e) => setQuickName(e.target.value)}
              placeholder="Nazwa wątku…"
              className="flex-1 rounded border border-surface-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
            />
            <button type="submit" disabled={!quickName.trim() || quickSaving}
              className="rounded bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {quickSaving ? '…' : 'Dodaj'}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickAddOpen(false);
                setQuickName('');
                setQuickKind('side');
              }}
              className="text-surface-400 hover:text-surface-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-surface-400">
              {sessionThreads.length === 0 ? 'Brak wątków w tej sesji' : 'Brak aktywnych wątków'}
            </p>
          </div>
        )}
        {visible.length > 0 && (
          <div className="flex flex-col gap-4 px-3 py-3">
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500">
                Kontekst sceny
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-surface-700">
                <span className="rounded-full bg-white px-2 py-1 ring-1 ring-surface-200">
                  Lokacja: {currentLocation?.name ?? 'Pusta scena'}
                </span>
                <span className="rounded-full bg-white px-2 py-1 ring-1 ring-surface-200">
                  NPC na scenie: {currentSceneNpcIds.length}
                </span>
                <span className="rounded-full bg-white px-2 py-1 ring-1 ring-surface-200">
                  Watki w sesji: {visible.length}
                </span>
              </div>
              <p className="mt-2 text-xs text-surface-500">
                Kolejnosc przy stole pozostaje czytelna: lokacja, potem NPC, a watki sa warstwa wsparcia dla sceny.
              </p>
            </div>

            {visibleThreatGroups.map((group) => (
              <section key={group.threat.id} className="overflow-hidden rounded-xl border border-amber-200 bg-white">
                <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      Zagrozenie
                    </p>
                    <p className="truncate text-sm font-medium text-surface-900">{group.threat.name}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                    {group.threads.length}
                  </span>
                </div>
                <div className="divide-y divide-surface-100">
                  {group.threads.map((thread) => (
                    <ThreadListRow
                      key={`${group.threat.id}-${thread.id}`}
                      thread={thread}
                      onToggleStatus={(item) => { void handleToggleStatus(item); }}
                      onRemove={(threadId, threadName) => { void handleRemove(threadId, threadName); }}
                    />
                  ))}
                </div>
              </section>
            ))}

            {visibleFreeThreads.length > 0 && (
              <section className="overflow-hidden rounded-xl border border-surface-200 bg-white">
                <div className="flex items-center justify-between border-b border-surface-100 bg-surface-50 px-3 py-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500">
                      Wolne watki
                    </p>
                    <p className="text-sm font-medium text-surface-900">
                      Watki przypiete do sesji, ale jeszcze bez powiazanego zagrozenia
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-surface-600 ring-1 ring-surface-200">
                    {visibleFreeThreads.length}
                  </span>
                </div>
                <div className="divide-y divide-surface-100">
                  {visibleFreeThreads.map((thread) => (
                    <ThreadListRow
                      key={thread.id}
                      thread={thread}
                      onToggleStatus={(item) => { void handleToggleStatus(item); }}
                      onRemove={(threadId, threadName) => { void handleRemove(threadId, threadName); }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
        {renderLegacyFlatList && visible.map((thread) => {
          const data = getThreadData(thread);
          return (
            <div key={thread.id} className="group flex items-center gap-3 px-3 py-2 hover:bg-surface-50">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: data.color }} />
              <span className="flex-1 min-w-0 truncate text-sm text-surface-800">{thread.name}</span>
              <button
                onClick={() => { void handleToggleStatus(thread); }}
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-75 ${
                  data.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-surface-500'
                }`}
                title={data.status === 'active' ? 'Oznacz jako zakończony' : 'Oznacz jako aktywny'}
              >
                {data.status === 'active' ? 'Aktywny' : 'Zakończony'}
              </button>
              <Link to={`/threads/${thread.id}`} className="text-surface-300 hover:text-surface-600 opacity-0 group-hover:opacity-100">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => { void handleRemove(thread.id, thread.name); }}
                className="text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                title="Usuń z sesji"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Campaign picker overlay */}
      {campaignPickerOpen && (
        <ThreadCampaignPickerHud sessionId={sessionId} onClose={() => setCampaignPickerOpen(false)} />
      )}
    </div>
  );
}

function ThreadCampaignPickerHud({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { allThreads, inSessionIds } = useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('thread').toArray();
    const allThreads = all.filter(isThread);
    const rels = await db.relations.where('targetId').equals(sessionId).filter((r) => r.type === 'appears_in').toArray();
    const inSessionIds = new Set(rels.map((r) => r.sourceId));
    allThreads.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    return { allThreads, inSessionIds };
  }, [db, sessionId]) ?? { allThreads: [] as Thread[], inSessionIds: new Set<string>() };

  const available = allThreads.filter((t) => !inSessionIds.has(t.id));
  const filtered = query.trim()
    ? available.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : available;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAdd() {
    if (!selected.size) return;
    setSaving(true);
    try {
      await ensureEntitiesAppearInSession(db, [...selected], sessionId);
      toast.success(`Dodano ${selected.size} wątk${selected.size === 1 ? 'ątek' : 'i'} do sesji`);
      onClose();
    } catch {
      toast.error('Nie udało się dodać wątków');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-b-xl border-t border-surface-200 bg-white shadow-lg" style={{ maxHeight: 300 }}>
      <div className="flex items-center justify-between border-b border-surface-100 px-3 py-2">
        <span className="text-xs font-semibold text-surface-700">Dodaj wątek z kampanii</span>
        <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="px-3 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj…"
            className="w-full rounded border border-surface-300 py-1 pl-7 pr-2 text-xs focus:border-primary-500 focus:outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {filtered.length === 0 && <p className="py-3 text-center text-xs text-surface-400">Brak wątków do dodania</p>}
        {filtered.map((t) => {
          const color = getThreadData(t).color ?? '#6366f1';
          return (
            <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded py-1.5 hover:bg-surface-50">
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="h-3 w-3 rounded accent-primary-600" />
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="flex-1 truncate text-xs text-surface-700">{t.name}</span>
            </label>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 border-t border-surface-100 px-3 py-2">
        <button onClick={onClose} className="rounded border border-surface-300 px-2 py-1 text-xs text-surface-600 hover:bg-surface-50">Anuluj</button>
        <button onClick={() => { void handleAdd(); }} disabled={!selected.size || saving}
          className="rounded bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">
          {saving ? '…' : `Dodaj (${selected.size})`}
        </button>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SessionHudTray({
  sessionId, currentLocationId, onLocationChange, spotlightState, onSpotlightChange, onRequestNameScene,
}: SessionHudTrayProps) {
  const [openPanel, setOpenPanel] = useState<TabId | null>(() => loadOpenPanel(sessionId));
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  function togglePanel(id: TabId) {
    setOpenPanel((prev) => {
      const next = prev === id ? null : id;
      try { sessionStorage.setItem(PANEL_KEY(sessionId), String(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const currentLocation = useLiveLocation(currentLocationId);
  const activeThreatCount = useSessionThreatCount(sessionId);
  const sceneNpcIds = useCurrentSceneNpcIds(sessionId, currentLocationId);
  const sessionThreadIds = useSessionThreadIds(sessionId);
  const tabMap = new Map(TABS.map((tab) => [tab.id, tab] as const));

  return (
    <div className="fixed bottom-5 left-4 right-4 z-20 rounded-2xl border border-surface-200/90 bg-white/95 shadow-lg backdrop-blur-sm lg:left-[17rem]">
      {/* Expandable panel — only rendered when open to avoid background timers */}
      <div className="overflow-hidden transition-all duration-200" style={{ maxHeight: openPanel ? 340 : 0 }}>
        {openPanel && (
          <div className="h-[340px] overflow-y-auto border-b border-surface-200/80 bg-surface-50/70">
            {openPanel === 'threads' && <ThreadsPanel sessionId={sessionId} currentLocationId={currentLocationId} />}
            {openPanel === 'spotlight' && (
              <div className="p-3">
                <SpotlightTracker sessionId={sessionId} state={spotlightState} onChange={onSpotlightChange} />
              </div>
            )}
            {openPanel === 'threats' && (
              <div className="p-3">
                <ActiveThreatsPanel sessionId={sessionId} />
              </div>
            )}
            {openPanel === 'notes' && (
              <div className="p-3">
                <QuickNotePanel
                  sessionId={sessionId}
                  contextLocationId={currentLocationId}
                  contextNpcIds={sceneNpcIds}
                  contextThreadIds={sessionThreadIds}
                />
              </div>
            )}
            {openPanel === 'timeline' && (
              <SessionTimeline sessionId={sessionId} />
            )}
            {openPanel === 'map' && (
              <div className="h-full overflow-y-auto p-3">
                <LocationTreePanel
                  sessionId={sessionId}
                  activeLocationId={currentLocationId}
                  onSelectLocation={onLocationChange}
                />
              </div>
            )}
            {openPanel === 'npcs' && (
              <div className="h-full overflow-hidden rounded-xl border border-surface-200 bg-white">
                <SessionNpcPanel sessionId={sessionId} currentLocationId={currentLocationId} onRequestNameScene={onRequestNameScene} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar — always visible */}
      <div className="flex h-11 items-center gap-2 px-3 text-xs">
        {/* Location */}
        <button
          type="button"
          onClick={() => setLocationPickerOpen(true)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
            currentLocation
              ? 'bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800'
              : 'text-surface-600 hover:bg-surface-100 hover:text-surface-800'
          }`}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-green-600" />
          <span className="max-w-[140px] truncate">{currentLocation?.name ?? 'Pusta scena'}</span>
        </button>

        {/* Core actions */}
        <div className="ml-1 flex items-center gap-1 rounded-lg border border-surface-200 bg-white px-1 py-1">
          {CORE_TABS.map((id) => {
            const tab = tabMap.get(id);
            if (!tab) return null;
            const { label, Icon } = tab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePanel(id)}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors ${
                  openPanel === id
                    ? 'bg-primary-600 text-white shadow-sm ring-1 ring-primary-500/40'
                    : 'text-surface-500 hover:bg-surface-100 hover:text-surface-800'
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-surface-200" aria-hidden="true" />

        {/* Support actions */}
        <div className="flex items-center gap-1">
          {SUPPORT_TABS.map((id) => {
            const tab = tabMap.get(id);
            if (!tab) return null;
            const { label } = tab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePanel(id)}
                className={`rounded px-2 py-0.5 text-xs transition-colors ${
                  openPanel === id
                    ? 'bg-primary-600 text-white shadow-sm ring-1 ring-primary-500/40'
                    : 'text-surface-500 hover:bg-surface-100 hover:text-surface-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Threat counter */}
        {activeThreatCount > 0 && (
          <span className="ml-1 flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-amber-700 ring-1 ring-amber-200/70">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {activeThreatCount}
          </span>
        )}

        <div className="flex-1" />
      </div>

      {locationPickerOpen && (
        <LocationPickerModal
          sessionId={sessionId}
          currentLocationId={currentLocationId}
          onSelect={onLocationChange}
          onClose={() => setLocationPickerOpen(false)}
        />
      )}
    </div>
  );
}
