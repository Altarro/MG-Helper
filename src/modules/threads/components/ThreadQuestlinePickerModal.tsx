import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { addRelation } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { useEntitiesByType } from '@shared/hooks/useEntitiesByType';
import { useDebounce } from '@shared/hooks/useDebounce';
import { getReadableRelationErrorMessage } from '@shared/utils/relationErrorMessage';
import {
  getThreadDerivationKindLabel,
  THREAD_DERIVATION_KIND_DESCRIPTIONS,
  THREAD_DERIVATION_KIND_LABELS,
  THREAD_DERIVATION_KIND_OPTIONS,
} from '@shared/domain/storyContracts';
import { Modal } from '@shared/components/Modal';

interface ThreadQuestlinePickerModalProps {
  currentThreadId: string;
  mode: 'parent' | 'child';
  initialKind?: (typeof THREAD_DERIVATION_KIND_OPTIONS)[number];
  onClose: () => void;
}

export function ThreadQuestlinePickerModal({
  currentThreadId,
  mode,
  initialKind = 'followup',
  onClose,
}: ThreadQuestlinePickerModalProps) {
  const { db } = useCampaign();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [relationKind, setRelationKind] = useState<(typeof THREAD_DERIVATION_KIND_OPTIONS)[number]>(initialKind);
  const debouncedQuery = useDebounce(query, 200);
  const allThreads = useEntitiesByType('thread');
  const existingQuestlineLinks = useLiveQuery(async () => {
    const relations = mode === 'child'
      ? await db.relations.where('targetId').equals(currentThreadId).toArray()
      : await db.relations.where('sourceId').equals(currentThreadId).toArray();

    return relations
      .filter((relation) => relation.type === 'derives_from')
      .map((relation) => ({
        threadId: mode === 'child' ? relation.sourceId : relation.targetId,
        kind: relation.meta?.threadDerivationKind,
      }));
  }, [db, currentThreadId, mode]);
  const existingQuestlineLinkMap = useMemo(
    () => new Map((existingQuestlineLinks ?? []).map((item) => [item.threadId, item.kind])),
    [existingQuestlineLinks],
  );

  const filteredThreads = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    return allThreads.filter((thread) => {
      if (thread.id === currentThreadId) return false;
      if (!normalizedQuery) return true;
      return thread.name.toLowerCase().includes(normalizedQuery);
    });
  }, [allThreads, currentThreadId, debouncedQuery]);

  async function handleLink(selectedThreadId: string) {
    setSavingId(selectedThreadId);
    try {
      await addRelation(db, {
        type: 'derives_from',
        sourceId: mode === 'child' ? selectedThreadId : currentThreadId,
        targetId: mode === 'child' ? currentThreadId : selectedThreadId,
        meta: { threadDerivationKind: relationKind },
      });
      toast.success(
        mode === 'child'
          ? 'W?tek pochodny podpi?ty do questline'
          : 'W?tek nadrz?dny podpi?ty do questline',
      );
      onClose();
    } catch (error) {
      toast.error(getReadableRelationErrorMessage(error, {
        relationType: 'derives_from',
        sourceType: 'thread',
        targetType: 'thread',
        mode,
      }));
      setSavingId(null);
    }
  }

  return (
    <Modal
      title={mode === 'child' ? 'Podepnij istniej?cy w?tek pochodny' : 'Podepnij istniej?cy w?tek nadrz?dny'}
      size="md"
      onClose={onClose}
      initialFocusRef={searchRef}
      aria-label="Picker questline"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-surface-600">Typ powi?zania questline</label>
          <select
            value={relationKind}
            onChange={(e) =>
              setRelationKind(e.target.value as (typeof THREAD_DERIVATION_KIND_OPTIONS)[number])
            }
            className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {THREAD_DERIVATION_KIND_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {THREAD_DERIVATION_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
          <p className="text-xs text-surface-500">
            {THREAD_DERIVATION_KIND_DESCRIPTIONS[relationKind]}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-surface-600">Wybierz w?tek</label>
          <p className="text-xs text-surface-500">
            W?tki ju? podpi?te do tego miejsca questline s? zablokowane. Aby zmieni? typ relacji,
            usu? stary link na detalu w?tku i dodaj go ponownie.
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-surface-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj w?tku..."
              className="w-full rounded-md border border-surface-300 py-2 pl-8 pr-3 text-sm placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <ul className="max-h-72 overflow-auto flex flex-col gap-1">
          {filteredThreads.length === 0 && (
            <li className="py-2 text-center text-xs text-surface-400">Brak pasuj?cych w?tk?w</li>
          )}
          {filteredThreads.map((thread) => {
            const existingKind = existingQuestlineLinkMap.get(thread.id);
            const isAlreadyLinked = existingQuestlineLinkMap.has(thread.id);

            return (
              <li key={thread.id}>
              <button
                type="button"
                disabled={savingId !== null || isAlreadyLinked}
                onClick={() => {
                  void handleLink(thread.id);
                }}
                className={`flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm disabled:opacity-50 ${
                  isAlreadyLinked ? 'cursor-not-allowed bg-surface-50' : 'hover:bg-primary-50'
                }`}
              >
                <Plus className="h-4 w-4 shrink-0 text-primary-500" />
                <span className="min-w-0">
                  <span className="block font-medium text-surface-800">{thread.name}</span>
                  {isAlreadyLinked && (
                    <span className="block text-xs text-surface-500">
                      Ju? powi?zane jako:{' '}
                      {existingKind ? getThreadDerivationKindLabel(existingKind) : 'legacy questline'}
                    </span>
                  )}
                </span>
              </button>
            </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
