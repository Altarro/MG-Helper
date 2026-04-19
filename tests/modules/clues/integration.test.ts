import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addRelation, deleteEntity } from '@shared/db/operations';
import { db } from '@shared/db/database';
import { isClue } from '@modules/clues/types';

describe('Clues integration', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('creates a clue and reads it back as Clue type', async () => {
    const entity = await addEntity(db, {
      type: 'clue',
      name: 'Odcisk buta przy drzwiach',
      description: '',
      tags: ['fizyczna'],
      data: { clueType: 'character', hint: 'Butela z charakterystycznym wzorem', discovered: false },
    });
    const stored = await db.entities.get(entity.id);
    expect(stored).toBeDefined();
    expect(isClue(stored!)).toBe(true);
    expect((stored!.data as { clueType: string }).clueType).toBe('character');
    expect((stored!.data as { hint: string }).hint).toBe('Butela z charakterystycznym wzorem');
    expect((stored!.data as { discovered: boolean }).discovered).toBe(false);
  });

  it('links clue to threat via clues_for relation', async () => {
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Mroczny Kult',
      description: '',
      tags: [],
      data: { threatType: 'dark_entity', impulse: 'Obudzić boga', moves: [] },
    });
    const clue = await addEntity(db, {
      type: 'clue',
      name: 'Porzucony symbol kultu',
      description: '',
      tags: [],
      data: { clueType: 'event', hint: 'Symbol namalowany czarną farbą', discovered: false },
    });
    await addRelation(db, { type: 'clues_for', sourceId: clue.id, targetId: threat.id });

    const rel = await db.relations
      .where('sourceId')
      .equals(clue.id)
      .filter((r) => r.type === 'clues_for')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(threat.id);
  });

  it('links clue to front via clues_for relation', async () => {
    const front = await addEntity(db, {
      type: 'front',
      name: 'Plaga Cieni',
      description: '',
      tags: [],
      data: { category: 'adventure', stakes: ['Zguba królestwa'] },
    });
    const clue = await addEntity(db, {
      type: 'clue',
      name: 'Tajny list',
      description: '',
      tags: [],
      data: { clueType: 'character', hint: 'Napisany w zaszyfrowanym języku', discovered: false },
    });
    await addRelation(db, { type: 'clues_for', sourceId: clue.id, targetId: front.id });

    const rels = await db.relations
      .where('targetId')
      .equals(front.id)
      .filter((r) => r.type === 'clues_for')
      .toArray();
    expect(rels).toHaveLength(1);
    expect(rels[0]!.sourceId).toBe(clue.id);
  });

  it('links clue to thread via clues_for relation', async () => {
    const thread = await addEntity(db, {
      type: 'thread',
      name: 'Sprawa z mlyna',
      description: '',
      tags: [],
      data: { color: '#6366f1', status: 'active', kind: 'side' },
    });
    const clue = await addEntity(db, {
      type: 'clue',
      name: 'Zakrwawiony worek z maka',
      description: '',
      tags: [],
      data: { clueType: 'location', hint: 'Lezal za mlynem', discovered: false },
    });

    await addRelation(db, { type: 'clues_for', sourceId: clue.id, targetId: thread.id });

    const rel = await db.relations
      .where('sourceId')
      .equals(clue.id)
      .filter((r) => r.type === 'clues_for')
      .first();

    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(thread.id);
  });

  it('persists clue strength metadata for clues_for relation', async () => {
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Mroczny Kult',
      description: '',
      tags: [],
      data: { threatType: 'dark_entity', impulse: 'Obudzic boga', moves: [] },
    });
    const clue = await addEntity(db, {
      type: 'clue',
      name: 'Prawie jawny rytual',
      description: '',
      tags: [],
      data: { clueType: 'event', hint: 'Symbole ukladaja sie w rytual', discovered: false },
    });

    await addRelation(db, {
      type: 'clues_for',
      sourceId: clue.id,
      targetId: threat.id,
      meta: { clueStrength: 'strong' },
    });

    const rel = await db.relations
      .where('sourceId')
      .equals(clue.id)
      .filter((relation) => relation.type === 'clues_for')
      .first();

    expect(rel).toBeDefined();
    expect(rel?.meta).toEqual({ clueStrength: 'strong' });
  });

  it('toggles discovered status', async () => {
    const clue = await addEntity(db, {
      type: 'clue',
      name: 'Kluczowy świadek',
      description: '',
      tags: [],
      data: { clueType: 'character', hint: 'Widział wszystko', discovered: false },
    });
    // Toggle to discovered
    await db.entities.update(clue.id, { data: { clueType: 'character', hint: 'Widział wszystko', discovered: true } });
    const updated = await db.entities.get(clue.id);
    expect((updated!.data as { discovered: boolean }).discovered).toBe(true);
  });

  it('cascade-deletes clue when deleteEntity is called', async () => {
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Zagrożenie testowe',
      description: '',
      tags: [],
      data: { threatType: 'dark_entity', impulse: 'Zniszczyć', moves: [] },
    });
    const clue = await addEntity(db, {
      type: 'clue',
      name: 'Wskazówka testowa',
      description: '',
      tags: [],
      data: { clueType: 'location', hint: 'W piwnicy', discovered: false },
    });
    await addRelation(db, { type: 'clues_for', sourceId: clue.id, targetId: threat.id });

    await deleteEntity(db, clue.id);

    const deleted = await db.entities.get(clue.id);
    expect(deleted).toBeUndefined();

    const danglingRels = await db.relations.where('sourceId').equals(clue.id).toArray();
    expect(danglingRels).toHaveLength(0);
  });
});
