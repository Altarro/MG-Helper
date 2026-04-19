import { describe, it, expect, beforeEach } from 'vitest';
import { openCampaignDb } from '@shared/db/database';
import { addEntity } from '@shared/db/operations';

const npcBase = { type: 'npc' as const, name: 'Aldric', description: '', tags: [], data: {} };

// Two separate campaign databases
const dbA = openCampaignDb('test-isolation-a');
const dbB = openCampaignDb('test-isolation-b');

beforeEach(async () => {
  await dbA.entities.clear();
  await dbA.relations.clear();
  await dbB.entities.clear();
  await dbB.relations.clear();
});

describe('Campaign data isolation', () => {
  it('entity added in campaign A is not visible in campaign B', async () => {
    await addEntity(dbA, npcBase);

    // Verify it's in A
    const entitiesInA = await dbA.entities.toArray();
    expect(entitiesInA).toHaveLength(1);

    // Verify it's NOT in B
    const entitiesInB = await dbB.entities.toArray();
    expect(entitiesInB).toHaveLength(0);
  });

  it('two campaigns can have entities with independent ids', async () => {
    const entityA = await addEntity(dbA, { ...npcBase, name: 'NPC kampanii A' });
    const entityB = await addEntity(dbB, { ...npcBase, name: 'NPC kampanii B' });

    expect(entityA.id).not.toBe(entityB.id);

    const inA = await dbA.entities.get(entityA.id);
    const inB = await dbB.entities.get(entityB.id);
    expect(inA?.name).toBe('NPC kampanii A');
    expect(inB?.name).toBe('NPC kampanii B');

    // Cross-check: A's entity absent in B and vice versa
    expect(await dbB.entities.get(entityA.id)).toBeUndefined();
    expect(await dbA.entities.get(entityB.id)).toBeUndefined();
  });
});
