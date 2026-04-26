import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, UserPlus } from 'lucide-react';
import { useCampaign } from '@shared/db/CampaignContext';
import { Modal } from '@shared/components/Modal';
import { ensureSessionDraftLocation } from '../utils/draftScene';
import { toast } from 'sonner';
import { getNpcLifecycleStatus, isPlayerNpc } from '@shared/utils/entityData';
import type { Entity } from '@shared/types';
import { ensureEntitiesAppearInSession, setNpcCurrentLocation } from '../utils/liveSessionCommands';

interface NpcCampaignPickerModalProps {
  sessionId: string;
  locationId: string | null;
  onClose: () => void;
}

function usePickerData(sessionId: string) {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const allNpcs = await db.entities.where('type').equals('npc').toArray();
    const sessionRels = await db.relations
      .where('targetId').equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const inSessionIds = new Set(sessionRels.map((r) => r.sourceId));
    return { allNpcs, inSessionIds };
  }, [db, sessionId]) ?? { allNpcs: [] as Entity[], inSessionIds: new Set<string>() };
}

export function NpcCampaignPickerModal({ sessionId, locationId, onClose }: NpcCampaignPickerModalProps) {
  const { db } = useCampaign();
  const { allNpcs, inSessionIds } = usePickerData(sessionId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const available = allNpcs.filter((n) => !inSessionIds.has(n.id));
  const filtered = query.trim()
    ? available.filter((n) => n.name.toLowerCase().includes(query.toLowerCase()))
    : available;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (!selected.size) return;
    setSaving(true);
    try {
      const targetLocationId = locationId ?? (await ensureSessionDraftLocation(db, sessionId)).id;

      await ensureEntitiesAppearInSession(db, [...selected], sessionId);
      await Promise.all(
        [...selected].map((id) =>
          setNpcCurrentLocation(db, id, targetLocationId, sessionId),
        ),
      );
      toast.success(`Dodano ${selected.size} postaci do sesji i sceny`);
      onClose();
    } catch {
      toast.error('Nie udało się dodać postaci');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Dodaj NPC z kampanii"
      size="md"
      onClose={onClose}
      initialFocusRef={searchRef}
    >
      {/* Search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Szukaj..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-surface-300 py-1.5 pl-7 pr-3 text-sm focus:border-primary-400 focus:outline-none"
        />
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto rounded-md border border-surface-200">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-surface-400">
            {available.length === 0 ? 'Wszyscy NPC są już w sesji' : 'Brak wyników'}
          </p>
        ) : (
          <ul className="divide-y divide-surface-100">
            {filtered.map((npc) => {
              const checked = selected.has(npc.id);
              return (
                <li key={npc.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${
                      checked ? 'bg-primary-50' : 'hover:bg-surface-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(npc.id)}
                      className="h-4 w-4 shrink-0 rounded border-surface-300 accent-primary-600"
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-sm text-surface-800 ${
                        getNpcLifecycleStatus({ data: npc.data }) === 'completed' ? 'opacity-80' : ''
                      }`}
                    >
                      {npc.name}
                    </span>
                    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      {getNpcLifecycleStatus({ data: npc.data }) === 'completed' && (
                        <span className="rounded-full border border-danger-200 bg-danger-50 px-2 py-0.5 text-[10px] font-semibold text-danger-800">
                          Nie żyje
                        </span>
                      )}
                      {isPlayerNpc(npc) && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          Gracz
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-surface-200 pt-4">
        <span className="text-xs text-surface-500">
          {selected.size > 0 ? `Zaznaczono: ${selected.size}` : 'Zaznacz postacie do dodania'}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-50">
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={selected.size === 0 || saving}
            className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Dodaj {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </Modal>
  );
}
