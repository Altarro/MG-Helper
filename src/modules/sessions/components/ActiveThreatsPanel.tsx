import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, Search, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { useCampaign } from '@shared/db/CampaignContext';
import type { MgHelperDb } from '@shared/db/database';
import { isClock } from '@modules/clocks/types';
import type { Clock } from '@modules/clocks/types';
import type { Entity } from '@shared/types';
import { getClockData, getThreatData, getThreatStatus } from '@shared/utils/entityData';
import { addRelation, updateEntity } from '@shared/db/operations';
import { TickProgress } from '@shared/components/TickProgress';
import { ClueSection } from '@shared/components/ClueSection';
import { ThreatPreviewModal } from './ThreatPreviewModal';
import { toast } from 'sonner';
import { Modal } from '@shared/components/Modal';

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

function ThreatCampaignPickerModal({ excludedIds, onAdd, onClose }: ThreatCampaignPickerModalProps) {
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const entities = useLiveQuery(
    () => db.entities.where('type').equals('threat').toArray(),
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
    <Modal title="Dodaj zagrożenia z kampanii" size="md" onClose={onClose}>
      <div className="mb-3 flex items-center gap-2 rounded-md border border-surface-200 px-2.5 py-2">
        <Search className="h-3.5 w-3.5 text-surface-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj zagrożeń..."
          className="w-full text-sm outline-none placeholder:text-surface-400"
          autoFocus
        />
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border border-surface-200">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-surface-400">
            {available.length === 0 ? 'Wszystkie zagrożenia kampanii są już w sesji.' : 'Brak wyników.'}
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
          {selected.size > 0 ? `Wybrano: ${selected.size}` : 'Wybierz zagrożenia do dodania'}
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

// Returns all session-scoped threats with optional tracked clock + parent front
function useThreatRows(db: MgHelperDb, sessionId?: string) {
  return useLiveQuery(async () => {
    let sessionEntityIds: Set<string> | null = null;
    if (sessionId) {
      const rels = await db.relations
        .where('targetId')
        .equals(sessionId)
        .filter((r) => r.type === 'appears_in')
        .toArray();
      sessionEntityIds = new Set(rels.map((r) => r.sourceId));
    }

    const threats = await db.entities.where('type').equals('threat').toArray();
    const scopedThreats = sessionEntityIds
      ? threats.filter((threat) => sessionEntityIds.has(threat.id))
      : threats;

    const scopedThreatIds = scopedThreats.map((threat) => threat.id);
    const belongsToRelations = scopedThreatIds.length > 0
      ? await db.relations
        .where('sourceId')
        .anyOf(scopedThreatIds)
        .filter((relation) => relation.type === 'belongs_to')
        .toArray()
      : [];
    const frontIds = [...new Set(belongsToRelations.map((relation) => relation.targetId))];
    const fronts = frontIds.length > 0
      ? await db.entities.where('id').anyOf(frontIds).toArray()
      : [];
    const frontMap = new Map(
      fronts
        .filter((entity) => entity.type === 'front')
        .map((front) => [front.id, front] as const),
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
          .filter((r) => r.type === 'tracks')
          .first();
        if (!trackRel) return { threat, clock: null, front: threatFrontMap.get(threat.id) ?? null };

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

// Returns active clocks NOT linked to any threat
function useOrphanClocks(db: MgHelperDb, sessionId?: string) {
  return useLiveQuery(async () => {
    const clocks = await db.entities.where('type').equals('clock').toArray();
    const active = clocks.filter(isClock).filter((c) => {
      const d = getClockData(c);
      return d.filled < d.segments && d.isActive !== false;
    });
    const results: (Clock | null)[] = await Promise.all(
      active.map(async (clock) => {
        const rels = await db.relations
          .where('targetId').equals(clock.id)
          .filter((r) => r.type === 'tracks')
          .toArray();
        return rels.length === 0 ? clock : null;
      }),
    );
    return results.filter((c): c is Clock => c !== null);
  }, [db, sessionId]);
}

async function tick(db: MgHelperDb, clock: Clock) {
  const d = getClockData(clock);
  if (d.filled >= d.segments) return;
  const newFilled = d.filled + 1;
  await updateEntity(db, clock.id, { data: { ...d, filled: newFilled } });
  if (newFilled >= d.segments) toast.success(`Zegar „${clock.name}” wypełniony!`);
}

export function ActiveThreatsPanel({ sessionId }: { sessionId?: string }) {
  const { db } = useCampaign();
  const [previewThreatId, setPreviewThreatId] = useState<string | null>(null);
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ThreatStatusFilter>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const threatRows = useThreatRows(db, sessionId);
  const orphanClocks = useOrphanClocks(db, sessionId);

  const hasOrphans = orphanClocks && orphanClocks.length > 0;
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
  }, [threatRows, statusFilter]);
  const hasVisibleThreats = groupedThreats.frontSections.length > 0 || groupedThreats.freeRows.length > 0;

  if (!hasVisibleThreats && !hasOrphans) {
    return <p className="p-2 text-xs text-surface-400">Brak zagrożeń i zegarów w tej sesji.</p>;
  }

  async function toggleThreatStatus(row: ThreatRow) {
    const currentStatus = getThreatStatus(row.threat);
    const nextStatus = currentStatus === 'active' ? 'completed' : 'active';
    const threatData = getThreatData(row.threat);
    const existingReason = typeof threatData.reasonOfDead === 'string'
      ? threatData.reasonOfDead.trim()
      : '';
    const nextReason = nextStatus === 'completed' ? (existingReason || '') : '';
    try {
      await updateEntity(db, row.threat.id, {
        data: {
          ...row.threat.data,
          status: nextStatus,
          reasonOfDead: nextReason,
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
      toast.success(nextStatus === 'completed' ? 'Zagrożenie zakończone' : 'Zagrożenie aktywowane');
    } catch {
      toast.error('Nie udało się zmienić statusu zagrożenia');
    }
  }

  function renderThreatCard(row: ThreatRow) {
    const { threat, clock } = row;
    const d = clock ? getClockData(clock) : null;
    const pct = d ? Math.round((d.filled / d.segments) * 100) : null;
    const currentTickLabel = d
      ? (d.tickLabels?.[Math.max(0, d.filled - 1)] ?? `${d.filled}/${d.segments}`)
      : 'Brak zegara';
    const nextTickLabel = d
      ? (d.filled < d.segments
        ? (d.tickLabels?.[d.filled] ?? `${d.filled + 1}/${d.segments}`)
        : null)
      : null;

    const isCompleted = getThreatStatus(threat) === 'completed';

    return (
      <div key={threat.id} className={`flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-3 shadow-sm ${isCompleted ? 'opacity-70' : ''}`}>
        <div className="flex w-full items-center gap-1.5 min-w-0">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <Link
            to={`/threats/${threat.id}`}
            state={sessionId ? { returnToSessionLive: sessionId } : undefined}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-primary-700 hover:underline"
            title="Otwórz pełną kartę zagrożenia"
          >
            {threat.name}
          </Link>
          <button
            type="button"
            onClick={() => setPreviewThreatId(threat.id)}
            className="shrink-0 rounded-md border border-surface-200 bg-white px-1.5 py-0.5 text-[11px] text-surface-600 hover:border-primary-200 hover:text-primary-700"
          >
            Podgląd
          </button>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            isCompleted ? 'bg-surface-200 text-surface-600' : 'bg-green-100 text-green-700'
          }`}>
            {isCompleted ? 'Zakończone' : 'Aktywne'}
          </span>
          <button
            type="button"
            onClick={() => void toggleThreatStatus(row)}
            className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] ${
              isCompleted
                ? 'border-green-200 text-green-700 hover:bg-green-50'
                : 'border-surface-200 text-surface-700 hover:bg-surface-50'
            }`}
          >
            {isCompleted ? 'Wznów' : 'Zakończ'}
          </button>
        </div>
        {d && clock ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50/70 px-2 py-1.5">
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-surface-600">{clock.name}</span>
            <div className="flex items-center gap-px">
              {Array.from({ length: d.segments }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 w-3 rounded-sm border ${
                    i < d.filled
                      ? 'border-amber-500 bg-amber-500'
                      : 'border-surface-300 bg-surface-100'
                  }`}
                />
              ))}
            </div>
            <span className="w-7 shrink-0 text-right text-xs text-surface-400">{pct}%</span>
            <button
              onClick={() => void tick(db, clock)}
              disabled={d.filled >= d.segments}
              className="rounded-md border border-primary-200 bg-white px-2 py-0.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-40"
              title="Zwiększ zegar o 1 segment"
            >
              Tick +1
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-surface-50 px-2 py-1.5 text-xs text-surface-500">
            Brak aktywnego zegara
          </div>
        )}
        {d?.tickLabels && d.tickLabels.length > 0 ? (
          <TickProgress
            tickLabels={d.tickLabels}
            filled={d.filled}
            segments={d.segments}
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
      await Promise.all(
        entityIds.map((entityId) =>
          addRelation(db, { type: 'appears_in', sourceId: entityId, targetId: sessionId })),
      );
      toast.success(`Dodano ${entityIds.length} ${entityIds.length === 1 ? 'zagrożenie' : 'zagrożenia'} z kampanii`);
    } catch {
      toast.error('Nie udało się dodać zagrożeń z kampanii');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {sessionId && (
        <div className="rounded-xl border border-surface-200 bg-surface-50 p-2">
          <button
            type="button"
            onClick={() => setCampaignPickerOpen(true)}
            className="w-full rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-700 transition-colors hover:bg-surface-50"
          >
            Dodaj z kampanii
          </button>
          <div className="mt-2 flex items-center gap-1">
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
      )}

      {/* Threats grouped by fronts */}
      {hasVisibleThreats ? (
        <div className="flex flex-col gap-3">
          {groupedThreats.frontSections.map((section) => (
            <section key={section.front.id} className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-surface-200 bg-orange-50/70 px-3 py-2">
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
                  <ChevronRight className={`h-3.5 w-3.5 text-surface-400 transition-transform ${collapsedGroups.has(`front:${section.front.id}`) ? '' : 'rotate-90'}`} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-surface-600">Front</span>
                </button>
                <div className="ml-2 flex min-w-0 items-center gap-2">
                  <Link
                    to={`/fronts/${section.front.id}`}
                    state={sessionId ? { returnToSessionLive: sessionId } : undefined}
                    className="truncate text-xs font-semibold uppercase tracking-wide text-orange-700 hover:underline"
                  >
                    {section.front.name}
                  </Link>
                  <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-200">
                    {section.rows.length}
                  </span>
                </div>
              </div>
              {!collapsedGroups.has(`front:${section.front.id}`) && (
                <div className="flex flex-col gap-2 p-2">
                  {section.rows.map((row) => renderThreatCard(row))}
                </div>
              )}
            </section>
          ))}
          {groupedThreats.freeRows.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-surface-200 bg-surface-50 px-3 py-2">
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
                  <ChevronRight className={`h-3.5 w-3.5 text-surface-400 transition-transform ${collapsedGroups.has('free') ? '' : 'rotate-90'}`} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-surface-600">Wolne zagrożenia</span>
                </button>
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-surface-600 ring-1 ring-inset ring-surface-200">
                  {groupedThreats.freeRows.length}
                </span>
              </div>
              {!collapsedGroups.has('free') && (
                <div className="flex flex-col gap-2 p-2">
                  {groupedThreats.freeRows.map((row) => renderThreatCard(row))}
                </div>
              )}
            </section>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-surface-200 bg-surface-50 p-3 text-xs text-surface-500">
          Brak zagrożeń dla wybranego filtra.
        </div>
      )}

      {/* Orphan clocks */}
      {hasOrphans && (
        <div className="flex flex-col gap-2 rounded-xl border border-surface-200 bg-white p-3 shadow-sm">
          {hasVisibleThreats && (
            <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">Pozostałe zegary</p>
          )}
          {orphanClocks!.map((c) => {
            const d = getClockData(c);
            const pct = Math.round((d.filled / d.segments) * 100);
            const currentTickLabel = d.tickLabels?.[Math.max(0, d.filled - 1)] ?? `${d.filled}/${d.segments}`;
            const nextTickLabel = d.filled < d.segments
              ? (d.tickLabels?.[d.filled] ?? `${d.filled + 1}/${d.segments}`)
              : null;
            return (
              <div key={c.id} className="flex flex-col gap-2 rounded-lg bg-surface-50 px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-surface-700">{c.name}</span>
                  <div className="flex items-center gap-px">
                    {Array.from({ length: d.segments }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2.5 w-3 rounded-sm border ${
                          i < d.filled
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-surface-300 bg-surface-100'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="w-7 text-right text-xs text-surface-400">{pct}%</span>
                  <button
                    onClick={() => tick(db, c)}
                    disabled={d.filled >= d.segments}
                  className="rounded-md border border-primary-200 bg-white px-2 py-0.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-40"
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
        <ThreatPreviewModal threatId={previewThreatId} sessionId={sessionId} onClose={() => setPreviewThreatId(null)} />
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
