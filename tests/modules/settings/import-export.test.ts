import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addEntity, addRelation } from '@shared/db/operations';
import { db } from '@shared/db/database';
import { importJson } from '@shared/utils/importJson';
import { createExportPayload } from '@shared/utils/exportJson';
import { exportEntityMarkdown } from '@shared/utils/exportMarkdown';
import { BACKUP_FORMAT_VERSION } from '@shared/utils/backupContract';

// Mock DOMPurify in test environment (it requires a real DOM)
vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

describe('Import/Export', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('export + import roundtrip preserves entities', async () => {
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Gandalf',
      description: '<p>Czarodziej</p>',
      tags: ['wizard'],
      data: { instinct: 'curious', motivation: 'help', appearance: 'grey robe' },
    });
    const location = await addEntity(db, {
      type: 'location',
      name: 'Rivendell',
      description: '',
      tags: [],
      data: { locationType: 'city', danger: 0, senses: {} },
    });
    await addRelation(db, { type: 'related_to', sourceId: npc.id, targetId: location.id });

    const exportData = await createExportPayload(db, {
      campaignMeta: {
        id: 'campaign-1',
        name: 'Test campaign',
        description: 'Roundtrip verification',
        createdAt: new Date().toISOString(),
      },
    });
    expect(exportData.formatVersion).toBe(BACKUP_FORMAT_VERSION);

    // Clear and re-import
    await db.entities.clear();
    await db.relations.clear();

    const result = await importJson(db, exportData);
    expect(result.ok).toBe(true);
    expect(result.entityCount).toBe(2);
    expect(result.relationCount).toBe(1);

    const restoredNpc = await db.entities.get(npc.id);
    expect(restoredNpc).toBeDefined();
    expect(restoredNpc!.name).toBe('Gandalf');
    expect(restoredNpc!.tags).toEqual(['wizard']);
  });

  it('import with invalid JSON schema returns errors', async () => {
    const result = await importJson(db, { entities: [{ id: 'x', type: 'unknown_type', name: '' }], relations: [] });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('imports legacy v1 payload without metadata', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      entities: [
        {
          id: 'e1',
          type: 'location',
          name: 'Legacy Location',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          data: { locationType: 'city', danger: 0, senses: {}, parentId: null },
        },
      ],
      relations: [],
    });

    expect(result.ok).toBe(true);
    expect(result.entityCount).toBe(1);
    const restored = await db.entities.get('e1');
    expect(restored?.data).not.toHaveProperty('parentId');
  });

  it('imports main-era v2 threat payload and backfills new fields with defaults', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      formatVersion: BACKUP_FORMAT_VERSION,
      appVersion: '0.1.0-alpha',
      exportedAt: now,
      campaignMeta: null,
      entities: [
        {
          id: 'threat-main-v2',
          type: 'threat',
          name: 'Dziedziczna Siec',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          data: {
            threatType: 'ambitious_organization',
            impulse: 'Przejac port',
            moves: ['Rozstawia ludzi w dokach'],
          },
        },
      ],
      relations: [],
    });

    expect(result.ok).toBe(true);
    const restored = await db.entities.get('threat-main-v2');
    expect(restored?.data).toMatchObject({
      threatType: 'ambitious_organization',
      status: 'active',
      impulse: 'Przejac port',
      moves: ['Rozstawia ludzi w dokach'],
      trigger: '',
      reasonOfDead: '',
      inheritanceNotes: '',
    });
  });

  it('upgrades explicit formatVersion 1 payload and re-export keeps normalized schema', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      formatVersion: 1,
      entities: [
        {
          id: 'thread-v1',
          type: 'thread',
          name: 'Stary Watek',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          data: {
            color: '#6366f1',
            status: 'active',
          },
        },
        {
          id: 'threat-v1',
          type: 'threat',
          name: 'Stare Zagrozenie',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          data: {
            threatType: 'dark_entity',
            impulse: 'Stare cisnienie fabularne',
            moves: ['Poddaje probe bohaterow'],
          },
        },
      ],
      relations: [
        {
          id: 'rel-v1',
          sourceId: 'thread-v1',
          targetId: 'threat-v1',
          type: 'affects',
          createdAt: now,
        },
      ],
    });

    expect(result.ok).toBe(true);

    const upgradedThreat = await db.entities.get('threat-v1');
    expect(upgradedThreat?.data).toMatchObject({
      threatType: 'dark_entity',
      status: 'active',
      impulse: 'Stare cisnienie fabularne',
      moves: ['Poddaje probe bohaterow'],
      trigger: '',
      reasonOfDead: '',
      inheritanceNotes: '',
    });

    const exportData = await createExportPayload(db);
    expect(exportData.formatVersion).toBe(BACKUP_FORMAT_VERSION);

    const exportedThreat = exportData.entities.find((entity) => entity.id === 'threat-v1');
    expect(exportedThreat?.data).toMatchObject({
      threatType: 'dark_entity',
      status: 'active',
      trigger: '',
      reasonOfDead: '',
      inheritanceNotes: '',
    });

    expect(exportData.relations).toEqual([
      expect.objectContaining({
        id: 'rel-v1',
        sourceId: 'thread-v1',
        targetId: 'threat-v1',
        type: 'affects',
      }),
    ]);
  });

  it('imports legacy payload with missing threat.data and initializes safe defaults', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      entities: [
        {
          id: 'threat-without-data',
          type: 'threat',
          name: 'Szkielet zagrozenia',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
      relations: [],
    });

    expect(result.ok).toBe(true);
    const restored = await db.entities.get('threat-without-data');
    expect(restored?.data).toMatchObject({
      threatType: 'dark_entity',
      status: 'active',
      impulse: '',
      moves: [],
      trigger: '',
      reasonOfDead: '',
      inheritanceNotes: '',
    });
  });

  it('rejects backups from a future format version', async () => {
    const result = await importJson(db, {
      formatVersion: BACKUP_FORMAT_VERSION + 1,
      appVersion: '9.9.9',
      exportedAt: new Date().toISOString(),
      campaignMeta: null,
      entities: [],
      relations: [],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('przyszla wersja');
  });

  it('import with broken relation references returns errors', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      formatVersion: BACKUP_FORMAT_VERSION,
      appVersion: '0.1.0-alpha',
      exportedAt: now,
      campaignMeta: null,
      entities: [
        { id: 'e1', type: 'npc', name: 'A', description: '', tags: [], createdAt: now, updatedAt: now, data: {} },
      ],
      relations: [
        { id: 'r1', sourceId: 'e1', targetId: 'non-existent', type: 'related_to', createdAt: now },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('non-existent');
  });

  it('rejects imported relations that violate relation rules', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      formatVersion: BACKUP_FORMAT_VERSION,
      appVersion: '0.1.0-alpha',
      exportedAt: now,
      campaignMeta: null,
      entities: [
        { id: 'npc-1', type: 'npc', name: 'A', description: '', tags: [], createdAt: now, updatedAt: now, data: {} },
        { id: 'clock-1', type: 'clock', name: 'Clock', description: '', tags: [], createdAt: now, updatedAt: now, data: { segments: 6, filled: 0, tickLabels: [], isActive: true } },
      ],
      relations: [
        { id: 'r1', sourceId: 'npc-1', targetId: 'clock-1', type: 'contains', createdAt: now },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('niedozwolony kontrakt');
  });

  it('imports affects relation and new story fields without breaking compatibility', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      formatVersion: BACKUP_FORMAT_VERSION,
      appVersion: '0.1.0-alpha',
      exportedAt: now,
      campaignMeta: null,
      entities: [
        {
          id: 'thread-1',
          type: 'thread',
          name: 'Sprawa z dokow',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          data: {
            color: '#6366f1',
            status: 'active',
            kind: 'main',
            priority: 'high',
            resolution: 'Zakonczy sie wojna o doki albo rozejmem',
          },
        },
        {
          id: 'threat-root',
          type: 'threat',
          name: 'Stara siatka portowa',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          data: {
            threatType: 'ambitious_organization',
            impulse: 'Trzymac miasto za gardlo',
            moves: [],
          },
        },
        {
          id: 'threat-1',
          type: 'threat',
          name: 'Przemyt pod miastem',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          data: {
            threatType: 'ambitious_organization',
            impulse: 'Przejac szlaki',
            moves: [],
            trigger: 'Gdy stol zignoruje port przez cala sesje',
            reasonOfDead: 'Zlamane po wyborze jednej z frakcji',
            forkThreatId: 'threat-root',
          },
        },
      ],
      relations: [
        { id: 'r1', sourceId: 'thread-1', targetId: 'threat-1', type: 'affects', createdAt: now },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.relationCount).toBe(1);

    const thread = await db.entities.get('thread-1');
    const threat = await db.entities.get('threat-1');
    const relation = await db.relations.get('r1');

    expect(thread?.data).toMatchObject({
      kind: 'main',
      priority: 'high',
      resolution: 'Zakonczy sie wojna o doki albo rozejmem',
    });
    expect(threat?.data).toMatchObject({
      trigger: 'Gdy stol zignoruje port przez cala sesje',
      reasonOfDead: 'Zlamane po wyborze jednej z frakcji',
      forkThreatId: 'threat-root',
    });
    expect(relation?.type).toBe('affects');
  });

  it('roundtrips derives_from metadata for thread questline relations', async () => {
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

    const exportData = await createExportPayload(db, {
      campaignMeta: {
        id: 'campaign-story',
        name: 'Story campaign',
        description: 'Questline metadata verification',
        createdAt: new Date().toISOString(),
      },
    });

    const derivedRelation = exportData.relations.find((relation: { type: string; meta?: unknown }) => relation.type === 'derives_from');
    expect(derivedRelation?.meta).toEqual({ threadDerivationKind: 'consequence' });

    await db.entities.clear();
    await db.relations.clear();

    const result = await importJson(db, exportData);
    expect(result.ok).toBe(true);

    const restoredRelations = await db.relations.toArray();
    expect(restoredRelations).toHaveLength(1);
    expect(restoredRelations[0]?.meta).toEqual({ threadDerivationKind: 'consequence' });
  });

  it('imports clue linked directly to thread via clues_for', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      formatVersion: BACKUP_FORMAT_VERSION,
      appVersion: '0.1.0-alpha',
      exportedAt: now,
      campaignMeta: null,
      entities: [
        {
          id: 'clue-1',
          type: 'clue',
          name: 'Podejrzany rachunek',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          data: { clueType: 'event', hint: 'Portowy skryba falszuje wpisy', discovered: false },
        },
        {
          id: 'thread-1',
          type: 'thread',
          name: 'Sprawa z dokow',
          description: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          data: { color: '#6366f1', status: 'active' },
        },
      ],
      relations: [
        { id: 'r1', sourceId: 'clue-1', targetId: 'thread-1', type: 'clues_for', createdAt: now },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.relationCount).toBe(1);
  });

  it('roundtrips clue strength metadata for clues_for relations', async () => {
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

    const exportData = await createExportPayload(db, {
      campaignMeta: {
        id: 'campaign-clues',
        name: 'Clue campaign',
        description: 'Clue strength verification',
        createdAt: new Date().toISOString(),
      },
    });

    const clueRelation = exportData.relations.find((relation: { type: string; meta?: unknown }) => relation.type === 'clues_for');
    expect(clueRelation?.meta).toEqual({ clueStrength: 'strong' });

    await db.entities.clear();
    await db.relations.clear();

    const result = await importJson(db, exportData);
    expect(result.ok).toBe(true);

    const restoredRelations = await db.relations.toArray();
    expect(restoredRelations).toHaveLength(1);
    expect(restoredRelations[0]?.meta).toEqual({ clueStrength: 'strong' });
  });

  it('rejects duplicate logical relations inside imported backup', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      formatVersion: BACKUP_FORMAT_VERSION,
      appVersion: '0.1.0-alpha',
      exportedAt: now,
      campaignMeta: null,
      entities: [
        { id: 'loc-1', type: 'location', name: 'City', description: '', tags: [], createdAt: now, updatedAt: now, data: { locationType: 'city', danger: 0, senses: {} } },
        { id: 'npc-1', type: 'npc', name: 'A', description: '', tags: [], createdAt: now, updatedAt: now, data: {} },
      ],
      relations: [
        { id: 'r1', sourceId: 'loc-1', targetId: 'npc-1', type: 'contains', createdAt: now },
        { id: 'r2', sourceId: 'loc-1', targetId: 'npc-1', type: 'contains', createdAt: now },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('duplikuje');
  });

  it('rejects multiple contains parents for one target during import', async () => {
    const now = new Date().toISOString();
    const result = await importJson(db, {
      formatVersion: BACKUP_FORMAT_VERSION,
      appVersion: '0.1.0-alpha',
      exportedAt: now,
      campaignMeta: null,
      entities: [
        { id: 'loc-1', type: 'location', name: 'City', description: '', tags: [], createdAt: now, updatedAt: now, data: { locationType: 'city', danger: 0, senses: {} } },
        { id: 'loc-2', type: 'location', name: 'Tower', description: '', tags: [], createdAt: now, updatedAt: now, data: { locationType: 'building', danger: 0, senses: {} } },
        { id: 'npc-1', type: 'npc', name: 'A', description: '', tags: [], createdAt: now, updatedAt: now, data: {} },
      ],
      relations: [
        { id: 'r1', sourceId: 'loc-1', targetId: 'npc-1', type: 'contains', createdAt: now },
        { id: 'r2', sourceId: 'loc-2', targetId: 'npc-1', type: 'contains', createdAt: now },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('polityke contains');
  });

  it('exportEntityMarkdown produces a string with entity name and type', () => {
    const entity = {
      id: 'abc',
      type: 'npc' as const,
      name: 'Strażnik',
      description: '<p>Stary wojownik</p>',
      tags: ['guard'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: { instinct: 'protect', motivation: 'duty', appearance: '' },
    };
    const md = exportEntityMarkdown(entity);
    expect(md).toContain('# Strażnik');
    expect(md).toContain('NPC');
    expect(md).toContain('guard');
    expect(md).toContain('Stary wojownik');
  });

  it('exportEntityMarkdown includes derives_from subtype label when relation metadata exists', () => {
    const entity = {
      id: 'thread-child',
      type: 'thread' as const,
      name: 'Konsekwencje w porcie',
      description: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: { color: '#f97316', status: 'active', kind: 'side' },
    };
    const relations = [
      {
        id: 'rel-1',
        sourceId: 'thread-child',
        targetId: 'thread-parent',
        type: 'derives_from' as const,
        meta: { threadDerivationKind: 'consequence' as const },
        createdAt: new Date().toISOString(),
      },
    ];
    const relatedEntities = new Map([
      ['thread-parent', {
        id: 'thread-parent',
        type: 'thread' as const,
        name: 'Sprawa z dokow',
        description: '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: { color: '#6366f1', status: 'active', kind: 'main' },
      }],
    ]);

    const md = exportEntityMarkdown(entity, relations, relatedEntities);

    expect(md).toContain('wynika z');
    expect(md).toContain('Konsekwencja');
    expect(md).toContain('Sprawa z dokow');
  });

  it('exportEntityMarkdown includes clue strength label when clues_for metadata exists', () => {
    const entity = {
      id: 'clue-1',
      type: 'clue' as const,
      name: 'Prawie jawny rytual',
      description: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: { clueType: 'event', hint: 'Symbole ukladaja sie w rytual', discovered: false },
    };
    const relations = [
      {
        id: 'rel-1',
        sourceId: 'clue-1',
        targetId: 'threat-1',
        type: 'clues_for' as const,
        meta: { clueStrength: 'strong' as const },
        createdAt: new Date().toISOString(),
      },
    ];
    const relatedEntities = new Map([
      ['threat-1', {
        id: 'threat-1',
        type: 'threat' as const,
        name: 'Mroczny Kult',
        description: '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: { threatType: 'dark_entity', impulse: 'Obudzic boga', moves: [] },
      }],
    ]);

    const md = exportEntityMarkdown(entity, relations, relatedEntities);

    expect(md).toContain('wskazówka do');
    expect(md).toContain('Mocna wskazówka');
    expect(md).toContain('Mroczny Kult');
  });
});
