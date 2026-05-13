import { nowISO } from '@shared/utils/date';
import type { Entity } from '@shared/types';
import type { MgHelperDb } from './database';

export interface TagUsage {
  tag: string;
  count: number;
}

function uniqueTags(tags: readonly string[]): string[] {
  const out: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (trimmed && !out.includes(trimmed)) {
      out.push(trimmed);
    }
  }
  return out;
}

export async function listTagUsage(db: MgHelperDb): Promise<TagUsage[]> {
  const entities = await db.entities.toArray();
  const counts = new Map<string, number>();

  for (const entity of entities) {
    for (const tag of uniqueTags(entity.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, 'pl'));
}

export async function renameTag(db: MgHelperDb, oldTag: string, nextTag: string): Promise<number> {
  const from = oldTag.trim();
  const to = nextTag.trim();
  if (!from) throw new Error('Brak tagu do zmiany');
  if (!to) throw new Error('Nowa nazwa tagu jest wymagana');

  return db.transaction('rw', db.entities, async () => {
    const entities = await db.entities
      .filter((entity) => entity.tags.includes(from))
      .toArray();

    await Promise.all(
      entities.map((entity: Entity) =>
        db.entities.update(entity.id, {
          tags: uniqueTags(entity.tags.map((tag) => (tag === from ? to : tag))),
          updatedAt: nowISO(),
        }),
      ),
    );

    return entities.length;
  });
}

export async function deleteTagEverywhere(db: MgHelperDb, tag: string): Promise<number> {
  const target = tag.trim();
  if (!target) throw new Error('Brak tagu do usunięcia');

  return db.transaction('rw', db.entities, async () => {
    const entities = await db.entities
      .filter((entity) => entity.tags.includes(target))
      .toArray();

    await Promise.all(
      entities.map((entity: Entity) =>
        db.entities.update(entity.id, {
          tags: entity.tags.filter((candidate) => candidate !== target),
          updatedAt: nowISO(),
        }),
      ),
    );

    return entities.length;
  });
}
