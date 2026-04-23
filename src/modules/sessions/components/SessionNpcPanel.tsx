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
import { toastRemoveEntitySuccess, toastRemoveEntityError } from '@shared/utils/toastSessionEntity';
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
      toast.success(`Postać "${trimmed}" dodana do sesji i przypięta do sceny`);
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
      toast.error('Nie udało się odpiąć ze sceny');
    }
  }

  async function handleAddToLocation(npcId: string) {
    try {
      const targetLocationId = currentLocationId ?? (await ensureSessionDraftLocation(db, sessionId)).id;
      await setNpcCurrentLocation(db, npcId, targetLocationId, sessionId);
    } catch {
      toast.error('Nie udało się przypiąć do sceny');
    }
  }

  async function handleRemoveFromSession(npcId: string, npcName: string) {
    try {
      const removed = await removeEntityFromSession(db, npcId, sessionId);
      if (!removed) return;
      toast.success(toastRemoveEntitySuccess('npc', npcName));
    } catch {
      toast.error(toastRemoveEntityError('npc'));
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
    <div className="flex flex-col rounded-[1.1rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(244,245,241,0.94)]">
      {/* Header toolbar */}
      <div className="rounded-t-[1.1rem] border-b border-[rgba(86,93,94,0.12)] bg-[rgba(244,245,241,0.96)] px-3 py-2.5">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-[0.12em] text-surface-500 uppercase">Postacie w sesji</span>
          <span className="app-pill-muted rounded-full px-2 py-0.5 text-[10px] font-semibold text-surface-600">
            {npcs.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="app-button-secondary flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium whitespace-nowrap"
            title="Dodaj do sesji z kampanii"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Dodaj do sesji
          </button>
          {npcs.length > 0 ? (
            <button
              type="button"
              onClick={() => void handleToggleAll()}
              title={allPinned ? 'Odepnij wszystkich ze sceny' : 'Przypnij wszystkich do sceny'}
              aria-label={allPinned ? 'Odepnij wszystkich ze sceny' : 'Przypnij wszystkich do sceny'}
              className="app-button-secondary flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium whitespace-nowrap"
            >
              {allPinned ? <MapPinOff className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              {allPinned ? 'Odepnij' : 'Przypnij'}
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={() => setQuickAddOpen((v) => !v)}
            className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium whitespace-nowrap transition-colors ${
              quickAddOpen
                ? 'app-button-primary'
                : 'app-button-secondary text-surface-700'
            }`}
            title="Szybkie dodanie postaci do sesji"
          >
            {quickAddOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            Dodaj NPC
          </button>
        </div>
      </div>

      {/* Quick-add form */}
      {quickAddOpen && (
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2 border-b border-[rgba(86,93,94,0.12)] bg-[rgba(244,245,241,0.9)] px-3 py-2.5">
          <input
            type="text"
            placeholder="Imię NPC..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="app-input flex-1 rounded-xl px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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
            className="app-button-primary rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Dodaj do sesji
          </button>
        </form>
      )}

      {/* NPC list */}
      <div className="px-1 py-1">
        {npcs.length === 0 ? (
          <p className="p-6 text-center text-sm text-surface-400">
            Brak postaci w sesji. Dodaj je z kampanii albo szybkim dodaniem.
          </p>
        ) : (
          <div className="space-y-3 px-2 py-2">
            {[
              { key: 'players' as const, label: 'Gracze', items: players },
              { key: 'npcs' as const, label: 'NPC', items: nonPlayers },
            ].map((group) => {
              const isCollapsed = collapsedGroups[group.key];
              return (
              <section key={group.label} className="app-panel overflow-hidden rounded-[1.15rem]">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedGroups((prev) => ({
                      ...prev,
                      [group.key]: !prev[group.key],
                    }))
                  }
                  className="flex w-full items-center justify-between border-b border-[rgba(86,93,94,0.1)] bg-[rgba(223,225,218,0.48)] px-2.5 py-2 text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <ChevronRight className={`h-3.5 w-3.5 text-surface-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                    <span className="text-[11px] font-semibold tracking-[0.14em] text-surface-500 uppercase">{group.label}</span>
                  </span>
                  <span className="app-pill-muted rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-surface-600">
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
                        <li key={npc.id} className="group flex items-center gap-1.5 px-2.5 py-2.5 transition-colors hover:bg-[rgba(229,231,223,0.98)]">
                          <button
                            type="button"
                            title={inLocation ? 'Odepnij ze sceny' : 'Przypnij do sceny'}
                            aria-label={`${inLocation ? 'Odepnij ze sceny' : 'Przypnij do sceny'}: ${npc.name}`}
                            onClick={onPinClick}
                            className={`shrink-0 rounded p-1 transition-colors ${
                              inLocation
                                ? 'text-primary-500 hover:bg-red-50 hover:text-red-500'
                                : 'text-surface-300 hover:bg-surface-100 hover:text-surface-500'
                            }`}
                          >
                            {inLocation
                              ? <MapPinOff className="h-3.5 w-3.5" />
                              : <MapPin className="h-3.5 w-3.5" />
                            }
                          </button>
                          <Link
                            to={`/npcs/${npc.id}`}
                            state={{ returnToSessionLive: sessionId }}
                            className="min-w-0 flex-1 truncate pr-1 text-sm font-medium text-surface-800 hover:text-primary-700"
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
                            aria-label={`Usuń z sesji: ${npc.name}`}
                            onClick={() => void handleRemoveFromSession(npc.id, npc.name)}
                            className="shrink-0 rounded p-1 text-surface-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 hover:bg-red-50 hover:text-red-500"
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
