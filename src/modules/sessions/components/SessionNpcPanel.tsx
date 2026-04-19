import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { UserPlus, Plus, X, MapPin, MapPinOff, ChevronRight } from 'lucide-react';
import { useCampaign } from '@shared/db/CampaignContext';
import {
  addEntity,
  addRelation,
  deleteRelation,
} from '@shared/db/operations';
import { ensureSessionDraftLocation } from '../utils/draftScene';
import { NpcCampaignPickerModal } from './NpcCampaignPickerModal';
import { toast } from 'sonner';
import { useContainedNpcs, useSessionNpcPanelData } from '../hooks/useLiveSessionQueries';
import { isPlayerNpc } from '@shared/utils/entityData';
import {
  ensureEntityAppearsInSession,
  removeEntityFromSession,
  setNpcCurrentLocation,
} from '../utils/liveSessionCommands';

interface SessionNpcPanelProps {
  sessionId: string;
  currentLocationId: string | null;
  onRequestNameScene?: () => void;
}

export function SessionNpcPanel({ sessionId, currentLocationId, onRequestNameScene: _onRequestNameScene }: SessionNpcPanelProps) {
  const { db } = useCampaign();
  const { npcs, locationRelIds, draftRelIds } = useSessionNpcPanelData(sessionId, currentLocationId);
  const locationNpcs = useContainedNpcs(currentLocationId);
  const [autoAddedIds, setAutoAddedIds] = useState<Set<string>>(new Set());
  const processedAutoAddRef = useRef<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<{ players: boolean; npcs: boolean }>({
    players: false,
    npcs: false,
  });

  // Reaktywny auto-add: NPC obecni w aktywnej lokacji → auto-dodaj do sesji
  useEffect(() => {
    if (!locationNpcs.length) return;
    const sessionNpcIdSet = new Set(npcs.map((n) => n.id));
    const toAdd = locationNpcs.filter(
      (npc) => !sessionNpcIdSet.has(npc.id) && !processedAutoAddRef.current.has(npc.id),
    );
    if (!toAdd.length) return;
    toAdd.forEach((npc) => processedAutoAddRef.current.add(npc.id));

    void (async () => {
      const added: string[] = [];
      const newlyAdded: string[] = [];
      await Promise.all(
        toAdd.map(async (npc) => {
          try {
            const addedToSession = await ensureEntityAppearsInSession(db, npc.id, sessionId);
            if (addedToSession) {
              newlyAdded.push(npc.id);
            }
            added.push(npc.id);
          } catch { /* ignore */ }
        }),
      );
      if (added.length > 0) {
        setAutoAddedIds((prev) => new Set([...prev, ...added]));
      }
      if (newlyAdded.length > 0) {
        const names = toAdd
          .filter((npc) => newlyAdded.includes(npc.id))
          .map((npc) => npc.name)
          .join(', ');
        toast.success(`Dodano do sesji: ${names}`);
      }
    })();
  }, [locationNpcs, npcs, db, sessionId]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [isPC, setIsPC] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const targetLocationId = currentLocationId ?? (await ensureSessionDraftLocation(db, sessionId)).id;
      const npc = await addEntity(db, {
        type: 'npc',
        name: trimmed,
        description: '',
        tags: [],
        data: { instinct: '', motivation: '', appearance: '', playStyle: '', playerName: '', isPC },
      });
      await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: sessionId });
      await setNpcCurrentLocation(db, npc.id, targetLocationId, sessionId);
      toast.success(`${trimmed} dodany do sesji i sceny`);
      setName('');
      setIsPC(false);
      setQuickAddOpen(false);
    } catch {
      toast.error('Nie udało się dodać postaci');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFromLocation(npcId: string) {
    try {
      await setNpcCurrentLocation(db, npcId, null);
    } catch {
      toast.error('Nie udało się usunąć ze sceny');
    }
  }

  async function handleAddToLocation(npcId: string) {
    try {
      const targetLocationId = currentLocationId ?? (await ensureSessionDraftLocation(db, sessionId)).id;
      await setNpcCurrentLocation(db, npcId, targetLocationId, sessionId);
    } catch {
      toast.error('Nie udało się dodać do sceny');
    }
  }

  async function handleRemoveFromSession(npcId: string, npcName: string) {
    try {
      const removed = await removeEntityFromSession(db, npcId, sessionId);
      if (!removed) return;
      toast.success(`${npcName} usunięty z sesji`);
    } catch {
      toast.error('Nie udało się usunąć z sesji');
    }
  }

  async function handleToggleAll() {
    try {
      const targetLocationId = currentLocationId ?? (await ensureSessionDraftLocation(db, sessionId)).id;
      const everyPinned = npcs.length > 0 && npcs.every((n) =>
        currentLocationId === null ? draftRelIds.has(n.id) : locationRelIds.has(n.id),
      );
      if (everyPinned) {
        const relIds = npcs
          .map((n) => currentLocationId === null ? draftRelIds.get(n.id) : locationRelIds.get(n.id))
          .filter((id): id is string => id !== undefined);
        await Promise.all(relIds.map((id) => deleteRelation(db, id)));
      } else {
        const notPinned = npcs.filter(
          (n) => !(currentLocationId === null ? draftRelIds.has(n.id) : locationRelIds.has(n.id)),
        );
        await Promise.all(
          notPinned.map((n) =>
            setNpcCurrentLocation(db, n.id, targetLocationId, sessionId),
          ),
        );
      }
    } catch {
      toast.error('Nie udało się zaktualizować sceny');
    }
  }

  const allPinned = npcs.length > 0 && npcs.every((n) =>
    currentLocationId === null ? draftRelIds.has(n.id) : locationRelIds.has(n.id),
  );
  const players = npcs.filter((npc) => isPlayerNpc(npc));
  const nonPlayers = npcs.filter((npc) => !isPlayerNpc(npc));

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header toolbar */}
      <div className="border-b border-surface-200 bg-surface-50 px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-surface-500">Postacie w sesji</span>
          <span className="rounded-full bg-surface-200 px-2 py-0.5 text-[10px] font-semibold text-surface-600">
            {npcs.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center justify-center gap-1 rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-700 transition-colors hover:bg-surface-50"
            title="Dodaj z kampanii"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Z kampanii
          </button>
          {npcs.length > 0 ? (
            <button
              type="button"
              onClick={() => void handleToggleAll()}
              title={allPinned ? 'Usuń wszystkich ze sceny' : 'Dodaj wszystkich do sceny'}
              className="flex items-center justify-center gap-1 rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-700 transition-colors hover:bg-surface-50"
            >
              {allPinned ? <MapPinOff className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              Wszyscy
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={() => setQuickAddOpen((v) => !v)}
            className={`flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
              quickAddOpen
                ? 'border-primary-400 bg-primary-50 text-primary-700'
                : 'border-surface-300 bg-white text-surface-700 hover:bg-surface-50'
            }`}
            title="Szybki NPC"
          >
            {quickAddOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            Dodaj NPC
          </button>
        </div>
      </div>

      {/* Quick-add form */}
      {quickAddOpen && (
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2 border-b border-surface-200 bg-surface-50/70 px-3 py-2">
          <input
            type="text"
            placeholder="Imię NPC..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="flex-1 rounded border border-surface-300 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none"
          />
          <label className="flex items-center gap-1 text-xs text-surface-600 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={isPC}
              onChange={(e) => setIsPC(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary-600"
            />
            Gracz
          </label>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="rounded-md bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Dodaj
          </button>
        </form>
      )}

      {/* NPC list */}
      <div className="flex-1 overflow-y-auto">
        {npcs.length === 0 ? (
          <p className="p-6 text-center text-sm text-surface-400">Brak postaci w sesji</p>
        ) : (
          <div className="space-y-3 px-2 py-2">
            {[
              { key: 'players' as const, label: 'Gracze', items: players },
              { key: 'npcs' as const, label: 'NPC', items: nonPlayers },
            ].map((group) => {
              const isCollapsed = collapsedGroups[group.key];
              return (
              <section key={group.label} className="overflow-hidden rounded-lg border border-surface-200">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedGroups((prev) => ({
                      ...prev,
                      [group.key]: !prev[group.key],
                    }))
                  }
                  className="flex w-full items-center justify-between bg-surface-50 px-2.5 py-1.5 text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <ChevronRight className={`h-3.5 w-3.5 text-surface-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-surface-500">{group.label}</span>
                  </span>
                  <span className="rounded-full bg-surface-200 px-1.5 py-0.5 text-[10px] font-semibold text-surface-600">
                    {group.items.length}
                  </span>
                </button>
                {isCollapsed ? null : group.items.length === 0 ? (
                  <p className="px-2.5 py-2 text-xs text-surface-400">Brak</p>
                ) : (
                  <ul className="divide-y divide-surface-100">
                    {group.items.map((npc) => {
                      const inLocation = currentLocationId === null
                        ? draftRelIds.has(npc.id)
                        : locationRelIds.has(npc.id);

                      const onPinClick = inLocation
                        ? () => handleRemoveFromLocation(npc.id)
                        : () => handleAddToLocation(npc.id);

                      return (
                        <li key={npc.id} className="group flex items-center gap-2 px-3 py-2 hover:bg-surface-50">
                          <button
                            type="button"
                            title={inLocation
                              ? currentLocationId === null ? 'Usuń z pustej sceny' : 'Usuń ze sceny'
                              : currentLocationId === null ? 'Dodaj do pustej sceny' : 'Dodaj do sceny'
                            }
                            onClick={onPinClick}
                            className={`shrink-0 rounded p-1 transition-colors ${
                              inLocation
                                ? 'text-primary-500 hover:bg-red-50 hover:text-red-500'
                                : 'text-surface-300 hover:bg-surface-100 hover:text-surface-500'
                            }`}
                          >
                            {inLocation
                              ? <MapPin className="h-3.5 w-3.5" />
                              : <MapPinOff className="h-3.5 w-3.5" />
                            }
                          </button>
                          <Link
                            to={`/npcs/${npc.id}`}
                            state={{ returnToSessionLive: sessionId }}
                            className="flex-1 truncate text-sm font-medium text-surface-800 hover:text-primary-700"
                          >
                            {npc.name}
                          </Link>
                          {isPlayerNpc(npc) && (
                            <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Gracz</span>
                          )}
                          {autoAddedIds.has(npc.id) && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Dodano do sesji</span>
                          )}
                          <button
                            type="button"
                            title="Usuń z sesji"
                            onClick={() => void handleRemoveFromSession(npc.id, npc.name)}
                            className="shrink-0 rounded p-1 text-surface-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              );
            })}
          </div>
        )}
      </div>

      {pickerOpen && (
        <NpcCampaignPickerModal sessionId={sessionId} locationId={currentLocationId} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
