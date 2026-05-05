import { nowISO } from '@shared/utils/date';
import type { MgHelperDb } from '@shared/db/database';
import type { Entity, Relation } from '@shared/types';
import { createLocationData, isDraftLocation } from '@modules/locations/types';

export function getDraftLocationId(sessionId: string): string {
  return `draft-location:${sessionId}`;
}

export async function getSessionDraftLocation(
  db: MgHelperDb,
  sessionId: string,
): Promise<Entity | null> {
  const entity = await db.entities.get(getDraftLocationId(sessionId));
  if (entity && isDraftLocation(entity)) return entity;
  return null;
}

export async function ensureSessionDraftLocation(
  db: MgHelperDb,
  sessionId: string,
): Promise<Entity> {
  const draftId = getDraftLocationId(sessionId);
  const existing = await db.entities.get(draftId);
  const now = nowISO();

  let draft: Entity;
  if (existing && isDraftLocation(existing)) {
    draft = {
      ...existing,
      updatedAt: now,
      data: { ...existing.data, isDraft: true },
    };
  } else {
    draft = {
      id: draftId,
      type: 'location',
      name: '',
      description: '',
      tags: [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      data: createLocationData({
        locationType: 'room',
        isDraft: true,
      }),
    };
  }

  const appearsInRelation: Relation = {
    id: `draft-location-appears-in:${sessionId}`,
    type: 'appears_in',
    sourceId: draftId,
    targetId: sessionId,
    createdAt: now,
  };

  await db.transaction('rw', db.entities, db.relations, async () => {
    await db.entities.put(draft);
    await db.relations.put(appearsInRelation);
  });

  return draft;
}
