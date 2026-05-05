import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router';
import { Modal } from '@shared/components/Modal';
import { ClueSection } from '@shared/components/ClueSection';
import { TickProgress } from '@shared/components/TickProgress';
import { useCampaign } from '@shared/db/CampaignContext';
import type { MgHelperDb } from '@shared/db/database';
import { updateEntity } from '@shared/db/operations';
import { withClockAdvanceMeta } from '@modules/clocks/clockAdvance';
import type { Clock } from '@modules/clocks/types';
import { isClock } from '@modules/clocks/types';
import { getClockData, getThreatData, getThreatStatus } from '@shared/utils/entityData';
import { normalizeThreatLifecycle } from '@shared/utils/threatLifecycle';
import { inferThreatCompletionOutcomeFromClock } from '@modules/fronts/types';
import { ThreatPreviewModal } from './ThreatPreviewModal';
import { toast } from 'sonner';
import type { Entity } from '@shared/types';
import { ensureEntityAppearsInSession } from '../utils/liveSessionCommands';
import { recordEntityMutationInSession, recordSessionSignal } from '../utils/sessionSignals';

interface ThreatRow {
  threat: Entity;
  clock: Clock | null;
  front: Entity | null;
}

type ThreatStatusFilter = 'all' | 'active' | 'completed';

interface ThreatCampaignPickerModalProps {
  excludedIds: Set<string>;
  onAdd: (entityIds: string[]) => Promise<void>;
  onClose: () => void;
}

