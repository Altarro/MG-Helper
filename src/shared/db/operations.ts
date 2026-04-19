import { isRelationAllowed } from './relationRules';
import {
  findContainsParentConflict,
  findDuplicateRelation,
  normalizeRelationLabel,
} from './relationIntegrity';
import { generateId } from '@shared/utils/id';
import { nowISO } from '@shared/utils/date';
import { sanitizeHtml } from '@shared/utils/sanitize';
import type { Entity, EntityUpdate, NewEntity, NewRelation, Relation } from '@shared/types';
import type { MgHelperDb } from './database';

// ─── Entities ────────────────────────────────────────────────────────────────

export async function addEntity(db: MgHelperDb, data: NewEntity): Promise<Entity> {
  const now = nowISO();
  const entity: Entity = {
    ...data,
    description: sanitizeHtml(data.description),
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.entities.add(entity);
  return entity;
}

export async function updateEntity(db: MgHelperDb, id: string, changes: EntityUpdate): Promise<void> {
  const sanitized: EntityUpdate = {
    ...changes,
    ...(changes.description !== undefined
      ? { description: sanitizeHtml(changes.description) }
      : {}),
    updatedAt: nowISO(),
  };
  await db.entities.update(id, sanitized);
}

export async function deleteEntity(db: MgHelperDb, id: string): Promise<void> {
  await db.transaction('rw', db.entities, db.relations, async () => {
    await db.entities.delete(id);
    // Cascade: remove all relations that reference this entity
    await db.relations
      .where('sourceId')
      .equals(id)
      .delete();
    await db.relations
      .where('targetId')
      .equals(id)
      .delete();
  });
}

export async function getEntityById(db: MgHelperDb, id: string): Promise<Entity | undefined> {
  return db.entities.get(id);
}

// ─── Relations ───────────────────────────────────────────────────────────────

export class RelationNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RelationNotAllowedError';
  }
}

export class DuplicateRelationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateRelationError';
  }
}

export class ContainsParentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContainsParentConflictError';
  }
}

export async function addRelation(db: MgHelperDb, data: NewRelation): Promise<Relation> {
  return db.transaction('rw', db.entities, db.relations, async () => {
    const normalizedRelation = {
      ...data,
      label: normalizeRelationLabel(data.label),
    };
    const [source, target, existingFromSource, existingWithTarget] = await Promise.all([
      db.entities.get(normalizedRelation.sourceId),
      db.entities.get(normalizedRelation.targetId),
      db.relations
        .where('sourceId')
        .equals(normalizedRelation.sourceId)
        .toArray(),
      db.relations
        .where('targetId')
        .equals(normalizedRelation.targetId)
        .toArray(),
    ]);

    if (!source) throw new Error(`Source entity not found: ${normalizedRelation.sourceId}`);
    if (!target) throw new Error(`Target entity not found: ${normalizedRelation.targetId}`);

    if (!isRelationAllowed(source.type, target.type, normalizedRelation.type)) {
      throw new RelationNotAllowedError(
        `Relation "${normalizedRelation.type}" is not allowed between "${source.type}" and "${target.type}"`,
      );
    }

    if (findDuplicateRelation(existingFromSource, normalizedRelation)) {
      throw new DuplicateRelationError(
        `Duplicate relation "${normalizedRelation.type}" already exists for "${normalizedRelation.sourceId}" -> "${normalizedRelation.targetId}"`,
      );
    }

    if (findContainsParentConflict(existingWithTarget, normalizedRelation)) {
      throw new ContainsParentConflictError(
        `Entity "${normalizedRelation.targetId}" already has a different contains parent`,
      );
    }

    const relation: Relation = {
      ...normalizedRelation,
      id: generateId(),
      createdAt: nowISO(),
    };
    await db.relations.add(relation);
    return relation;
  });
}

export async function assignContainment(
  db: MgHelperDb,
  data: Pick<NewRelation, 'sourceId' | 'targetId'>,
): Promise<Relation> {
  return db.transaction('rw', db.entities, db.relations, async () => {
    const existingRelations = await db.relations
      .where('targetId')
      .equals(data.targetId)
      .filter((relation) => relation.type === 'contains')
      .toArray();

    const currentRelation = existingRelations.find((relation) => relation.sourceId === data.sourceId);
    const relationsToRemove = existingRelations.filter((relation) => relation.sourceId !== data.sourceId);

    if (relationsToRemove.length > 0) {
      await db.relations.bulkDelete(relationsToRemove.map((relation) => relation.id));
    }

    if (currentRelation) {
      return currentRelation;
    }

    return addRelation(db, {
      type: 'contains',
      sourceId: data.sourceId,
      targetId: data.targetId,
    });
  });
}

export async function removeContainment(
  db: MgHelperDb,
  targetId: string,
  sourceId?: string,
): Promise<number> {
  const relations = await db.relations
    .where('targetId')
    .equals(targetId)
    .filter(
      (relation) =>
        relation.type === 'contains' &&
        (sourceId === undefined || relation.sourceId === sourceId),
    )
    .toArray();

  if (relations.length === 0) return 0;

  await db.relations.bulkDelete(relations.map((relation) => relation.id));
  return relations.length;
}

export async function deleteRelation(db: MgHelperDb, id: string): Promise<void> {
  await db.relations.delete(id);
}

export async function getRelationsFor(db: MgHelperDb, entityId: string): Promise<Relation[]> {
  const [asSource, asTarget] = await Promise.all([
    db.relations.where('sourceId').equals(entityId).toArray(),
    db.relations.where('targetId').equals(entityId).toArray(),
  ]);
  return [...asSource, ...asTarget];
}

/**
 * Persists `sortOrder` for each entity id based on its position in the `ids` array.
 * Runs in a single read-write transaction for atomicity.
 */
export async function updateSortOrders(db: MgHelperDb, ids: string[]): Promise<void> {
  await db.transaction('rw', db.entities, async () => {
    const entities = await db.entities.where('id').anyOf(ids).toArray();
    await Promise.all(
      entities.map((entity) => {
        const index = ids.indexOf(entity.id);
        if (index === -1) return Promise.resolve();
        return db.entities.update(entity.id, {
          data: { ...entity.data, sortOrder: index },
          updatedAt: nowISO(),
        });
      }),
    );
  });
}
