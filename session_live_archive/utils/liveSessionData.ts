import type { MgHelperDb } from '@shared/db/database';
import type { Entity, Relation } from '@shared/types';
import { isLocation } from '@modules/locations/types';
import type { Location } from '@modules/locations/types';
import { isNpc } from '@modules/npcs/types';
import type { Npc } from '@modules/npcs/types';
import { isThread } from '@modules/threads/types';
import type { Thread } from '@modules/threads/types';
import { isThreat } from '@modules/fronts/types';
import type { Threat } from '@modules/fronts/types';
import { getDraftLocationId } from './draftScene';

async function listRelationSourceIdsByTarget(
  db: MgHelperDb,
  targetId: string,
  relationType: Relation['type'],
): Promise<string[]> {
  const relations = await db.relations
    .where('targetId')
    .equals(targetId)
    .filter((relation) => relation.type === relationType)
    .toArray();

  return relations.map((relation) => relation.sourceId);
}

async function listRelationTargetsBySource(
  db: MgHelperDb,
  sourceId: string,
  relationType: Relation['type'],
): Promise<string[]> {
  const relations = await db.relations
    .where('sourceId')
    .equals(sourceId)
    .filter((relation) => relation.type === relationType)
    .toArray();

  return relations.map((relation) => relation.targetId);
}

async function getEntitiesByIds(db: MgHelperDb, ids: string[]): Promise<Entity[]> {
  if (ids.length === 0) return [];
  return db.entities.where('id').anyOf(ids).toArray();
}

export async function getLiveLocation(
  db: MgHelperDb,
  locationId: string | null,
): Promise<Location | null> {
  if (!locationId) return null;
  const entity = await db.entities.get(locationId);
  return entity && isLocation(entity) ? entity : null;
}

export async function getSessionThreads(db: MgHelperDb, sessionId: string): Promise<Thread[]> {
  const ids = await listRelationSourceIdsByTarget(db, sessionId, 'appears_in');
  const entities = await getEntitiesByIds(db, ids);
  return entities
    .filter(isThread)
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export async function getSessionThreadIds(db: MgHelperDb, sessionId: string): Promise<string[]> {
  const threads = await getSessionThreads(db, sessionId);
  return threads.map((thread) => thread.id);
}

export interface SessionThreadGroup {
  threat: Threat;
  threads: Thread[];
}

export interface SessionThreadBoardData {
  threatGroups: SessionThreadGroup[];
  freeThreads: Thread[];
}

export async function getSessionThreadBoardData(
  db: MgHelperDb,
  sessionId: string,
): Promise<SessionThreadBoardData> {
  const sessionThreads = await getSessionThreads(db, sessionId);
  if (sessionThreads.length === 0) {
    return { threatGroups: [], freeThreads: [] };
  }

  const threadIds = sessionThreads.map((thread) => thread.id);
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

  const candidateThreatIds = new Set<string>();
  for (const relation of outgoingAffects) {
    candidateThreatIds.add(relation.targetId);
  }
  for (const relation of incomingAffects) {
    candidateThreatIds.add(relation.sourceId);
  }

  const relatedEntities = await getEntitiesByIds(db, [...candidateThreatIds]);
  const threatMap = new Map(
    relatedEntities
      .filter(isThreat)
      .map((threat) => [threat.id, threat] as const),
  );

  const threadThreatIds = new Map<string, Set<string>>();
  for (const thread of sessionThreads) {
    threadThreatIds.set(thread.id, new Set<string>());
  }

  for (const relation of outgoingAffects) {
    if (threatMap.has(relation.targetId)) {
      threadThreatIds.get(relation.sourceId)?.add(relation.targetId);
    }
  }

  for (const relation of incomingAffects) {
    if (threatMap.has(relation.sourceId)) {
      threadThreatIds.get(relation.targetId)?.add(relation.sourceId);
    }
  }

  const threatGroupsMap = new Map<string, Thread[]>();
  const freeThreads: Thread[] = [];

  for (const thread of sessionThreads) {
    const relatedThreatIds = [...(threadThreatIds.get(thread.id) ?? new Set<string>())];
    if (relatedThreatIds.length === 0) {
      freeThreads.push(thread);
      continue;
    }

    for (const threatId of relatedThreatIds) {
      const bucket = threatGroupsMap.get(threatId) ?? [];
      bucket.push(thread);
      threatGroupsMap.set(threatId, bucket);
    }
  }

  const threatGroups = [...threatGroupsMap.entries()]
    .map(([threatId, threads]) => {
      const threat = threatMap.get(threatId);
      if (!threat) return null;
      return { threat, threads };
    })
    .filter((group): group is SessionThreadGroup => group !== null)
    .sort((a, b) => a.threat.name.localeCompare(b.threat.name, 'pl'));

  return { threatGroups, freeThreads };
}

export async function getSessionThreatCount(db: MgHelperDb, sessionId: string): Promise<number> {
  const ids = await listRelationSourceIdsByTarget(db, sessionId, 'appears_in');
  const entities = await getEntitiesByIds(db, ids);
  return entities.filter((entity) => entity.type === 'threat').length;
}

export async function getContainedNpcs(db: MgHelperDb, locationId: string | null): Promise<Npc[]> {
  if (!locationId) return [];
  const ids = await listRelationTargetsBySource(db, locationId, 'contains');
  const entities = await getEntitiesByIds(db, ids);
  return entities
    .filter(isNpc)
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export async function getContainedNpcIds(db: MgHelperDb, locationId: string | null): Promise<string[]> {
  const npcs = await getContainedNpcs(db, locationId);
  return npcs.map((npc) => npc.id);
}

export async function getDraftSceneNpcs(db: MgHelperDb, sessionId: string): Promise<Npc[]> {
  return getContainedNpcs(db, getDraftLocationId(sessionId));
}

export async function getCurrentSceneNpcIds(
  db: MgHelperDb,
  sessionId: string,
  currentLocationId: string | null,
): Promise<string[]> {
  const locationId = currentLocationId ?? getDraftLocationId(sessionId);
  return getContainedNpcIds(db, locationId);
}

export interface SessionNpcPanelData {
  npcs: Npc[];
  locationRelIds: Map<string, string>;
  draftRelIds: Map<string, string>;
}

export async function getSessionNpcPanelData(
  db: MgHelperDb,
  sessionId: string,
  locationId: string | null,
): Promise<SessionNpcPanelData> {
  const sessionNpcIds = await listRelationSourceIdsByTarget(db, sessionId, 'appears_in');
  const entities = await getEntitiesByIds(db, sessionNpcIds);
  const npcs = entities
    .filter(isNpc)
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  const locationRelIds = new Map<string, string>();
  const draftRelIds = new Map<string, string>();

  if (npcs.length === 0) {
    return { npcs, locationRelIds, draftRelIds };
  }

  const containsRelations = await db.relations
    .where('targetId')
    .anyOf(npcs.map((npc) => npc.id))
    .filter((relation) => relation.type === 'contains')
    .toArray();

  const draftLocationId = getDraftLocationId(sessionId);

  for (const relation of containsRelations) {
    if (locationId && relation.sourceId === locationId) {
      locationRelIds.set(relation.targetId, relation.id);
    }
    if (relation.sourceId === draftLocationId) {
      draftRelIds.set(relation.targetId, relation.id);
    }
  }

  return { npcs, locationRelIds, draftRelIds };
}