function ThreatCampaignPickerModal({
  excludedIds,
  onAdd,
  onClose,
}: ThreatCampaignPickerModalProps) {
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const entities =
    useLiveQuery(() => db.entities.where('type').equals('threat').toArray(), [db]) ?? [];
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
    <Modal title="Dodaj zagrożenia z kampanii" size="md" onClose={onClose}>
      <div className="app-input-shell mb-3 flex items-center gap-2 rounded-[1.15rem] px-3 py-2.5">
        <Search className="text-surface-400 h-3.5 w-3.5" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj zagrożeń..."
          className="placeholder:text-surface-400 w-full text-sm outline-none"
          autoFocus
        />
      </div>

      <div className="app-panel max-h-72 overflow-y-auto rounded-[1.25rem] p-1">
        {filtered.length === 0 ? (
          <p className="text-surface-400 p-3 text-sm">
            {available.length === 0
              ? 'Wszystkie zagrożenia kampanii są już w sesji.'
              : 'Brak wyników.'}
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
          {selected.size > 0 ? `Wybrano: ${selected.size}` : 'Wybierz zagrożenia do dodania'}
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
            Dodaj
          </button>
        </div>
      </div>
    </Modal>
  );
}

function useThreatRows(db: MgHelperDb, sessionId?: string) {
  return useLiveQuery(async () => {
    let sessionEntityIds: Set<string> | null = null;
    if (sessionId) {
      const relations = await db.relations
        .where('targetId')
        .equals(sessionId)
        .filter((relation) => relation.type === 'appears_in')
        .toArray();
      sessionEntityIds = new Set(relations.map((relation) => relation.sourceId));
    }

    const threats = await db.entities.where('type').equals('threat').toArray();
    const scopedThreats = sessionEntityIds
      ? threats.filter((threat) => sessionEntityIds.has(threat.id))
      : threats;

    const scopedThreatIds = scopedThreats.map((threat) => threat.id);
    const belongsToRelations =
      scopedThreatIds.length > 0
        ? await db.relations
            .where('sourceId')
            .anyOf(scopedThreatIds)
            .filter((relation) => relation.type === 'belongs_to')
            .toArray()
        : [];
    const frontIds = [...new Set(belongsToRelations.map((relation) => relation.targetId))];
    const fronts =
      frontIds.length > 0 ? await db.entities.where('id').anyOf(frontIds).toArray() : [];
    const frontMap = new Map(
      fronts.filter((entity) => entity.type === 'front').map((front) => [front.id, front] as const),
    );
    const threatFrontMap = new Map<string, Entity>();

    for (const relation of belongsToRelations) {
      const front = frontMap.get(relation.targetId);
      if (front && !threatFrontMap.has(relation.sourceId)) {
        threatFrontMap.set(relation.sourceId, front);
      }
    }

    const rows: ThreatRow[] = await Promise.all(
      scopedThreats.map(async (threat): Promise<ThreatRow> => {
        const trackRel = await db.relations
          .where('sourceId')
          .equals(threat.id)
          .filter((relation) => relation.type === 'tracks')
          .first();

        if (!trackRel) {
          return { threat, clock: null, front: threatFrontMap.get(threat.id) ?? null };
        }

        const clockEntity = await db.entities.get(trackRel.targetId);
        if (!clockEntity || !isClock(clockEntity)) {
          return { threat, clock: null, front: threatFrontMap.get(threat.id) ?? null };
        }

        return { threat, clock: clockEntity, front: threatFrontMap.get(threat.id) ?? null };
      }),
    );

    return rows.sort((a, b) => a.threat.name.localeCompare(b.threat.name, 'pl'));
  }, [db, sessionId]);
}

function useOrphanClocks(db: MgHelperDb, sessionId?: string) {
  return useLiveQuery(async () => {
    const clocks = await db.entities.where('type').equals('clock').toArray();
    const active = clocks.filter(isClock).filter((clock) => {
      const data = getClockData(clock);
      return data.filled < data.segments && data.isActive !== false;
    });

    const results: (Clock | null)[] = await Promise.all(
      active.map(async (clock) => {
        const relations = await db.relations
          .where('targetId')
          .equals(clock.id)
          .filter((relation) => relation.type === 'tracks')
          .toArray();
        return relations.length === 0 ? clock : null;
      }),
    );

    return results.filter((clock): clock is Clock => clock !== null);
  }, [db, sessionId]);
}

async function tick(
  db: MgHelperDb,
  clock: Clock,
  sessionId?: string,
  context?: { threatId: string; threatName: string },
) {
  const data = getClockData(clock);
  if (data.filled >= data.segments || data.isActive === false) return;

  const newFilled = data.filled + 1;
  await updateEntity(db, clock.id, {
    data: withClockAdvanceMeta(data, newFilled, sessionId ? { sessionId } : undefined) as unknown as Record<
      string,
      unknown
    >,
  });
  if (sessionId) {
    await recordEntityMutationInSession(db, {
      sessionId,
      entityType: clock.type,
      entityId: clock.id,
      entityName: clock.name,
      changedFields: ['filled'],
      source: 'active-threats/tick',
      extra: { fromFilled: data.filled, toFilled: newFilled, segments: data.segments },
    });
    await recordSessionSignal(db, {
      sessionId,
      signalType: 'clock_ticked',
      entityType: clock.type,
      entityId: clock.id,
      entityName: clock.name,
      metadata: { filled: newFilled, segments: data.segments },
    });
    if (context && data.filled === 0 && newFilled > 0) {
      await recordSessionSignal(db, {
        sessionId,
        signalType: 'threat_clock_started',
        entityType: 'threat',
        entityId: context.threatId,
        entityName: context.threatName,
        metadata: {
          clockId: clock.id,
          clockName: clock.name,
          fromFilled: data.filled,
          toFilled: newFilled,
        },
      });
    }
  }
  if (newFilled >= data.segments) {
    toast.success(`Zegar „${clock.name}” został domknięty`);
  }
}

export function ActiveThreatsPanel({ sessionId }: { sessionId?: string }) {
  const { db } = useCampaign();
  const [previewThreatId, setPreviewThreatId] = useState<string | null>(null);
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ThreatStatusFilter>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const threatRows = useThreatRows(db, sessionId);
  const orphanClocks = useOrphanClocks(db, sessionId);

  const hasOrphans = Boolean(orphanClocks && orphanClocks.length > 0);

  const groupedThreats = useMemo(() => {
    const frontGroups = new Map<string, { front: Entity; rows: ThreatRow[] }>();
    const freeRows: ThreatRow[] = [];

    const matchesFilter = (row: ThreatRow) => {
      const isCompleted = getThreatStatus(row.threat) === 'completed';
      if (statusFilter === 'all') return true;
      if (statusFilter === 'completed') return isCompleted;
      return !isCompleted;
    };

    (threatRows ?? []).forEach((row) => {
      if (!matchesFilter(row)) return;
      if (!row.front) {
        freeRows.push(row);
        return;
      }

      const existing = frontGroups.get(row.front.id);
      if (existing) {
        existing.rows.push(row);
        return;
      }

      frontGroups.set(row.front.id, { front: row.front, rows: [row] });
    });

    const frontSections = [...frontGroups.values()]
      .map((group) => ({
        front: group.front,
        rows: group.rows.sort((a, b) => a.threat.name.localeCompare(b.threat.name, 'pl')),
      }))
      .sort((a, b) => a.front.name.localeCompare(b.front.name, 'pl'));

    return {
      frontSections,
      freeRows: freeRows.sort((a, b) => a.threat.name.localeCompare(b.threat.name, 'pl')),
    };
  }, [statusFilter, threatRows]);

  const hasVisibleThreats =
    groupedThreats.frontSections.length > 0 || groupedThreats.freeRows.length > 0;

  if (!hasVisibleThreats && !hasOrphans) {
    return (
      <div className="app-input-shell text-surface-500 rounded-[1.25rem] border-dashed px-4 py-4 text-sm">
        Brak zagrożeń i zegarów w tej sesji.
      </div>
    );
  }

  async function toggleThreatStatus(row: ThreatRow) {
    const currentStatus = getThreatStatus(row.threat);
    const nextStatus = currentStatus === 'active' ? 'completed' : 'active';

    try {
      const lifecycle = normalizeThreatLifecycle(
        nextStatus,
        getThreatData(row.threat).completionReason ?? getThreatData(row.threat).reasonOfDead,
      );
      const completionOutcome =
        nextStatus === 'completed'
          ? inferThreatCompletionOutcomeFromClock(row.clock)
          : undefined;

      await updateEntity(db, row.threat.id, {
        data: {
          ...row.threat.data,
          ...lifecycle,
          completionOutcome,
        },
      });

      if (row.clock) {
        const clockData = getClockData(row.clock);
        await updateEntity(db, row.clock.id, {
          data: {
            ...clockData,
            isActive: nextStatus === 'active',
          },
        });
      }

      if (sessionId) {
        await recordEntityMutationInSession(db, {
          sessionId,
          entityType: row.threat.type,
          entityId: row.threat.id,
          entityName: row.threat.name,
          changedFields: ['status'],
          source: 'active-threats/toggle-status',
          extra: { from: currentStatus, to: nextStatus },
        });
        await recordSessionSignal(db, {
          sessionId,
          signalType: 'threat_status_changed',
          entityType: row.threat.type,
          entityId: row.threat.id,
          entityName: row.threat.name,
          metadata: { from: currentStatus, to: nextStatus },
        });
        if (nextStatus === 'completed') {
          await recordSessionSignal(db, {
            sessionId,
            signalType: 'entity_died_in_session',
            entityType: row.threat.type,
            entityId: row.threat.id,
            entityName: row.threat.name,
            metadata: { source: 'threat_status_changed', from: currentStatus, to: nextStatus },
          });
        }
        if (row.clock) {
          await recordEntityMutationInSession(db, {
            sessionId,
            entityType: row.clock.type,
            entityId: row.clock.id,
            entityName: row.clock.name,
            changedFields: ['isActive'],
            source: 'active-threats/threat-status-sync-clock',
            extra: { isActive: nextStatus === 'active' },
          });
        }
      }

      toast.success(nextStatus === 'completed' ? 'Zagrożenie zakończone' : 'Zagrożenie aktywowane');
    } catch {
      toast.error('Nie udało się zmienić statusu zagrożenia');
    }
  }

  function renderThreatCard(row: ThreatRow) {
    const { threat, clock } = row;
    const clockData = clock ? getClockData(clock) : null;
    const percent = clockData ? Math.round((clockData.filled / clockData.segments) * 100) : null;
    const currentTickLabel = clockData
      ? (clockData.tickLabels?.[Math.max(0, clockData.filled - 1)] ??
        `${clockData.filled}/${clockData.segments}`)
      : 'Brak zegara';
    const nextTickLabel = clockData
      ? clockData.filled < clockData.segments
        ? (clockData.tickLabels?.[clockData.filled] ??
          `${clockData.filled + 1}/${clockData.segments}`)
        : null
      : null;

    const isCompleted = getThreatStatus(threat) === 'completed';

    return (
      <div
        key={threat.id}
        className={`app-danger-card flex flex-col gap-3 rounded-[1.35rem] p-4 ${
          isCompleted ? 'opacity-70' : ''
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <Link
            to={`/threats/${threat.id}`}
            state={sessionId ? { returnToSessionLive: sessionId } : undefined}
            className="text-primary-700 min-w-0 flex-1 truncate text-sm font-semibold hover:underline"
            title="Otwórz pełną kartę zagrożenia"
          >
            {threat.name}
          </Link>
          <button
            type="button"
            onClick={() => setPreviewThreatId(threat.id)}
            className="app-button-secondary shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
          >
            Podgląd
          </button>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
              isCompleted
                ? 'app-pill-muted'
                : 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800'
            }`}
          >
            {isCompleted ? 'Zakończone' : 'Aktywne'}
          </span>
          <button
            type="button"
            onClick={() => void toggleThreatStatus(row)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isCompleted ? 'app-button-primary' : 'app-button-secondary'
            }`}
          >
            {isCompleted ? 'Wznów' : 'Zakończ'}
          </button>
        </div>

        {clockData && clock ? (
          <div className="app-panel rounded-[1.15rem] px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="text-surface-700 min-w-0 flex-1 truncate text-xs font-medium">
                {clock.name}
              </span>
              <div className="flex items-center gap-px">
                {Array.from({ length: clockData.segments }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-2.5 w-3 rounded-sm border ${
                      index < clockData.filled
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-surface-300 bg-surface-100'
                    }`}
                  />
                ))}
              </div>
              <span className="text-surface-500 w-7 shrink-0 text-right text-xs">{percent}%</span>
              <button
                type="button"
                onClick={() =>
                  void tick(db, clock, sessionId, { threatId: threat.id, threatName: threat.name })}
                disabled={clockData.filled >= clockData.segments || clockData.isActive === false}
                className="app-button-primary rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40"
                title="Zwiększ zegar o 1 segment"
              >
                Tick +1
              </button>
            </div>
          </div>
        ) : (
          <div className="app-input-shell text-surface-500 rounded-[1.1rem] px-3 py-2 text-xs">
            Brak aktywnego zegara
          </div>
        )}

        {clockData?.tickLabels && clockData.tickLabels.length > 0 ? (
          <TickProgress
            tickLabels={clockData.tickLabels}
            filled={clockData.filled}
            segments={clockData.segments}
          />
        ) : (
          <div className="text-xs">
            <p className="text-surface-700">
              <span className="text-surface-400">Teraz: </span>
              {currentTickLabel}
            </p>
            {nextTickLabel && (
              <p className="text-surface-400 italic">
                <span className="not-italic">Następnie: </span>
                {nextTickLabel}
              </p>
            )}
          </div>
        )}

        <ClueSection parentId={threat.id} title="Wskazówki" />
      </div>
    );
  }

  async function handleAddFromCampaign(entityIds: string[]) {
    if (!sessionId) return;

    try {
      await Promise.all(entityIds.map((entityId) => ensureEntityAppearsInSession(db, entityId, sessionId)));
      toast.success(
        `Dodano ${entityIds.length} ${entityIds.length === 1 ? 'zagrożenie' : 'zagrożenia'} z kampanii`,
      );
    } catch {
      toast.error('Nie udało się dodać zagrożeń z kampanii');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {sessionId && (
        <div className="app-panel rounded-[1.45rem] p-4">
          <div className="mb-3">
            <p className="text-surface-500 text-xs font-semibold tracking-[0.18em] uppercase">
              Zagrożenia w sesji
            </p>
            <p className="text-surface-700 mt-1 text-sm">
              Presje aktywne przy stole, wraz z podpiętymi zegarami i wskazówkami.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCampaignPickerOpen(true)}
            className="app-button-secondary w-full rounded-2xl px-3 py-3 text-sm font-medium"
          >
            Dodaj z kampanii
          </button>

          <div className="mt-3 flex flex-wrap items-center gap-2">
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
      )}

      {hasVisibleThreats ? (
        <div className="flex flex-col gap-3">
          {groupedThreats.frontSections.map((section) => (
            <section key={section.front.id} className="app-panel overflow-hidden rounded-[1.45rem]">
              <div className="flex items-center justify-between border-b border-[rgba(210,166,67,0.22)] bg-[rgba(242,196,88,0.12)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setCollapsedGroups((prev) => {
                      const next = new Set(prev);
                      const key = `front:${section.front.id}`;
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    });
                  }}
                  className="flex items-center gap-1.5"
                >
                  <ChevronRight
                    className={`text-surface-400 h-3.5 w-3.5 transition-transform ${
                      collapsedGroups.has(`front:${section.front.id}`) ? '' : 'rotate-90'
                    }`}
                  />
                  <span className="text-surface-600 text-xs font-semibold tracking-[0.16em] uppercase">
                    Front
                  </span>
                </button>

                <div className="ml-2 flex min-w-0 items-center gap-2">
                  <Link
                    to={`/fronts/${section.front.id}`}
                    state={sessionId ? { returnToSessionLive: sessionId } : undefined}
                    className="truncate text-xs font-semibold tracking-[0.16em] text-orange-700 uppercase hover:underline"
                  >
                    {section.front.name}
                  </Link>
                  <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-orange-200 ring-inset">
                    {section.rows.length}
                  </span>
                </div>
              </div>

              {!collapsedGroups.has(`front:${section.front.id}`) && (
                <div className="flex flex-col gap-3 p-3">
                  {section.rows.map((row) => renderThreatCard(row))}
                </div>
              )}
            </section>
          ))}

          {groupedThreats.freeRows.length > 0 && (
            <section className="app-panel overflow-hidden rounded-[1.45rem]">
              <div className="flex items-center justify-between border-b border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.48)] px-4 py-3">
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
                    Wolne zagrożenia
                  </span>
                </button>
                <span className="text-surface-600 ring-surface-200 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset">
                  {groupedThreats.freeRows.length}
                </span>
              </div>

              {!collapsedGroups.has('free') && (
                <div className="flex flex-col gap-3 p-3">
                  {groupedThreats.freeRows.map((row) => renderThreatCard(row))}
                </div>
              )}
            </section>
          )}
        </div>
      ) : (
        <div className="app-input-shell text-surface-500 rounded-[1.25rem] border-dashed px-4 py-4 text-sm">
          Brak zagrożeń dla wybranego filtra.
        </div>
      )}

      {hasOrphans && (
        <div className="app-panel flex flex-col gap-3 rounded-[1.45rem] p-4">
          {hasVisibleThreats && (
            <p className="text-surface-500 text-xs font-semibold tracking-[0.18em] uppercase">
              Pozostałe zegary
            </p>
          )}

          {orphanClocks!.map((clock) => {
            const clockData = getClockData(clock);
            const percent = Math.round((clockData.filled / clockData.segments) * 100);
            const currentTickLabel =
              clockData.tickLabels?.[Math.max(0, clockData.filled - 1)] ??
              `${clockData.filled}/${clockData.segments}`;
            const nextTickLabel =
              clockData.filled < clockData.segments
                ? (clockData.tickLabels?.[clockData.filled] ??
                  `${clockData.filled + 1}/${clockData.segments}`)
                : null;

            return (
              <div
                key={clock.id}
                className="app-input-shell flex flex-col gap-2 rounded-[1.2rem] px-3 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-surface-700 min-w-0 flex-1 truncate text-xs font-medium">
                    {clock.name}
                  </span>
                  <div className="flex items-center gap-px">
                    {Array.from({ length: clockData.segments }).map((_, index) => (
                      <div
                        key={index}
                        className={`h-2.5 w-3 rounded-sm border ${
                          index < clockData.filled
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-surface-300 bg-surface-100'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-surface-500 w-7 text-right text-xs">{percent}%</span>
                  <button
                    type="button"
                    onClick={() => void tick(db, clock, sessionId)}
                    disabled={clockData.filled >= clockData.segments}
                    className="app-button-primary rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40"
                    title="Zwiększ zegar o 1 segment"
                  >
                    Tick +1
                  </button>
                </div>

                <div className="text-xs">
                  <p className="text-surface-700">
                    <span className="text-surface-400">Teraz: </span>
                    {currentTickLabel}
                  </p>
                  {nextTickLabel && (
                    <p className="text-surface-400 italic">
                      <span className="not-italic">Następnie: </span>
                      {nextTickLabel}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewThreatId && (
        <ThreatPreviewModal
          threatId={previewThreatId}
          sessionId={sessionId}
          onClose={() => setPreviewThreatId(null)}
        />
      )}

      {campaignPickerOpen && sessionId && (
        <ThreatCampaignPickerModal
          excludedIds={new Set((threatRows ?? []).map((row) => row.threat.id))}
          onAdd={handleAddFromCampaign}
          onClose={() => setCampaignPickerOpen(false)}
        />
      )}
    </div>
  );
}
