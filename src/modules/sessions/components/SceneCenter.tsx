import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { Link } from 'react-router';
import { LocationBreadcrumb } from './LocationBreadcrumb';
import { ThreatSceneCard, LocationSceneCard } from './SceneCards';
import { useState, useEffect, useImperativeHandle, forwardRef, useRef, useCallback, type ReactNode } from 'react';
import {
  AlertTriangle,
  Crown,
  Ear,
  Eye,
  Hand,
  Heart,
  MapPin,
  Maximize2,
  MessageCircle,
  Skull,
  Target,
  Unlink,
  User,
  Wind,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { ClueSection } from '@shared/components/ClueSection';
import { DetailSection } from '@shared/components/DetailSection';
import { Modal } from '@shared/components/Modal';
import { NarrativeLinksSection } from '@shared/components/NarrativeLinksSection';
import { RelationPicker } from '@shared/components/RelationPicker';
import { isFaction } from '@modules/factions/types';
import { isFront, isThreat } from '@modules/fronts/types';
import { LOCATION_TYPE_LABELS } from '@modules/locations/types';
import { isNpc, type Npc } from '@modules/npcs/types';
import { isThread, type Thread } from '@modules/threads/types';
import { ThreadCard, type ThreadQuestlineCardInfo } from '@modules/threads/components/ThreadCard';
import { getNpcLifecycleStatus, isPlayerNpc } from '@shared/utils/entityData';
import type { Entity } from '@shared/types';
import { CardAccentSection } from '@shared/components/CardAccentSection';
import { useAssetUrl } from '@shared/hooks/useAssetUrl';
import { useRelatedEntities } from '@shared/hooks/useRelatedEntities';
import { applyPolishTypography } from '@shared/utils/typography';
import { deleteRelation, removeContainment, updateEntity } from '@shared/db/operations';
import {
  getThreadDerivationKindLabel,
  THREAD_DERIVATION_KIND_OPTIONS,
  type ThreadDerivationKindOption,
} from '@shared/domain/storyContracts';
import {
  useContainedNpcIds,
  useDraftSceneNpcs,
  useLiveLocation,
} from '../hooks/useLiveSessionQueries';
import { createNamedSceneFromDraft } from '../utils/liveSessionCommands';
import { getDraftLocationId } from '../utils/draftScene';

const DANGER_LABELS = ['Bezpieczna', 'Spokojnie', 'Umiarkowane', 'Niebezpiecznie', 'Śmiertelnie', 'Apokaliptyczne'];
const DANGER_COLORS = [
  'text-green-700 bg-green-100',
  'text-lime-700 bg-lime-100',
  'text-yellow-700 bg-yellow-100',
  'text-orange-700 bg-orange-100',
  'text-red-700 bg-red-100',
  'text-purple-700 bg-purple-100',
];
const NPC_CARD_TEXT_MAX_CHARS = 150;
const THREAD_RESOLUTION_PRESETS = [
  'Wątek został domknięty przy stole.',
  'Bohaterowie rozwiązali sprawę i ponoszą jej konsekwencje.',
  'Wątek wygasł, ale zostawił otwarte następstwa.',
];

function previewText(value: string | undefined, maxChars = NPC_CARD_TEXT_MAX_CHARS): string {
  const text = (value ?? '').trim();
  return text.length > maxChars ? `${text.slice(0, maxChars).trimEnd()}...` : text;
}

function LocationInfoCard({ locationId }: { locationId: string }) {
  const location = useLiveLocation(locationId);
  if (!location) return null;

  const { locationType, danger, senses } = location.data;
  const hasSenses = senses.see || senses.hear || senses.smell || senses.feel;

  return (
    <>
      {/* Name row */}
      <div className="flex items-center gap-2 flex-wrap border-b border-surface-100 bg-white px-5 py-2">
        <h2 className="text-base font-bold text-surface-900 truncate">{location.name}</h2>
        <span className="shrink-0 rounded-full bg-surface-100 px-2.5 py-0.5 text-xs text-surface-500">
          {LOCATION_TYPE_LABELS[locationType]}
        </span>
        {danger > 0 && (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${DANGER_COLORS[danger] ?? ''}`}>
            ⚠ {DANGER_LABELS[danger]}
          </span>
        )}
        {location.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] text-surface-400">{tag}</span>
        ))}
      </div>

      {/* Description */}
      {location.description && (
        <div
          className="prose prose-sm max-w-none border-b border-surface-100 bg-white px-5 py-2.5 text-surface-700"
          dangerouslySetInnerHTML={{ __html: location.description }}
        />
      )}

      {/* Senses */}
      {hasSenses && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-b border-surface-200 bg-surface-50 px-5 py-3">
          {senses.see && (
            <div className="flex items-start gap-1.5">
              <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Widzisz</p>
                <p className="text-sm text-surface-700">{senses.see}</p>
              </div>
            </div>
          )}
          {senses.hear && (
            <div className="flex items-start gap-1.5">
              <Ear className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Słyszysz</p>
                <p className="text-sm text-surface-700">{senses.hear}</p>
              </div>
            </div>
          )}
          {senses.smell && (
            <div className="flex items-start gap-1.5">
              <Wind className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Czujesz</p>
                <p className="text-sm text-surface-700">{senses.smell}</p>
              </div>
            </div>
          )}
          {senses.feel && (
            <div className="flex items-start gap-1.5">
              <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Atmosfera</p>
                <p className="text-sm text-surface-700">{senses.feel}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function NpcContextModal({ npcId, onClose }: { npcId: string; onClose: () => void }) {
  const { db } = useCampaign();
  const npc = useLiveQuery(() => db.entities.get(npcId), [db, npcId]);
  if (!npc || !isNpc(npc)) return null;

  const hasTraitDetails =
    npc.data.instinct || npc.data.motivation || npc.data.appearance || npc.data.playStyle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Kontekst postaci ${npc.name}`}
        className="relative w-full max-w-5xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <DetailSection
          sectionId="npc-live-kontekst"
          title="Kontekst postaci"
          tone="accent"
          contentClassName="flex flex-col gap-4"
        >
          {npc.description && (
            <div className="rounded-[1.25rem] border border-[rgba(150,50,75,0.32)] bg-[linear-gradient(180deg,rgba(235,165,185,0.55)_0%,rgba(205,110,135,0.32)_100%)] px-5 py-4 shadow-[0_12px_24px_rgba(90,30,50,0.1),inset_0_1px_0_rgba(255,245,248,0.42)]">
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-[rgb(92,28,48)] uppercase">Opis</h2>
              <div
                className="prose prose-sm text-surface-800 max-w-none"
                dangerouslySetInnerHTML={{ __html: npc.description }}
              />
            </div>
          )}

          {hasTraitDetails && (
            <div className="app-panel flex flex-col gap-3 rounded-[1.4rem] p-5">
              {npc.data.instinct && (
                <div>
                  <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                    Instynkt
                  </p>
                  <p className="text-surface-700 text-sm italic">{npc.data.instinct}</p>
                </div>
              )}
              {npc.data.motivation && (
                <div>
                  <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                    Motywacja
                  </p>
                  <p className="text-surface-700 text-sm">{npc.data.motivation}</p>
                </div>
              )}
              {npc.data.appearance && (
                <div>
                  <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                    Wygląd
                  </p>
                  <p className="text-surface-700 text-sm whitespace-pre-wrap">{npc.data.appearance}</p>
                </div>
              )}
              {npc.data.playStyle && (
                <div>
                  <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                    Sposób odgrywania
                  </p>
                  <p className="text-surface-700 text-sm whitespace-pre-wrap">{npc.data.playStyle}</p>
                </div>
              )}
            </div>
          )}

          {!npc.description && !hasTraitDetails && (
            <p className="text-surface-500 text-sm">Ta postać nie ma jeszcze uzupełnionego kontekstu.</p>
          )}
        </DetailSection>
      </div>
    </div>
  );
}

function InlineCardActions({
  expandLabel,
  closeLabel,
  onExpand,
  onClose,
}: {
  expandLabel: string;
  closeLabel: string;
  onExpand: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onExpand();
        }}
        className="app-pill-muted inline-flex h-7 w-7 items-center justify-center rounded-full text-surface-600 transition-colors hover:text-primary-800"
        aria-label={expandLabel}
      >
        <Maximize2 className="h-3 w-3" aria-hidden />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="app-pill-muted inline-flex h-7 w-7 items-center justify-center rounded-full text-surface-600 transition-colors hover:text-danger-700"
        aria-label={closeLabel}
      >
        <Unlink className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}

function SceneNpcCard({ npc, actionSlot }: { npc: Npc; actionSlot?: ReactNode }) {
  const isPC = isPlayerNpc(npc);
  const isDead = getNpcLifecycleStatus({ data: npc.data }) === 'completed';
  const thumbUrl = useAssetUrl(npc.data?.imageId ?? null, { thumb: true });
  const instinctPreview = applyPolishTypography(previewText(npc.data?.instinct));
  const motivationPreview = applyPolishTypography(previewText(npc.data?.motivation));
  const appearancePreview = applyPolishTypography(previewText(npc.data?.appearance));
  const playStylePreview = applyPolishTypography(previewText(npc.data?.playStyle));

  return (
    <article
      className={`app-card flex w-full cursor-default flex-col gap-4 rounded-[1.35rem] p-5 text-left ${
        isDead ? 'opacity-90' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={npc.data?.imageAlt || npc.name}
            className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-[0_4px_10px_rgba(18,45,66,0.12)]"
          />
        ) : (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,250,240,0.24)] ${
              isPC ? 'bg-[rgba(242,196,88,0.18)]' : 'bg-[rgba(33,71,102,0.12)]'
            }`}
          >
            {isPC ? (
              <Crown className="text-warning-600 h-4 w-4" />
            ) : (
              <User className="text-primary-800 h-4 w-4" />
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <p className="text-surface-900 min-w-0 text-[1.32rem] leading-tight font-semibold tracking-[-0.02em]">
            {npc.name}
          </p>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {isPC && (
              <span className="app-danger-pill rounded-full px-2.5 py-1 text-xs font-medium">
                Gracz
              </span>
            )}
            {isPC && npc.data?.playerName && (
              <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium">
                {npc.data.playerName}
              </span>
            )}
            {isDead && (
              <span className="border-danger-300/50 bg-danger-50 text-danger-800 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold">
                <Skull className="h-3 w-3" aria-hidden />
                Nie żyje
              </span>
            )}
          </div>
        </div>
      </div>

      {!isPC && instinctPreview && (
        <CardAccentSection
          label="Instynkt"
          icon={Target}
          tone="primary"
          maxLines={3}
          remeasureKey={instinctPreview}
        >
          <p className="text-surface-700 text-sm leading-6 whitespace-pre-wrap">
            {instinctPreview}
          </p>
        </CardAccentSection>
      )}

      {isPC && motivationPreview && (
        <CardAccentSection
          label="Motywacja"
          icon={Heart}
          tone="warning"
          maxLines={3}
          remeasureKey={motivationPreview}
        >
          <p className="text-surface-700 text-sm leading-6 whitespace-pre-wrap">
            {motivationPreview}
          </p>
        </CardAccentSection>
      )}

      {appearancePreview && (
        <CardAccentSection
          label="Wygląd"
          icon={Eye}
          tone="primary"
          maxLines={3}
          remeasureKey={appearancePreview}
        >
          <p className="text-surface-700 text-sm leading-6 whitespace-pre-wrap">
            {appearancePreview}
          </p>
        </CardAccentSection>
      )}

      {!isPC && playStylePreview && (
        <CardAccentSection
          label="Sposób odgrywania"
          icon={MessageCircle}
          tone="success"
          maxLines={3}
          remeasureKey={playStylePreview}
        >
          <p className="text-surface-700 text-sm leading-6 whitespace-pre-wrap">
            {playStylePreview}
          </p>
        </CardAccentSection>
      )}

      {actionSlot ? (
        <div className="mt-auto flex items-center justify-end border-t border-surface-200/50 pt-3">
          {actionSlot}
        </div>
      ) : null}
    </article>
  );
}

function NpcInlineCard({ npcId, onClose }: { npcId: string; onClose: () => void }) {
  const { db } = useCampaign();
  const npc = useLiveQuery(() => db.entities.get(npcId), [db, npcId]);
  const [expanded, setExpanded] = useState(false);
  if (!npc || !isNpc(npc)) return null;

  return (
    <>
      {expanded && <NpcContextModal npcId={npcId} onClose={() => setExpanded(false)} />}
      <div className="relative w-[22rem] shrink-0">
        <SceneNpcCard
          npc={npc}
          actionSlot={
            <InlineCardActions
              expandLabel={`Rozwiń kartę postaci: ${npc.name}`}
              closeLabel={`Odepnij kartę postaci: ${npc.name}`}
              onExpand={() => setExpanded(true)}
              onClose={onClose}
            />
          }
        />
      </div>
    </>
  );
}

type SceneNpcFactionGroup = {
  faction: Entity | null;
  npcIds: string[];
};

function NpcFactionGroups({
  npcIds,
  sessionId,
  onClose,
}: {
  npcIds: string[];
  sessionId: string;
  onClose: (id: string) => void;
}) {
  const { db } = useCampaign();
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; scrollLeft: number } | null>(null);
  const npcIdKey = npcIds.join('|');
  const groups = useLiveQuery(async (): Promise<SceneNpcFactionGroup[]> => {
    if (npcIds.length === 0) return [];

    const relations = await db.relations
      .where('sourceId')
      .anyOf(npcIds)
      .filter((relation) => relation.type === 'belongs_to')
      .toArray();
    const factionIds = [...new Set(relations.map((relation) => relation.targetId))];
    const factionEntities =
      factionIds.length > 0 ? await db.entities.where('id').anyOf(factionIds).toArray() : [];
    const factionById = new Map(factionEntities.filter(isFaction).map((faction) => [faction.id, faction]));
    const factionIdByNpcId = new Map<string, string>();

    for (const relation of relations) {
      if (factionById.has(relation.targetId) && !factionIdByNpcId.has(relation.sourceId)) {
        factionIdByNpcId.set(relation.sourceId, relation.targetId);
      }
    }

    const buckets = new Map<string, SceneNpcFactionGroup>();
    const ensureBucket = (faction: Entity | null) => {
      const key = faction?.id ?? '__no_faction__';
      const existing = buckets.get(key);
      if (existing) return existing;
      const created: SceneNpcFactionGroup = { faction, npcIds: [] };
      buckets.set(key, created);
      return created;
    };

    for (const npcId of npcIds) {
      const faction = factionById.get(factionIdByNpcId.get(npcId) ?? '') ?? null;
      ensureBucket(faction).npcIds.push(npcId);
    }

    return [...buckets.values()].sort((a, b) => {
      if (!a.faction && b.faction) return 1;
      if (a.faction && !b.faction) return -1;
      return (a.faction?.name ?? '').localeCompare(b.faction?.name ?? '', 'pl');
    });
  }, [db, npcIdKey]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    if (!el) return;
    if (e.target instanceof Element && e.target.closest('button, a, input, textarea, select, [role="button"]')) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, scrollLeft: el.scrollLeft };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !rowRef.current) return;
    rowRef.current.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.startX);
  }, []);

  const onPointerUp = useCallback(() => { drag.current = null; }, []);
  const resolvedGroups = groups ?? [];
  if (resolvedGroups.length === 0) return null;

  return (
    <div
      ref={rowRef}
      className="npc-scroll-row flex w-full items-start gap-4 overflow-x-auto px-5 pt-5 pb-2 cursor-grab select-none active:cursor-grabbing"
      style={{ scrollbarWidth: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {resolvedGroups.map((group) => {
        const groupKey = group.faction?.id ?? 'no-faction';
        return (
          <section
            key={groupKey}
            className="inline-flex w-max max-w-none shrink-0 flex-col rounded-[1.45rem] border border-primary-300/50 bg-[rgba(248,248,245,0.32)] px-3 py-3 shadow-sm"
          >
            <div className="mb-2 px-1">
              {group.faction ? (
                <Link
                  to={`/factions/${group.faction.id}`}
                  state={{ returnToSessionLive: sessionId }}
                  className="text-primary-800 text-sm font-semibold tracking-[-0.01em] hover:underline"
                >
                  {group.faction.name}
                </Link>
              ) : (
                <span className="text-surface-500 text-sm font-semibold tracking-[-0.01em]">Bez frakcji</span>
              )}
            </div>
            <div className="flex w-max max-w-none flex-nowrap items-start gap-4 pb-1">
              {group.npcIds.map((id) => (
                <NpcInlineCard key={`${groupKey}:${id}`} npcId={id} onClose={() => onClose(id)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function normalizeThreadDerivationKind(value: unknown): ThreadDerivationKindOption | null {
  return typeof value === 'string' && THREAD_DERIVATION_KIND_OPTIONS.includes(value as ThreadDerivationKindOption)
    ? (value as ThreadDerivationKindOption)
    : null;
}

function useThreadQuestlineCardInfo(threadId: string): ThreadQuestlineCardInfo | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const [parentRelations, childRelations] = await Promise.all([
      db.relations
        .where('sourceId')
        .equals(threadId)
        .filter((relation) => relation.type === 'derives_from')
        .toArray(),
      db.relations
        .where('targetId')
        .equals(threadId)
        .filter((relation) => relation.type === 'derives_from')
        .toArray(),
    ]);

    const parentIds = parentRelations.map((relation) => relation.targetId);
    const childIds = childRelations.map((relation) => relation.sourceId);
    const ids = [...new Set([...parentIds, ...childIds])];
    if (ids.length === 0) return { parents: [], children: [] };

    const entities = await db.entities.where('id').anyOf(ids).toArray();
    const threadById = new Map(entities.filter((entity) => entity.type === 'thread').map((thread) => [thread.id, thread]));

    const parents = parentRelations
      .map((relation) => {
        const thread = threadById.get(relation.targetId);
        if (!thread) return null;
        return {
          id: thread.id,
          name: thread.name,
          label: 'Wynika z',
        };
      })
      .filter((item): item is ThreadQuestlineCardInfo['parents'][number] => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    const children = childRelations
      .map((relation) => {
        const thread = threadById.get(relation.sourceId);
        if (!thread) return null;
        const kind = normalizeThreadDerivationKind(relation.meta?.threadDerivationKind);
        return {
          id: thread.id,
          name: thread.name,
          label: kind ? getThreadDerivationKindLabel(kind) : 'Rozwinięcie',
        };
      })
      .filter((item): item is ThreadQuestlineCardInfo['children'][number] => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    return { parents, children };
  }, [db, threadId]);
}

function ThreadContextModal({ thread, onClose }: { thread: Thread; sessionId: string; onClose: () => void }) {
  const { db } = useCampaign();
  const relatedThreats = useRelatedEntities(thread.id, {
    relationTypes: ['affects'],
    direction: 'both',
    otherTypes: ['threat'],
  });
  const relatedContextLinks = useRelatedEntities(thread.id, {
    relationTypes: ['related_to'],
    direction: 'both',
    otherTypes: ['faction', 'location', 'npc', 'item'],
  });
  const [showThreatPicker, setShowThreatPicker] = useState(false);
  const [showContextLinksPicker, setShowContextLinksPicker] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionResolution, setCompletionResolution] = useState('');
  const [completionResolutionError, setCompletionResolutionError] = useState('');
  const [unlinkConfirm, setUnlinkConfirm] = useState<{
    relationId: string;
    title: string;
    description: string;
  } | null>(null);
  const isCompleted = thread.data.status === 'completed';

  function handleToggleStatus() {
    if (thread.data.status === 'active') {
      setCompletionResolution(thread.data.resolution ?? '');
      setCompletionResolutionError('');
      setCompletionModalOpen(true);
      return;
    }

    void handleReactivateThread();
  }

  async function handleReactivateThread() {
    try {
      await updateEntity(db, thread.id, {
        data: { ...thread.data, status: 'active', resolution: '' },
      });
      toast.success('Wątek reaktywowany');
    } catch {
      toast.error('Nie udało się zaktualizować statusu');
    }
  }

  async function handleConfirmCompleteThread() {
    const trimmed = completionResolution.trim();
    if (trimmed.length === 0) {
      setCompletionResolutionError('Podaj rozwiązanie lub efekt zakończenia wątku');
      toast.error('Podaj rozwiązanie / efekt');
      return;
    }

    setCompletionSaving(true);
    try {
      await updateEntity(db, thread.id, {
        data: {
          ...thread.data,
          status: 'completed',
          resolution: trimmed,
        },
      });
      toast.success('Wątek zakończony');
      setCompletionModalOpen(false);
    } catch {
      toast.error('Nie udało się zakończyć wątku');
    } finally {
      setCompletionSaving(false);
    }
  }

  async function handleConfirmUnlink() {
    if (!unlinkConfirm) return;
    try {
      await deleteRelation(db, unlinkConfirm.relationId);
      toast.success('Powiązanie usunięte');
      setUnlinkConfirm(null);
    } catch {
      toast.error('Nie udało się usunąć powiązania');
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-5 lg:items-center"
        onMouseDown={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Kontekst wątku ${thread.name}`}
          className="relative w-full max-w-5xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <DetailSection
            sectionId="thread-live-kontekst"
            title="Kontekst wątku"
            tone="accent"
            action={
              <button
                type="button"
                onClick={handleToggleStatus}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isCompleted
                    ? 'app-button-secondary'
                    : 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:bg-emerald-100'
                }`}
              >
                {isCompleted ? 'Reaktywuj wątek' : 'Oznacz jako zakończony'}
              </button>
            }
            contentClassName="flex flex-col gap-5 lg:gap-6"
          >
            {thread.description && (
              <div className="rounded-[1.2rem] border border-emerald-300/45 bg-emerald-100/55 px-5 py-4">
                <h2 className="text-emerald-800 mb-2 text-xs font-semibold tracking-wide uppercase">
                  Opis
                </h2>
                <div
                  className="prose prose-sm text-surface-700 max-w-none"
                  dangerouslySetInnerHTML={{ __html: thread.description }}
                />
              </div>
            )}

            {thread.data.resolution && (
              <div>
                <h2 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                  Rozwiązanie / efekt
                </h2>
                <p className="app-danger-card text-surface-800 rounded-[1.3rem] px-4 py-3 text-sm whitespace-pre-wrap">
                  {thread.data.resolution}
                </p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="app-panel rounded-[1.3rem] p-4">
                <NarrativeLinksSection
                  title="Powiązania"
                  items={relatedContextLinks}
                  emptyMessage="Ten wątek nie ma jeszcze podpiętych powiązań."
                  actionLabel="+ Dodaj powiązanie"
                  onAction={() => setShowContextLinksPicker(true)}
                  onRemoveItem={(item) =>
                    setUnlinkConfirm({
                      relationId: item.relation.id,
                      title: 'Usunąć powiązanie?',
                      description: `Czy na pewno chcesz usunąć powiązanie z „${item.entity.name}" z tego widoku wątku?`,
                    })}
                  removeAriaLabel={(item) => `Usuń powiązanie ${item.entity.name} z tego widoku`}
                />
              </div>

              <div className="app-panel rounded-[1.3rem] p-4">
                <NarrativeLinksSection
                  title="Powiązane zagrożenia"
                  items={relatedThreats}
                  emptyMessage="Ten wątek działa niezależnie od zagrożeń."
                  actionLabel="+ Dodaj zagrożenie"
                  onAction={() => setShowThreatPicker(true)}
                  onRemoveItem={(item) =>
                    setUnlinkConfirm({
                      relationId: item.relation.id,
                      title: 'Usunąć powiązane zagrożenie?',
                      description: `Czy na pewno chcesz usunąć zagrożenie „${item.entity.name}" z tego widoku wątku?`,
                    })}
                  removeAriaLabel={(item) => `Usuń zagrożenie ${item.entity.name} z tego widoku`}
                />
              </div>
            </div>

            <div className="app-panel rounded-[1.3rem] p-4">
              <ClueSection
                parentId={thread.id}
                title="Wskazówki wątku"
                onRemoveRelation={(item) =>
                  setUnlinkConfirm({
                    relationId: item.relation.id,
                    title: 'Usunąć wskazówkę z widoku?',
                    description: `Czy na pewno chcesz usunąć wskazówkę „${item.clue.name}" z tego widoku wątku?`,
                  })}
              />
            </div>
          </DetailSection>
        </div>
      </div>

      {showThreatPicker && (
        <RelationPicker
          sourceId={thread.id}
          sourceType="thread"
          initialTargetType="threat"
          initialRelationType="affects"
          lockTargetType
          lockRelationType
          onClose={() => setShowThreatPicker(false)}
        />
      )}

      {showContextLinksPicker && (
        <RelationPicker
          sourceId={thread.id}
          sourceType="thread"
          initialTargetType="npc"
          initialRelationType="related_to"
          lockRelationType
          allowedTargetTypes={['faction', 'location', 'npc', 'item']}
          onClose={() => setShowContextLinksPicker(false)}
        />
      )}

      {completionModalOpen && (
        <Modal title="Rozwiązanie / efekt" onClose={() => setCompletionModalOpen(false)}>
          <p className="text-surface-600 text-sm">
            Opisz, jak wątek został zamknięty albo jaki efekt zostawia w kampanii.
          </p>
          <textarea
            value={completionResolution}
            onChange={(event) => {
              setCompletionResolution(event.target.value);
              if (completionResolutionError) setCompletionResolutionError('');
            }}
            rows={4}
            className="app-input text-surface-800 mt-3 w-full rounded-[1.2rem] px-4 py-3 text-sm"
            placeholder="Co stało się po zakończeniu wątku?"
            aria-invalid={completionResolutionError ? 'true' : 'false'}
          />
          {completionResolutionError && (
            <p className="mt-2 text-xs text-red-600">{completionResolutionError}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {THREAD_RESOLUTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setCompletionResolution(preset);
                  if (completionResolutionError) setCompletionResolutionError('');
                }}
                className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCompletionModalOpen(false)}
              className="app-button-secondary rounded-full px-4 py-2 text-sm font-medium"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmCompleteThread()}
              disabled={completionSaving}
              className="app-button-primary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {completionSaving ? 'Zapisywanie...' : 'Zakończ wątek'}
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(unlinkConfirm)}
        title={unlinkConfirm?.title ?? 'Usunąć powiązanie?'}
        description={unlinkConfirm?.description ?? ''}
        onConfirm={() => void handleConfirmUnlink()}
        onCancel={() => setUnlinkConfirm(null)}
      />
    </>
  );
}

function ThreadInlineCard({
  thread,
  sessionId,
  onClose,
}: {
  thread: Thread;
  sessionId: string;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const questline = useThreadQuestlineCardInfo(thread.id);

  return (
    <>
      {expanded && <ThreadContextModal thread={thread} sessionId={sessionId} onClose={() => setExpanded(false)} />}
      <div className="relative w-[22rem] shrink-0">
        <ThreadCard
          thread={thread}
          questline={questline}
          className="cursor-default hover:translate-y-0"
          actionSlot={
            <InlineCardActions
              expandLabel={`Rozwiń kartę wątku: ${thread.name}`}
              closeLabel={`Odepnij kartę wątku: ${thread.name}`}
              onExpand={() => setExpanded(true)}
              onClose={onClose}
            />
          }
        />
      </div>
    </>
  );
}

type SceneThreadThreatGroup = {
  threat: Entity | null;
  threads: Thread[];
};

type SceneThreadFrontGroup = {
  front: Entity | null;
  threatGroups: SceneThreadThreatGroup[];
};

function SceneThreadGroups({
  threads,
  sessionId,
  onClose,
}: {
  threads: Thread[];
  sessionId: string;
  onClose: (id: string) => void;
}) {
  const { db } = useCampaign();
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; scrollLeft: number } | null>(null);
  const groups = useLiveQuery(async (): Promise<SceneThreadFrontGroup[]> => {
    if (threads.length === 0) return [];

    const threadById = new Map(threads.map((thread) => [thread.id, thread]));
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

    const threatIdsByThreadId = new Map<string, Set<string>>();
    for (const threadId of threadIds) threatIdsByThreadId.set(threadId, new Set<string>());

    for (const relation of outgoingAffects) {
      if (threadById.has(relation.sourceId)) {
        threatIdsByThreadId.get(relation.sourceId)?.add(relation.targetId);
      }
    }
    for (const relation of incomingAffects) {
      if (threadById.has(relation.targetId)) {
        threatIdsByThreadId.get(relation.targetId)?.add(relation.sourceId);
      }
    }

    const candidateThreatIds = [...new Set([...threatIdsByThreadId.values()].flatMap((ids) => [...ids]))];
    const threatEntities =
      candidateThreatIds.length > 0
        ? await db.entities.where('id').anyOf(candidateThreatIds).toArray()
        : [];
    const threatById = new Map(threatEntities.filter(isThreat).map((threat) => [threat.id, threat]));
    const validThreatIds = new Set(threatById.keys());

    const threatFrontRelations =
      validThreatIds.size > 0
        ? await db.relations
            .where('sourceId')
            .anyOf([...validThreatIds])
            .filter((relation) => relation.type === 'belongs_to')
            .toArray()
        : [];
    const frontIds = [...new Set(threatFrontRelations.map((relation) => relation.targetId))];
    const frontEntities =
      frontIds.length > 0 ? await db.entities.where('id').anyOf(frontIds).toArray() : [];
    const frontById = new Map(frontEntities.filter(isFront).map((front) => [front.id, front]));
    const frontIdByThreatId = new Map<string, string>();
    for (const relation of threatFrontRelations) {
      if (validThreatIds.has(relation.sourceId) && frontById.has(relation.targetId)) {
        frontIdByThreatId.set(relation.sourceId, relation.targetId);
      }
    }

    const frontBuckets = new Map<string, SceneThreadFrontGroup>();
    const ensureFrontBucket = (front: Entity | null) => {
      const key = front?.id ?? '__no_front__';
      const existing = frontBuckets.get(key);
      if (existing) return existing;
      const created: SceneThreadFrontGroup = { front, threatGroups: [] };
      frontBuckets.set(key, created);
      return created;
    };

    const threatBucketsByFrontKey = new Map<string, Map<string, SceneThreadThreatGroup>>();
    const ensureThreatBucket = (front: Entity | null, threat: Entity | null) => {
      const frontBucket = ensureFrontBucket(front);
      const frontKey = front?.id ?? '__no_front__';
      const threatKey = threat?.id ?? '__no_threat__';
      const threatBuckets = threatBucketsByFrontKey.get(frontKey) ?? new Map<string, SceneThreadThreatGroup>();
      threatBucketsByFrontKey.set(frontKey, threatBuckets);
      const existing = threatBuckets.get(threatKey);
      if (existing) return existing;
      const created: SceneThreadThreatGroup = { threat, threads: [] };
      threatBuckets.set(threatKey, created);
      frontBucket.threatGroups.push(created);
      return created;
    };

    for (const thread of threads) {
      const threatIds = [...(threatIdsByThreadId.get(thread.id) ?? new Set<string>())].filter((id) =>
        validThreatIds.has(id),
      );

      if (threatIds.length === 0) {
        ensureThreatBucket(null, null).threads.push(thread);
        continue;
      }

      for (const threatId of threatIds) {
        const threat = threatById.get(threatId);
        if (!threat) continue;
        const front = frontById.get(frontIdByThreatId.get(threatId) ?? '') ?? null;
        ensureThreatBucket(front, threat).threads.push(thread);
      }
    }

    return [...frontBuckets.values()]
      .map((frontGroup) => ({
        ...frontGroup,
        threatGroups: frontGroup.threatGroups
          .map((threatGroup) => ({
            ...threatGroup,
            threads: threatGroup.threads.sort((a, b) => a.name.localeCompare(b.name, 'pl')),
          }))
          .sort((a, b) => (a.threat?.name ?? 'Bez zagrożenia').localeCompare(b.threat?.name ?? 'Bez zagrożenia', 'pl')),
      }))
      .sort((a, b) => (a.front?.name ?? 'Bez frontu').localeCompare(b.front?.name ?? 'Bez frontu', 'pl'));
  }, [db, threads]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const element = rowRef.current;
    if (!element) return;
    if (event.target instanceof Element && event.target.closest('button, a, input, textarea, select, [role="button"]')) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, scrollLeft: element.scrollLeft };
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !rowRef.current) return;
    rowRef.current.scrollLeft = drag.current.scrollLeft - (event.clientX - drag.current.startX);
  }, []);

  const stopDrag = useCallback(() => {
    drag.current = null;
  }, []);

  const resolvedGroups = groups ?? [];
  if (resolvedGroups.length === 0) return null;

  return (
    <div
      ref={rowRef}
      className="thread-scroll-row flex w-full items-start gap-4 overflow-x-auto px-5 pt-3 pb-2"
      style={{ scrollbarWidth: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onPointerLeave={stopDrag}
    >
      {resolvedGroups.map((frontGroup) => {
        const frontKey = frontGroup.front?.id ?? 'no-front';
        return (
          <section
            key={frontKey}
            className="inline-flex w-max max-w-none shrink-0 flex-col rounded-[1.45rem] border border-danger-300/50 bg-[rgba(248,248,245,0.32)] px-3 py-3 shadow-sm"
          >
            <div className="mb-2 px-1">
              {frontGroup.front ? (
                <Link
                  to={`/fronts/${frontGroup.front.id}`}
                  state={{ returnToSessionLive: sessionId }}
                  className="text-danger-700 text-sm font-semibold tracking-[-0.01em] hover:underline"
                >
                  {frontGroup.front.name}
                </Link>
              ) : (
                <span className="text-surface-500 text-sm font-semibold tracking-[-0.01em]">Bez frontu</span>
              )}
            </div>

            <div className="flex w-max max-w-none flex-nowrap items-start gap-3">
              {frontGroup.threatGroups.map((threatGroup) => {
                const threatKey = threatGroup.threat?.id ?? 'no-threat';
                return (
                  <section
                    key={`${frontKey}:${threatKey}`}
                    className="inline-flex w-max max-w-none shrink-0 flex-col rounded-[1.25rem] border border-warning-400/60 bg-[rgba(248,248,245,0.34)] px-3 py-3"
                  >
                    <div className="mb-2 px-1">
                      {threatGroup.threat ? (
                        <Link
                          to={`/threats/${threatGroup.threat.id}`}
                          state={{ returnToSessionLive: sessionId }}
                          className="text-warning-700 text-sm font-semibold tracking-[-0.01em] hover:underline"
                        >
                          {threatGroup.threat.name}
                        </Link>
                      ) : (
                        <span className="text-surface-500 text-sm font-semibold tracking-[-0.01em]">
                          Bez zagrożenia
                        </span>
                      )}
                    </div>
                    <div className="flex w-max max-w-none flex-nowrap items-start gap-4 pb-1">
                      {threatGroup.threads.map((thread) => (
                        <ThreadInlineCard
                          key={`${frontKey}:${threatKey}:${thread.id}`}
                          thread={thread}
                          sessionId={sessionId}
                          onClose={() => onClose(thread.id)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

interface SceneCenterProps {
  sessionId: string;
  currentLocationId: string | null;
  openCardIds: string[];
  onLocationChange: (id: string | null) => void;
  onCloseCard: (id: string) => void;
  onOpenLocationPicker: () => void;
}

export interface SceneCenterHandle {
  openNameScene: () => void;
}

export const SceneCenter = forwardRef<SceneCenterHandle, SceneCenterProps>(function SceneCenter({
  sessionId,
  currentLocationId,
  openCardIds,
  onLocationChange,
  onCloseCard,
  onOpenLocationPicker,
}, ref) {
  const { db } = useCampaign();
  const [showNameScene, setShowNameScene] = useState(false);
  const [sceneName, setSceneName] = useState('');
  const [sceneNameSaving, setSceneNameSaving] = useState(false);
  // pendingChange: location id to navigate to after naming (null id = "Pusta scena"), undefined = no pending navigation
  const [pendingChange, setPendingChange] = useState<{ id: string | null } | undefined>(undefined);

  const draftSceneNpcs = useDraftSceneNpcs(sessionId);
  const sceneNpcIds = useContainedNpcIds(currentLocationId);

  async function handleCloseNpcCard(id: string) {
    try {
      const sceneLocationId = currentLocationId ?? getDraftLocationId(sessionId);
      await removeContainment(db, id, sceneLocationId);
    } catch {
      toast.error('Nie udało się odpiąć postaci ze sceny');
    }
  }

  const visibleSceneNpcIds = (currentLocationId === null
    ? draftSceneNpcs.map((n) => n.id)
    : sceneNpcIds
  );
  const currentLocation = useLiveLocation(currentLocationId);

  useImperativeHandle(ref, () => ({
    openNameScene: () => setShowNameScene(true),
  }));

  // When a real location becomes active, dismiss the banner
  useEffect(() => {
    if (currentLocationId !== null) {
      setShowNameScene(false);
      setSceneName('');
      setPendingChange(undefined);
    }
  }, [currentLocationId]);

  // When the draft scene is emptied, close the naming prompt
  useEffect(() => {
    if (draftSceneNpcs.length === 0) {
      setShowNameScene(false);
      setSceneName('');
    }
  }, [draftSceneNpcs.length]);

  // Load entity types to decide which card to render
  const openEntities = useLiveQuery(async () => {
    if (openCardIds.length === 0) return new Map<string, Entity>();
    const entities = await db.entities.where('id').anyOf(openCardIds).toArray();
    return new Map(entities.map((e) => [e.id, e]));
  }, [db, openCardIds]) ?? new Map<string, Entity>();
  const openSceneThreads = openCardIds
    .map((entityId) => openEntities.get(entityId))
    .filter((entity): entity is Thread => entity !== undefined && isThread(entity));

  function handleWrappedLocationChange(id: string | null) {
    if (id === currentLocationId) return;

    // If the empty scene already has NPCs on it, require naming before leaving
    if (currentLocationId === null && draftSceneNpcs.length > 0) {
      setPendingChange({ id });
      setShowNameScene(true);
      return;
    }
    onLocationChange(id);
  }

  async function handleNameScene() {
    const trimmed = sceneName.trim();
    if (!trimmed) return;
    setSceneNameSaving(true);
    try {
      const location = await createNamedSceneFromDraft(db, sessionId, trimmed);
      toast.success(`Scena „${trimmed}" zapisana`);
      setShowNameScene(false);
      setSceneName('');
      const nextId = pendingChange !== undefined ? pendingChange.id : location.id;
      setPendingChange(undefined);
      onLocationChange(nextId);
    } catch {
      toast.error('Nie udało się zapisać sceny');
    } finally {
      setSceneNameSaving(false);
    }
  }

  function handleSkipNaming() {
    setShowNameScene(false);
    setSceneName('');
    setPendingChange(undefined);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Location breadcrumb + quick add row */}
      <div className="flex items-center gap-3 border-b border-[rgba(86,93,94,0.12)] bg-[rgba(248,248,245,0.9)] px-4 py-2.5 backdrop-blur-sm">
        <LocationBreadcrumb
          sessionId={sessionId}
          currentLocationId={currentLocationId}
          onSelect={handleWrappedLocationChange}
        />
        <button
          type="button"
          onClick={onOpenLocationPicker}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-[rgba(96,169,122,0.28)] bg-[rgba(196,232,204,0.32)] px-2.5 py-1 text-xs text-green-700 transition-colors hover:bg-[rgba(196,232,204,0.45)]"
        >
          <MapPin className="h-3 w-3" />
          <span className="font-medium">Lokacja kampanii:</span>
          <span className="max-w-[220px] truncate">{currentLocation?.name ?? 'Pusta scena'}</span>
        </button>
      </div>

      {/* Location info panel — flat, below breadcrumb */}
      {currentLocationId && <LocationInfoCard locationId={currentLocationId} />}

      {/* Canvas — NPC cards + floating cards */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-surface-50 to-surface-100/70">
        {/* Draft-scene banner: empty scene has NPCs and must be named before leaving */}
        {currentLocationId === null && draftSceneNpcs.length > 0 && (
          <div className="mx-4 mt-3">
            {showNameScene ? (
              <form
                onSubmit={(e) => { e.preventDefault(); void handleNameScene(); }}
                className="app-panel flex items-center gap-2 rounded-2xl border border-[rgba(33,71,102,0.16)] bg-[rgba(248,248,245,0.96)] p-3.5"
              >
                <span className="shrink-0 text-xs font-semibold text-primary-800">
                  Nazwij tę lokację ({draftSceneNpcs.length}{' '}
                  {draftSceneNpcs.length === 1 ? 'postać' : 'postaci'}):
                </span>
                <input
                  autoFocus
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                  placeholder="Nazwa lokacji/sceny…"
                  className="app-input flex-1 rounded-xl px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <button
                  type="submit"
                  disabled={!sceneName.trim() || sceneNameSaving}
                  className="app-button-primary rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {sceneNameSaving ? '…' : 'Zapisz'}
                </button>
                <button
                  type="button"
                  onClick={handleSkipNaming}
                  className="app-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium text-surface-700"
                >
                  Anuluj
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-[rgba(212,172,72,0.5)] bg-[rgba(247,235,193,0.58)] px-3.5 py-2.5 text-xs text-[#7f5a11] shadow-sm">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>
                  {draftSceneNpcs.length === 1
                    ? 'Na pustej scenie jest 1 postać.'
                    : `Na pustej scenie jest ${draftSceneNpcs.length} postaci.`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowNameScene(true)}
                  className="app-button-secondary ml-1 rounded-full px-3 py-1 text-[11px] font-semibold text-[#7f5a11]"
                >
                  Nazwij lokację
                </button>
              </div>
            )}
          </div>
        )}
        {/* Inline NPC scene cards — horizontal drag-scroll */}
        {visibleSceneNpcIds.length > 0 && (
          <>
            <div className="px-5 pt-4 pb-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Postacie</span>
            </div>
            <NpcFactionGroups npcIds={visibleSceneNpcIds} sessionId={sessionId} onClose={handleCloseNpcCard} />
          </>
        )}
        {openSceneThreads.length > 0 && (
          <>
            <div className="px-5 pt-3 pb-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Wątki</span>
            </div>
            <SceneThreadGroups threads={openSceneThreads} sessionId={sessionId} onClose={onCloseCard} />
          </>
        )}

        {visibleSceneNpcIds.length === 0 && openSceneThreads.length === 0 && openCardIds.length === 0 && !(currentLocationId === null && draftSceneNpcs.length > 0) && (
          <div className="flex h-full items-center justify-center select-none">
            <p className="text-sm text-surface-400">
              Brak elementów na scenie. Dodaj postać lub wątek z panelu po prawej.
            </p>
          </div>
        )}
      </div>

      {/* Floating cards — threats and locations only */}
      {openCardIds.map((id, idx) => {
        const entity = openEntities.get(id);
        if (!entity) return null;
        if (entity.type === 'npc') return null;
        const ix = 64 + idx * 24;
        const iy = 80 + idx * 24;
        if (entity.type === 'threat')
          return <ThreatSceneCard key={id} threatId={id} onClose={() => onCloseCard(id)} initialX={ix} initialY={iy} />;
        if (entity.type === 'location')
          return <LocationSceneCard key={id} locationId={id} sessionId={sessionId} onClose={() => onCloseCard(id)} initialX={ix} initialY={iy} />;
        return null;
      })}
    </div>
  );
});
