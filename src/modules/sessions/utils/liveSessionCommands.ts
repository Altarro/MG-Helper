import { createLocationData } from '@modules/locations/types';
import { recordNpcLocationHistory } from '@modules/npcs/locationHistory';
import type { Thread } from '@modules/threads/types';
import { getThreadData } from '@shared/utils/entityData';
import type { MgHelperDb } from '@shared/db/database';
import {
  addEntity,
  addRelation,
  assignContainment,
  deleteRelation,
  removeContainment,
  updateEntity,
} from '@shared/db/operations';
import { ensureSessionDraftLocation } from './draftScene';

export async function ensureEntityAppearsInSession(
  db: MgHelperDb,
  entityId: string,
  sessionId: string,
): Promise<boolean> {
  const existing = await db.relations
    .where('sourceId')
    .equals(entityId)
    .filter((relation) => relation.type === 'appears_in' && relation.targetId === sessionId)
    .first();

  if (existing) return false;

  await addRelation(db, { type: 'appears_in', sourceId: entityId, targetId: sessionId });
  return true;
}

export async function ensureEntitiesAppearInSession(
  db: MgHelperDb,
  entityIds: string[],
  sessionId: string,
): Promise<number> {
  let addedCount = 0;

  for (const entityId of entityIds) {
    const added = await ensureEntityAppearsInSession(db, entityId, sessionId);
    if (added) addedCount += 1;
  }

  return addedCount;
}

export async function removeEntityFromSession(
  db: MgHelperDb,
  entityId: string,
  sessionId: string,
): Promise<boolean> {
  const relation = await db.relations
    .where('sourceId')
    .equals(entityId)
    .filter((item) => item.type === 'appears_in' && item.targetId === sessionId)
    .first();

  if (!relation) return false;

  await deleteRelation(db, relation.id);
  return true;
}

export async function moveNpcToLocation(
  db: MgHelperDb,
  options: {
    npcId: string;
    toLocationId: string;
    fromLocationId?: string | null;
    sessionId?: string | null;
  },
): Promise<void> {
  if (options.fromLocationId && options.fromLocationId !== options.toLocationId) {
    await removeContainment(db, options.npcId, options.fromLocationId);
  }

  await assignContainment(db, { sourceId: options.toLocationId, targetId: options.npcId });
  await recordNpcLocationHistory(db, {
    npcId: options.npcId,
    locationId: options.toLocationId,
    sessionId: options.sessionId,
  });
}

export async function setNpcCurrentLocation(
  db: MgHelperDb,
  npcId: string,
  locationId: string | null,
  sessionId?: string | null,
): Promise<void> {
  if (!locationId) {
    await removeContainment(db, npcId);
    return;
  }

  await assignContainment(db, { sourceId: locationId, targetId: npcId });
  await recordNpcLocationHistory(db, { npcId, locationId, sessionId });
}

export async function toggleSessionThreadStatus(
  db: MgHelperDb,
  thread: Thread,
): Promise<'active' | 'completed'> {
  const data = getThreadData(thread);
  const newStatus = data.status === 'active' ? 'completed' : 'active';
  await updateEntity(db, thread.id, { data: { ...data, status: newStatus } });
  return newStatus;
}

export async function createNamedSceneFromDraft(
  db: MgHelperDb,
  sessionId: string,
  sceneName: string,
) {
  const draftLocation = await ensureSessionDraftLocation(db, sessionId);
  const location = await addEntity(db, {
    type: 'location',
    name: sceneName,
    description: '',
    tags: [],
    data: createLocationData(),
  });

  await ensureEntityAppearsInSession(db, location.id, sessionId);

  const draftContains = await db.relations
    .where('sourceId')
    .equals(draftLocation.id)
    .filter((relation) => relation.type === 'contains')
    .toArray();

  await Promise.all(
    draftContains.map((relation) => db.relations.update(relation.id, { sourceId: location.id })),
  );

  return location;
}
