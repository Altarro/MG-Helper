import { useState, useRef, type RefObject } from 'react';
import { Plus, X, Search, UserPlus, Milestone } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { addEntity, addRelation } from '@shared/db/operations';
import { ensureSessionDraftLocation } from '../utils/draftScene';
import { AnchoredPanel } from '@shared/components/AnchoredPanel';
import { useDebounce } from '@shared/hooks/useDebounce';
import { isPlayerNpc } from '@shared/utils/entityData';
import { toast } from 'sonner';
import type { Entity } from '@shared/types';
import { setNpcCurrentLocation } from '../utils/liveSessionCommands';

// ── AddFromCampaignPanel ──────────────────────────────────────────────────────
// Full-width panel listing all campaign NPCs not yet in session, with live search

interface AddFromCampaignPanelProps {
  anchorRef: RefObject<HTMLElement | null>;
  sessionId: string;
  onClose: () => void;
  onAdded: (entityId: string) => void;
}

function AddFromCampaignPanel({ anchorRef, sessionId, onClose, onAdded }: AddFromCampaignPanelProps) {
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 150);

  const sessionNpcIds = useLiveQuery(async () => {
    const rels = await db.relations.where('targetId').equals(sessionId)
      .filter((r) => r.type === 'appears_in').toArray();
    return new Set(rels.map((r) => r.sourceId));
  }, [db, sessionId]) ?? new Set<string>();

  const allNpcs = useLiveQuery(
    () => db.entities.where('type').equals('npc').toArray(),
    [db],
  ) ?? [];

  const available = allNpcs.filter((e) => !sessionNpcIds.has(e.id));
  const q = debouncedQuery.toLowerCase().trim();
  const filtered = q ? available.filter((e) => e.name.toLowerCase().includes(q)) : available;
  const pcs = filtered.filter((e) => isPlayerNpc(e));
  const npcs = filtered.filter((e) => !isPlayerNpc(e));

  async function handleAdd(npc: Entity) {
    try {
      await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: sessionId });
      toast.success(`${npc.name} dodany do sesji`);
      onAdded(npc.id);
    } catch {
      toast.error('Nie udało się dodać postaci');
    }
  }

  function NpcRow({ npc }: { npc: Entity }) {
    const isPC = isPlayerNpc(npc);
    const playerName = (npc.data as { playerName?: string }).playerName;
    return (
      <button
        type="button"
        onClick={() => void handleAdd(npc)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-50"
      >
        <span className="flex-1 min-w-0">
          <span className="block truncate font-medium text-surface-800">{npc.name}</span>
          {playerName && <span className="block truncate text-xs text-surface-400">{playerName}</span>}
        </span>
        {isPC && (
          <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">Gracz</span>
        )}
      </button>
    );
  }

  return (
    <AnchoredPanel anchorRef={anchorRef} onClose={onClose} placement="bottom-start">
      <div className="w-80 rounded-lg border border-surface-200 bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-surface-100 px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-surface-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj postaci…"
            className="flex-1 text-sm outline-none placeholder:text-surface-400"
          />
          <button type="button" onClick={onClose} className="text-surface-400 hover:text-surface-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="px-3 py-3 text-xs text-surface-400">
              {q ? 'Brak wyników' : 'Wszystkie postacie kampanii już są w sesji'}
            </p>
          )}
          {pcs.length > 0 && (
            <>
              <p className="px-3 pb-0.5 pt-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
                Postacie graczy
              </p>
              {pcs.map((npc) => <NpcRow key={npc.id} npc={npc} />)}
            </>
          )}
          {npcs.length > 0 && (
            <>
              <p className="px-3 pb-0.5 pt-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
                Postacie niezależne
              </p>
              {npcs.map((npc) => <NpcRow key={npc.id} npc={npc} />)}
            </>
          )}
        </div>
      </div>
    </AnchoredPanel>
  );
}

// ── ThreadPickerPanel ─────────────────────────────────────────────────────────

interface ThreadPickerPanelProps {
  anchorRef: RefObject<HTMLElement | null>;
  sessionId: string;
  onClose: () => void;
}

