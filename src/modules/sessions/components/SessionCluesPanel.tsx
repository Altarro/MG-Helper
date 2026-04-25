import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation } from 'react-router';
import { ChevronRight, Link2 } from 'lucide-react';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Entity } from '@shared/types';
import { CLUE_TYPE_LABELS, normalizeClueTypes } from '@modules/clues/types';

interface SessionCluesPanelProps {
  sessionId: string;
}

type ClueFilter = 'all' | 'discovered' | 'hidden';

interface ClueRow {
  clue: Entity;
  targetType: 'front' | 'threat' | 'thread' | 'free';
  targetId: string | null;
  targetName: string;
  subtitle: string | null;
}

export function SessionCluesPanel({ sessionId }: SessionCluesPanelProps) {
  const { db } = useCampaign();
  const location = useLocation();
  const [filter, setFilter] = useState<ClueFilter>('all');

  const clueRows = useLiveQuery(async () => {
    const appearsIn = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((relation) => relation.type === 'appears_in')
      .toArray();

    const sessionEntityIds = [...new Set(appearsIn.map((relation) => relation.sourceId))];
    if (sessionEntityIds.length === 0) return [] as ClueRow[];

    const sessionEntities = await db.entities.where('id').anyOf(sessionEntityIds).toArray();
    const sessionEntityMap = new Map(sessionEntities.map((entity) => [entity.id, entity]));
    const targetEntities = sessionEntities.filter(
      (entity) =>
        entity.type === 'front' || entity.type === 'threat' || entity.type === 'thread',
    );
    const targetIds = targetEntities.map((entity) => entity.id);

    const clueLinks =
      targetIds.length > 0
        ? await db.relations
            .where('targetId')
            .anyOf(targetIds)
            .filter((relation) => relation.type === 'clues_for')
            .toArray()
        : [];

    const clueEntities = sessionEntities.filter((entity) => entity.type === 'clue');
    if (clueEntities.length === 0) return [] as ClueRow[];
    const clueMap = new Map(clueEntities.map((clue) => [clue.id, clue]));

    const linkedThreatIds = [...new Set(
      clueLinks
        .map((relation) => sessionEntityMap.get(relation.targetId))
        .filter((entity): entity is Entity => entity?.type === 'threat')
        .map((threat) => threat.id),
    )];

    const threatFrontRels =
      linkedThreatIds.length > 0
        ? await db.relations
            .where('sourceId')
            .anyOf(linkedThreatIds)
            .filter((relation) => relation.type === 'belongs_to')
            .toArray()
        : [];
    const frontIdsFromThreats = [...new Set(threatFrontRels.map((relation) => relation.targetId))];
    const extraFronts =
      frontIdsFromThreats.length > 0
        ? (
            await db.entities.where('id').anyOf(frontIdsFromThreats).toArray()
          ).filter((entity) => entity.type === 'front')
        : [];
    const frontMap = new Map(
      [...sessionEntities, ...extraFronts]
        .filter((entity): entity is Entity => entity.type === 'front')
        .map((front) => [front.id, front]),
    );
    const threatToFront = new Map<string, Entity>();
    for (const relation of threatFrontRels) {
      const front = frontMap.get(relation.targetId);
      if (front) threatToFront.set(relation.sourceId, front);
    }

    const linkedThreadIds = [...new Set(
      clueLinks
        .map((relation) => sessionEntityMap.get(relation.targetId))
        .filter((entity): entity is Entity => entity?.type === 'thread')
        .map((thread) => thread.id),
    )];

    const [affectsOut, affectsIn] = await Promise.all([
      linkedThreadIds.length > 0
        ? db.relations
            .where('sourceId')
            .anyOf(linkedThreadIds)
            .filter((relation) => relation.type === 'affects')
            .toArray()
        : Promise.resolve([]),
      linkedThreadIds.length > 0
        ? db.relations
            .where('targetId')
            .anyOf(linkedThreadIds)
            .filter((relation) => relation.type === 'affects')
            .toArray()
        : Promise.resolve([]),
    ]);

    const affectedThreatCandidateIds = [...new Set([
      ...affectsOut.map((relation) => relation.targetId),
      ...affectsIn.map((relation) => relation.sourceId),
    ])];
    const affectedThreats =
      affectedThreatCandidateIds.length > 0
        ? (
            await db.entities.where('id').anyOf(affectedThreatCandidateIds).toArray()
          ).filter((entity) => entity.type === 'threat')
        : [];
    const affectedThreatMap = new Map(affectedThreats.map((threat) => [threat.id, threat]));

    const threadToThreatNames = new Map<string, string[]>();
    for (const relation of affectsOut) {
      const threat = affectedThreatMap.get(relation.targetId);
      if (!threat) continue;
      const list = threadToThreatNames.get(relation.sourceId) ?? [];
      if (!list.includes(threat.name)) list.push(threat.name);
      threadToThreatNames.set(relation.sourceId, list);
    }
    for (const relation of affectsIn) {
      const threat = affectedThreatMap.get(relation.sourceId);
      if (!threat) continue;
      const list = threadToThreatNames.get(relation.targetId) ?? [];
      if (!list.includes(threat.name)) list.push(threat.name);
      threadToThreatNames.set(relation.targetId, list);
    }

    const linkedRows: ClueRow[] = [];
    const linkedClueIds = new Set<string>();

    for (const relation of clueLinks) {
      const clue = clueMap.get(relation.sourceId);
      const target = sessionEntityMap.get(relation.targetId);
      if (!clue || !target) continue;
      linkedClueIds.add(clue.id);

      if (target.type === 'front') {
        linkedRows.push({
          clue,
          targetType: 'front',
          targetId: target.id,
          targetName: target.name,
          subtitle: null,
        });
        continue;
      }

      if (target.type === 'threat') {
        const front = threatToFront.get(target.id);
        linkedRows.push({
          clue,
          targetType: 'threat',
          targetId: target.id,
          targetName: target.name,
          subtitle: front ? `Front: ${front.name}` : null,
        });
        continue;
      }

      if (target.type === 'thread') {
        const threatNames = threadToThreatNames.get(target.id) ?? [];
        linkedRows.push({
          clue,
          targetType: 'thread',
          targetId: target.id,
          targetName: target.name,
          subtitle: threatNames.length > 0 ? `Zagrożenie: ${threatNames.join(', ')}` : null,
        });
      }
    }

    const freeRows = clueEntities
      .filter((clue) => !linkedClueIds.has(clue.id))
      .map((clue) => ({
        clue,
        targetType: 'free' as const,
        targetId: null,
        targetName: 'Wolne wskazówki',
        subtitle: null,
      }));

    return [...linkedRows, ...freeRows].sort((a, b) => a.clue.name.localeCompare(b.clue.name, 'pl'));
  }, [db, sessionId]);

  const filteredRows = useMemo(() => {
    const rows = clueRows ?? [];
    if (filter === 'all') return rows;
    return rows.filter((row) =>
      filter === 'discovered'
        ? row.clue.data.discovered
        : !row.clue.data.discovered,
    );
  }, [clueRows, filter]);

  const grouped = useMemo(() => {
    const frontGroups = new Map<string, { name: string; rows: ClueRow[] }>();
    const threatGroups = new Map<string, { name: string; subtitle: string | null; rows: ClueRow[] }>();
    const threadGroups = new Map<string, { name: string; subtitle: string | null; rows: ClueRow[] }>();
    const freeRows: ClueRow[] = [];

    for (const row of filteredRows) {
      if (row.targetType === 'free') {
        freeRows.push(row);
        continue;
      }

      if (!row.targetId) continue;
      if (row.targetType === 'front') {
        const bucket = frontGroups.get(row.targetId) ?? { name: row.targetName, rows: [] };
        bucket.rows.push(row);
        frontGroups.set(row.targetId, bucket);
        continue;
      }
      if (row.targetType === 'threat') {
        const bucket = threatGroups.get(row.targetId) ?? {
          name: row.targetName,
          subtitle: row.subtitle,
          rows: [],
        };
        bucket.rows.push(row);
        threatGroups.set(row.targetId, bucket);
        continue;
      }
      if (row.targetType === 'thread') {
        const bucket = threadGroups.get(row.targetId) ?? {
          name: row.targetName,
          subtitle: row.subtitle,
          rows: [],
        };
        bucket.rows.push(row);
        threadGroups.set(row.targetId, bucket);
      }
    }

    const sortByName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'pl');
    return {
      front: [...frontGroups.values()].sort(sortByName),
      threat: [...threatGroups.values()].sort(sortByName),
      thread: [...threadGroups.values()].sort(sortByName),
      free: freeRows,
    };
  }, [filteredRows]);

  const returnToSessionLive =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnToSessionLive' in location.state &&
    typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : sessionId;

  return (
    <div className="flex flex-col gap-3">
      <div className="app-panel rounded-[1.45rem] p-4">
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-surface-500 text-xs font-semibold tracking-[0.18em] uppercase">
              Wskazówki w sesji
            </p>
            <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 ring-1 ring-primary-200 ring-inset">
              {filteredRows.length}
            </span>
          </div>
          <p className="text-surface-700 mt-1 text-sm">
            Tropy i ich powiązania fabularne w układzie front/zagrożenie oraz wątek/zagrożenie.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', 'Wszystkie'],
              ['discovered', 'Odkryte'],
              ['hidden', 'Ukryte'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                filter === value
                  ? 'app-pill'
                  : 'app-pill-muted hover:bg-[rgba(229,231,223,0.98)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="app-input-shell text-surface-500 rounded-[1.25rem] border-dashed px-4 py-4 text-sm">
          Brak wskazówek dla wybranego filtra.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[
            ...grouped.front.map((section) => ({
              key: `front:${section.name}`,
              titleLabel: 'Front',
              titleValue: section.name,
              subtitle: null as string | null,
              rows: section.rows,
              tone: 'accent' as const,
            })),
            ...grouped.threat.map((section) => ({
              key: `threat:${section.name}`,
              titleLabel: 'Zagrożenie',
              titleValue: section.name,
              subtitle: section.subtitle,
              rows: section.rows,
              tone: 'neutral' as const,
            })),
            ...grouped.thread.map((section) => ({
              key: `thread:${section.name}`,
              titleLabel: 'Wątek',
              titleValue: section.name,
              subtitle: section.subtitle,
              rows: section.rows,
              tone: 'neutral' as const,
            })),
            ...(grouped.free.length > 0
              ? [{
                  key: 'free',
                  titleLabel: 'Wolne',
                  titleValue: 'Wskazówki',
                  subtitle: null as string | null,
                  rows: grouped.free,
                  tone: 'muted' as const,
                }]
              : []),
          ].map((section) => (
            <section key={section.key} className="app-panel overflow-hidden rounded-[1.25rem]">
              <div
                className={`flex items-center justify-between px-3 py-2.5 ${
                  section.tone === 'accent'
                    ? 'border-b border-[rgba(210,166,67,0.22)] bg-[rgba(242,196,88,0.12)]'
                    : 'border-b border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.48)]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ChevronRight className="text-surface-400 h-3.5 w-3.5" />
                    <span className="text-surface-600 text-xs font-semibold tracking-[0.16em] uppercase">
                      {section.titleLabel}
                    </span>
                  </div>
                  <p
                    className={`mt-1 truncate pl-5 text-sm font-semibold ${
                      section.tone === 'accent' ? 'text-orange-700' : 'text-primary-800'
                    }`}
                  >
                    {section.titleValue}
                  </p>
                  {section.subtitle ? (
                    <p className="text-surface-500 mt-0.5 truncate pl-5 text-[11px]">{section.subtitle}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-orange-200 ring-inset">
                  {section.rows.length}
                </span>
              </div>

              <ul className="divide-surface-100 divide-y">
                {section.rows.map((row) => (
                  <li
                    key={`${section.key}:${row.clue.id}`}
                    className="hover:bg-[rgba(229,231,223,0.98)] transition-colors"
                  >
                    <div className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <Link2 className="text-surface-400 h-3.5 w-3.5 shrink-0" />
                        <Link
                          to={`/clues/${row.clue.id}`}
                          state={{ returnToSessionLive }}
                          className="text-primary-800 min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                        >
                          {row.clue.name}
                        </Link>
                        <div className="hidden min-w-0 shrink flex-wrap gap-1 sm:flex">
                          {normalizeClueTypes(row.clue.data.clueTypes).map((type) => (
                            <span key={type} className="app-pill-muted rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                              {CLUE_TYPE_LABELS[type]}
                            </span>
                          ))}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            row.clue.data.discovered
                              ? 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800'
                              : 'app-pill-muted'
                          }`}
                        >
                          {row.clue.data.discovered ? 'Odkryta' : 'Ukryta'}
                        </span>
                      </div>
                      {row.clue.data.hint ? (
                        <p className="text-surface-600 mt-1 line-clamp-1 pl-5 text-xs leading-5">
                          {String(row.clue.data.hint)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

