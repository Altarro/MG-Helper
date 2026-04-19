import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addRelation, deleteEntity, updateEntity } from '@shared/db/operations';
import { db } from '@shared/db/database';
import { isThread } from '@modules/threads/types';

describe('Threads integration', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('creates a thread and reads it back as Thread type', async () => {
    const entity = await addEntity(db, {
      type: 'thread',
      name: 'Zaginięcie klucznika',
      description: '',
      tags: ['główny'],
      data: {
        color: '#ef4444',
        status: 'active',
        kind: 'main',
        priority: 'high',
        resolution: 'Klucznik okazal sie sobowtorem',
      },
    });
    const stored = await db.entities.get(entity.id);
    expect(stored).toBeDefined();
    expect(isThread(stored!)).toBe(true);
    expect((stored!.data as { color: string }).color).toBe('#ef4444');
    expect((stored!.data as { status: string }).status).toBe('active');
    expect((stored!.data as { kind: string }).kind).toBe('main');
    expect((stored!.data as { priority: string }).priority).toBe('high');
    expect((stored!.data as { resolution: string }).resolution).toBe('Klucznik okazal sie sobowtorem');
  });

  it('links thread to session via appears_in relation', async () => {
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Spisek frakcji',
      description: '',
      tags: [],
      data: { color: '#6366f1', status: 'active' },
    });
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 3',
      description: '',
      tags: [],
      data: { number: 3, date: '2026-04-01', summary: '' },
    });
    await addRelation(db, { type: 'appears_in', sourceId: thread.id, targetId: session.id });

    const rel = await db.relations
      .where('sourceId')
      .equals(thread.id)
      .filter((r) => r.type === 'appears_in')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(session.id);
  });

  it('thread can appear in multiple sessions', async () => {
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Wątek wielosesyjny',
      description: '',
      tags: [],
      data: { color: '#22c55e', status: 'active' },
    });
    const s1 = await addEntity(db, {
      type: 'session',
      name: 'S1',
      description: '',
      tags: [],
      data: { number: 1, date: '2026-01-01', summary: '' },
    });
    const s2 = await addEntity(db, {
      type: 'session',
      name: 'S2',
      description: '',
      tags: [],
      data: { number: 2, date: '2026-02-01', summary: '' },
    });
    await addRelation(db, { type: 'appears_in', sourceId: thread.id, targetId: s1.id });
    await addRelation(db, { type: 'appears_in', sourceId: thread.id, targetId: s2.id });

    const rels = await db.relations
      .where('sourceId')
      .equals(thread.id)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    expect(rels).toHaveLength(2);
  });

  it('toggles status between active and completed', async () => {
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Wątek do zakończenia',
      description: '',
      tags: [],
      data: { color: '#f97316', status: 'active', kind: 'side' },
    });
    await updateEntity(db, thread.id, {
      data: { color: '#f97316', status: 'completed', kind: 'side' },
    });
    const updated = await db.entities.get(thread.id);
    expect((updated!.data as { status: string }).status).toBe('completed');
  });

  it('links thread to threat via affects relation', async () => {
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Wybory w radzie',
      description: '',
      tags: [],
      data: { color: '#6366f1', status: 'active', kind: 'main' },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Kupieni radni',
      description: '',
      tags: [],
      data: {
        threatType: 'ambitious_organization',
        impulse: 'Przejac decyzje miasta',
        moves: [],
        trigger: 'Gdy nikt nie sprawdza glosowan',
      },
    });

    await addRelation(db, { type: 'affects', sourceId: thread.id, targetId: threat.id });

    const rel = await db.relations
      .where('sourceId')
      .equals(thread.id)
      .filter((r) => r.type === 'affects')
      .first();

    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(threat.id);
  });

  it('persists derives_from metadata for questline relations', async () => {
    const parent = await addEntity(db, {
      type: 'thread',
      name: 'Sprawa z dokow',
      description: '',
      tags: [],
      data: { color: '#6366f1', status: 'active', kind: 'main' },
    });
    const child = await addEntity(db, {
      type: 'thread',
      name: 'Konsekwencje w porcie',
      description: '',
      tags: [],
      data: { color: '#f97316', status: 'active', kind: 'side' },
    });

    await addRelation(db, {
      type: 'derives_from',
      sourceId: child.id,
      targetId: parent.id,
      meta: { threadDerivationKind: 'consequence' },
    });

    const rel = await db.relations
      .where('sourceId')
      .equals(child.id)
      .filter((relation) => relation.type === 'derives_from')
      .first();

    expect(rel).toBeDefined();
    expect(rel?.targetId).toBe(parent.id);
    expect(rel?.meta).toEqual({ threadDerivationKind: 'consequence' });
  });

  it('cascade-deletes thread and its relations', async () => {
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Wątek do usunięcia',
      description: '',
      tags: [],
      data: { color: '#ec4899', status: 'active' },
    });
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 1',
      description: '',
      tags: [],
      data: { number: 1, date: '2026-03-01', summary: '' },
    });
    await addRelation(db, { type: 'appears_in', sourceId: thread.id, targetId: session.id });

    await deleteEntity(db, thread.id);

    const deleted = await db.entities.get(thread.id);
    expect(deleted).toBeUndefined();

    const danglingRels = await db.relations.where('sourceId').equals(thread.id).toArray();
    expect(danglingRels).toHaveLength(0);
  });
});