function ThreadPickerPanel({ anchorRef, sessionId, onClose }: ThreadPickerPanelProps) {
  const { db } = useCampaign();

  const sessionThreadIds = useLiveQuery(async () => {
    const rels = await db.relations.where('targetId').equals(sessionId)
      .filter((r) => r.type === 'appears_in').toArray();
    const ids = rels.map((r) => r.sourceId);
    const entities = await Promise.all(ids.map((id) => db.entities.get(id)));
    return new Set(entities.filter((e) => e?.type === 'thread').map((e) => e!.id));
  }, [db, sessionId]) ?? new Set<string>();

  const allThreads = useLiveQuery(
    () => db.entities.where('type').equals('thread').toArray(),
    [db],
  ) ?? [];

  async function handleToggle(thread: Entity) {
    if (sessionThreadIds.has(thread.id)) return; // already added — no-op
    try {
      await addRelation(db, { type: 'appears_in', sourceId: thread.id, targetId: sessionId });
      toast.success(`Wątek „${thread.name}" dodany do sesji`);
    } catch {
      toast.error('Nie udało się dodać wątku');
    }
  }

  return (
    <AnchoredPanel anchorRef={anchorRef} onClose={onClose} placement="bottom-start">
      <div className="w-72 rounded-lg border border-surface-200 bg-white shadow-xl">
        <div className="border-b border-surface-100 px-3 py-2">
          <p className="text-xs font-semibold text-surface-600">Wątki kampanii</p>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {allThreads.length === 0 ? (
            <p className="px-3 py-3 text-xs text-surface-400">Brak wątków w kampanii</p>
          ) : (
            allThreads.map((thread) => {
              const inSession = sessionThreadIds.has(thread.id);
              return (
                <button
                  key={thread.id}
                  type="button"
                  disabled={inSession}
                  onClick={() => void handleToggle(thread)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm disabled:opacity-50"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${inSession ? 'bg-primary-500' : 'bg-surface-200'}`} />
                  <span className="flex-1 truncate text-surface-800">{thread.name}</span>
                  {inSession && (
                    <span className="shrink-0 text-xs text-primary-500">W sesji</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </AnchoredPanel>
  );
}

// ── InlineCreateNpc ───────────────────────────────────────────────────────────
// Small inline form to create a new NPC and add it directly to the session

interface InlineCreateNpcProps {
  anchorRef: RefObject<HTMLElement | null>;
  sessionId: string;
  currentLocationId: string | null;
  onClose: () => void;
  onCreated: (entityId: string) => void;
}

function InlineCreateNpc({ anchorRef, sessionId, currentLocationId, onClose, onCreated }: InlineCreateNpcProps) {
  const { db } = useCampaign();
  const [name, setName] = useState('');
  const [isPC, setIsPC] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const targetLocationId = currentLocationId ?? (await ensureSessionDraftLocation(db, sessionId)).id;
      const entity = await addEntity(db, {
        type: 'npc',
        name: trimmed,
        description: '',
        tags: [],
        data: { instinct: '', motivation: '', appearance: '', playStyle: '', isPC, playerName: '' },
      });
      await addRelation(db, { type: 'appears_in', sourceId: entity.id, targetId: sessionId });
      await setNpcCurrentLocation(db, entity.id, targetLocationId, sessionId);
      toast.success(`„${trimmed}" dodana do sesji i sceny`);
      onCreated(entity.id);
    } catch {
      toast.error('Nie udało się dodać postaci');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnchoredPanel anchorRef={anchorRef} onClose={onClose} placement="bottom-start">
      <div className="w-72 rounded-lg border border-surface-200 bg-white p-3 shadow-xl">
        <p className="mb-2 text-xs font-semibold text-surface-600">Nowa postać</p>
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
          placeholder="Imię postaci…"
          className="mb-2 w-full rounded border border-surface-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
        />
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-surface-600">
          <input
            type="checkbox"
            checked={isPC}
            onChange={(e) => setIsPC(e.target.checked)}
            className="rounded"
          />
          Postać gracza
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving || !name.trim()}
            className="flex-1 rounded bg-primary-500 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? '…' : 'Dodaj'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-surface-300 px-3 py-1.5 text-xs text-surface-600 hover:bg-surface-50"
          >
            Anuluj
          </button>
        </div>
      </div>
    </AnchoredPanel>
  );
}

// ── ScenePillsRow ─────────────────────────────────────────────────────────────
// Shows open scene cards as pills (max 4 LRU) + create NPC + add from campaign

interface ScenePillsRowProps {
  sessionId: string;
  currentLocationId: string | null;
  openCardIds: string[];
  onOpenCard: (id: string) => void;
  onCloseCard: (id: string) => void;
}

export function ScenePillsRow({
  sessionId,
  currentLocationId,
  openCardIds,
  onOpenCard,
  onCloseCard,
}: ScenePillsRowProps) {
  const { db } = useCampaign();
  const [showAddFromCampaign, setShowAddFromCampaign] = useState(false);
  const [showCreateNpc, setShowCreateNpc] = useState(false);
  const [showThreadPicker, setShowThreadPicker] = useState(false);
  const createNpcRef = useRef<HTMLButtonElement>(null);
  const addFromCampaignRef = useRef<HTMLButtonElement>(null);
  const threadPickerRef = useRef<HTMLButtonElement>(null);

  // Load entity names for open cards
  const openEntities = useLiveQuery(async () => {
    if (openCardIds.length === 0) return [];
    return db.entities.where('id').anyOf(openCardIds).toArray();
  }, [db, openCardIds]) ?? [];

  const entityMap = new Map(openEntities.map((e) => [e.id, e]));

  return (
    <div className="relative flex items-center gap-1.5 overflow-x-auto px-3 py-1.5 border-b border-surface-200 bg-surface-50">
      {/* Open card pills */}
      {openCardIds.map((id) => {
        const entity = entityMap.get(id);
        if (!entity) return null;
        return (
          <div
            key={id}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white border border-surface-200 px-2.5 py-0.5 text-xs font-medium text-surface-700 shadow-sm"
          >
            <button
              type="button"
              onClick={() => onOpenCard(id)}
              className="max-w-[100px] truncate hover:text-primary-700"
            >
              {entity.name}
            </button>
            <button
              type="button"
              onClick={() => onCloseCard(id)}
              aria-label="Zamknij kartę"
              className="text-surface-400 hover:text-surface-700"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {/* Create new NPC */}
      <button
        ref={createNpcRef}
        type="button"
        onClick={() => { setShowCreateNpc((v) => !v); setShowAddFromCampaign(false); setShowThreadPicker(false); }}
        className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-surface-300 px-2.5 py-0.5 text-xs text-surface-500 hover:border-primary-400 hover:text-primary-600"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Nowa postać</span>
      </button>
      {showCreateNpc && (
        <InlineCreateNpc
          anchorRef={createNpcRef}
          sessionId={sessionId}
          currentLocationId={currentLocationId}
          onClose={() => setShowCreateNpc(false)}
          onCreated={(id) => { onOpenCard(id); setShowCreateNpc(false); }}
        />
      )}

      {/* Add existing NPC from campaign */}
      <button
        ref={addFromCampaignRef}
        type="button"
        onClick={() => { setShowAddFromCampaign((v) => !v); setShowCreateNpc(false); setShowThreadPicker(false); }}
        className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-surface-300 px-2.5 py-0.5 text-xs text-surface-500 hover:border-primary-400 hover:text-primary-600"
      >
        <UserPlus className="h-3.5 w-3.5" />
        <span>Dodaj z kampanii</span>
      </button>
      {showAddFromCampaign && (
        <AddFromCampaignPanel
          anchorRef={addFromCampaignRef}
          sessionId={sessionId}
          onClose={() => setShowAddFromCampaign(false)}
          onAdded={(id) => { onOpenCard(id); }}
        />
      )}

      {/* Add thread to session */}
      <button
        ref={threadPickerRef}
        type="button"
        onClick={() => { setShowThreadPicker((v) => !v); setShowCreateNpc(false); setShowAddFromCampaign(false); }}
        className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-surface-300 px-2.5 py-0.5 text-xs text-surface-500 hover:border-primary-400 hover:text-primary-600"
      >
        <Milestone className="h-3.5 w-3.5" />
        <span>Wątek</span>
      </button>
      {showThreadPicker && (
        <ThreadPickerPanel
          anchorRef={threadPickerRef}
          sessionId={sessionId}
          onClose={() => setShowThreadPicker(false)}
        />
      )}
    </div>
  );
}
