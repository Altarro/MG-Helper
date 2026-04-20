import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addRelation, assignBelongsTo, deleteEntity } from '@shared/db/operations';
import { db } from '@shared/db/database';
import { isFront, isThreat } from '@modules/fronts/types';

describe('Front integration', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('creates a front and reads it back as Front type', async () => {
    const entity = await addEntity(db, {
      type: 'front',
      name: 'The Undying Plague',
      description: '',
      tags: ['disease'],
      data: { category: 'campaign', stakes: ['The kingdom falls', 'Half the population dies'] },
    });
    const stored = await db.entities.get(entity.id);
    expect(stored).toBeDefined();
    expect(isFront(stored!)).toBe(true);
    expect(stored!.name).toBe('The Undying Plague');
    expect((stored!.data as { category: string }).category).toBe('campaign');
    expect((stored!.data as { stakes: string[] }).stakes).toHaveLength(2);
  });

  it('creates a threat and reads it back as Threat type', async () => {
    const sourceThreat = await addEntity(db, {
      type: 'threat',
      name: 'Stary uklad',
      description: '',
      tags: [],
      data: {
        threatType: 'ambitious_organization',
        impulse: 'Kontrolowac port',
        moves: [],
      },
    });

    const entity = await addEntity(db, {
      type: 'threat',
      name: 'Iron Brotherhood',
      description: '',
      tags: ['mercenaries'],
      data: {
        threatType: 'ambitious_organization',
        impulse: 'Seize control of trade routes',
        moves: ['Bribe the council', 'Assassinate the merchant lord'],
        trigger: 'When nobody watches the harbor',
        reasonOfDead: 'Broken by internal betrayal',
        forkThreatId: sourceThreat.id,
      },
    });
    const stored = await db.entities.get(entity.id);
    expect(stored).toBeDefined();
    expect(isThreat(stored!)).toBe(true);
    expect((stored!.data as { impulse: string }).impulse).toBe('Seize control of trade routes');
    expect((stored!.data as { moves: string[] }).moves).toHaveLength(2);
    expect((stored!.data as { trigger: string }).trigger).toBe('When nobody watches the harbor');
    expect((stored!.data as { reasonOfDead: string }).reasonOfDead).toBe('Broken by internal betrayal');
    expect((stored!.data as { forkThreatId: string }).forkThreatId).toBe(sourceThreat.id);
  });

  it('links threat to front via belongs_to relation', async () => {
    const front = await addEntity(db, {
      type: 'front',
      name: 'The Shadow Front',
      description: '',
      tags: [],
      data: { category: 'adventure', stakes: ['The heroes lose'] },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Dark Cult',
      description: '',
      tags: [],
      data: { threatType: 'dark_entity', impulse: 'Awaken the god', moves: ['Sacrifice a hero'] },
    });
    await addRelation(db, { type: 'belongs_to', sourceId: threat.id, targetId: front.id });

    const rel = await db.relations
      .where('sourceId')
      .equals(threat.id)
      .filter((r) => r.type === 'belongs_to')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(front.id);
  });

  it('relinks threat to selected front and keeps one belongs_to relation', async () => {
    const frontA = await addEntity(db, {
      type: 'front',
      name: 'Old Front',
      description: '',
      tags: [],
      data: { category: 'adventure', stakes: [] },
    });
    const frontB = await addEntity(db, {
      type: 'front',
      name: 'New Front',
      description: '',
      tags: [],
      data: { category: 'adventure', stakes: [] },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Split Allegiance',
      description: '',
      tags: [],
      data: { threatType: 'cursed_place', impulse: 'Corrupt the city', moves: [] },
    });

    await addRelation(db, { type: 'belongs_to', sourceId: threat.id, targetId: frontA.id });
    await addRelation(db, { type: 'belongs_to', sourceId: threat.id, targetId: frontB.id });

    await assignBelongsTo(db, {
      sourceId: threat.id,
      targetId: frontB.id,
    });

    const belongsToRelations = await db.relations
      .where('sourceId')
      .equals(threat.id)
      .filter((relation) => relation.type === 'belongs_to')
      .toArray();

    expect(belongsToRelations).toHaveLength(1);
    expect(belongsToRelations[0].targetId).toBe(frontB.id);
  });

  it('assignBelongsTo is idempotent for same target', async () => {
    const front = await addEntity(db, {
      type: 'front',
      name: 'Anchor Front',
      description: '',
      tags: [],
      data: { category: 'campaign', stakes: [] },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Anchor Threat',
      description: '',
      tags: [],
      data: { threatType: 'landscape_terrain', impulse: 'Hold position', moves: [] },
    });

    const first = await assignBelongsTo(db, {
      sourceId: threat.id,
      targetId: front.id,
    });
    const second = await assignBelongsTo(db, {
      sourceId: threat.id,
      targetId: front.id,
    });

    const belongsToRelations = await db.relations
      .where('sourceId')
      .equals(threat.id)
      .filter((relation) => relation.type === 'belongs_to')
      .toArray();

    expect(second.id).toBe(first.id);
    expect(belongsToRelations).toHaveLength(1);
    expect(belongsToRelations[0].targetId).toBe(front.id);
  });

  it('deletes front and cascades relations to threat', async () => {
    const front = await addEntity(db, {
      type: 'front',
      name: 'Doomed Front',
      description: '',
      tags: [],
      data: { category: 'campaign', stakes: [] },
    });
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Minion',
      description: '',
      tags: [],
      data: { threatType: 'force_of_chaos', impulse: '', moves: [] },
    });
    await addRelation(db, { type: 'belongs_to', sourceId: threat.id, targetId: front.id });

    await deleteEntity(db, front.id);
    const rels = await db.relations.where('targetId').equals(front.id).toArray();
    expect(rels).toHaveLength(0);
  });

  it('isFront returns false for non-front entity', async () => {
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Rogue Beast',
      description: '',
      tags: [],
      data: { threatType: 'rampant_beast', impulse: '', moves: [] },
    });
    const stored = await db.entities.get(threat.id);
    expect(isFront(stored!)).toBe(false);
    expect(isThreat(stored!)).toBe(true);
  });

  it('threat with tracks relation to clock is allowed', async () => {
    const threat = await addEntity(db, {
      type: 'threat',
      name: 'Spreading Plague',
      description: '',
      tags: [],
      data: { threatType: 'disease_affliction', impulse: 'Infect all', moves: ['Spread spores'] },
    });
    const clock = await addEntity(db, {
      type: 'clock',
      name: 'Plague Progress',
      description: '',
      tags: [],
      data: { segments: 6, filled: 0 },
    });
    await addRelation(db, { type: 'tracks', sourceId: threat.id, targetId: clock.id });

    const rel = await db.relations
      .where('sourceId')
      .equals(threat.id)
      .filter((r) => r.type === 'tracks')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(clock.id);
  });
});
