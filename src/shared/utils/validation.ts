import { z } from 'zod';
import { ENTITY_TYPES, RELATION_TYPES } from '@shared/types';
import {
  FRONT_CATEGORIES,
  THREAT_STATUSES,
} from '@modules/fronts/types';
import {
  THREAD_KINDS,
  THREAD_PRIORITIES,
  THREAD_STATUSES,
} from '@modules/threads/types';
import { BACKUP_FORMAT_VERSION } from './backupContract';
import { LIFECYCLE_STATUSES } from '@shared/types/entityLifecycle';
import {
  CLUE_STRENGTH_OPTIONS,
  THREAD_DERIVATION_KIND_OPTIONS,
} from '@shared/domain/storyContracts';

// ─── Base ────────────────────────────────────────────────────────────────────

export const entityTypeSchema = z.enum(ENTITY_TYPES);
export const relationTypeSchema = z.enum(RELATION_TYPES);

export const baseEntitySchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200, 'Nazwa jest za długa'),
  description: z.string().max(100_000).default(''),
  tags: z.array(z.string().min(1).max(50)).max(50).default([]),
  data: z.record(z.unknown()).default({}),
});

export type BaseEntityFormValues = z.infer<typeof baseEntitySchema>;

// ─── Module-specific extensions ──────────────────────────────────────────────

// Shared fragment for entities that can carry a portrait/cover image.
// `imageId` is a reference to the `assets` Dexie table; the actual blob lives
// outside of entity rows to keep JSON backups lightweight. `imageAlt` is the
// accessible description shown as the `<img alt>` attribute.
const imageRefFields = {
  imageId: z.string().min(1).nullish(),
  imageAlt: z.string().max(200).optional(),
};

export const npcSchema = baseEntitySchema.extend({
  data: z.object({
    instinct: z.string().max(500).default(''),
    motivation: z.string().max(500).default(''),
    appearance: z.string().max(500).default(''),
    playStyle: z.string().max(1000).default(''),
    isPC: z.boolean().default(false),
    playerName: z.string().max(200).default(''),
    status: z.enum(LIFECYCLE_STATUSES).optional(),
    ...imageRefFields,
  }).default({}),
});

export const locationSchema = baseEntitySchema.extend({
  data: z.object({
    locationType: z.string().min(1).default('region'),
    danger: z.number().int().min(0).max(5).default(0),
    senses: z.object({
      see: z.string().max(300).default(''),
      hear: z.string().max(300).default(''),
      smell: z.string().max(300).default(''),
      feel: z.string().max(300).default(''),
    }).default({}),
    isDraft: z.boolean().optional(),
    status: z.enum(LIFECYCLE_STATUSES).optional(),
    ...imageRefFields,
  }).default({}),
});

export const frontSchema = baseEntitySchema.extend({
  data: z.object({
    category: z.enum(FRONT_CATEGORIES).default('adventure'),
    goal: z.string().max(2000).default(''),
    stakes: z.array(z.string().max(500)).max(20).default([]),
  }).default({}),
});

export const threatSchema = baseEntitySchema.extend({
  data: z.object({
    threatType: z.string().min(1).default('dark_entity'),
    radarArchetype: z.string().min(1).default('living_world'),
    status: z.enum(THREAT_STATUSES).default('active'),
    impulse: z.string().max(500).default(''),
    moves: z.array(z.string().max(500)).max(20).default([]),
    trigger: z.string().max(500).default(''),
    completionReason: z.string().max(1000).default(''),
    reasonOfDead: z.string().max(1000).default(''),
    forkThreatId: z.string().min(1).optional(),
    inheritanceNotes: z.string().max(4000).default(''),
  }).default({}),
});

export const clockSchema = baseEntitySchema.extend({
  data: z.object({
    segments: z.union([
      z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12),
    ]).default(6),
    filled: z.number().int().min(0).default(0),
    tickLabels: z.array(z.string().max(300)).max(12).default([]),
    isActive: z.boolean().default(true),
    lastAdvanceSessionId: z.string().min(1).optional(),
    lastAdvanceAt: z.string().min(1).optional(),
  }).default({}),
});

export const sessionSchema = baseEntitySchema.extend({
  data: z.object({
    number: z.number().int().min(1).default(1),
    date: z.string().default(''),
    summary: z.string().max(5000).default(''),
    plannedDurationMin: z.number().int().min(1).max(24 * 60).optional(),
    scenes: z.array(
      z.object({
        name: z.string().max(30).default(''),
        goal: z.string().max(1000).default(''),
        estimatedDurationMin: z.number().int().min(5).max(24 * 60).default(15),
      }),
    ).max(50).default([]),
    sortOrder: z.number().int().min(0).optional(),
  }).default({}),
});

export const factionSchema = baseEntitySchema.extend({
  data: z.object({
    goals: z.array(z.string().max(500)).max(10).default([]),
    resources: z.array(z.string().max(500)).max(20).default([]),
    status: z.enum(LIFECYCLE_STATUSES).optional(),
    ...imageRefFields,
  }).default({}),
});

export const itemSchema = baseEntitySchema.extend({
  data: z.object({
    itemType: z.string().min(1).default('misc'),
    properties: z.array(z.string().max(300)).max(20).default([]),
    status: z.enum(LIFECYCLE_STATUSES).optional(),
    ...imageRefFields,
  }).default({}),
});

const clueDataSchema = z
  .object({
    clueTypes: z.array(z.string().min(1)).max(6).optional(),
    clueType: z.string().min(1).optional(),
    hint: z.string().max(2000).default(''),
    discovered: z.boolean().default(false),
  })
  .transform((data) => {
    const fromArray = Array.isArray(data.clueTypes) ? data.clueTypes : [];
    const normalized = [...new Set(fromArray)].filter(
      (value) => !value.startsWith('custom:') || value.length > 'custom:'.length,
    );
    const fallback = data.clueType && data.clueType.length > 0 ? [data.clueType] : ['event'];
    const clueTypes = normalized.length > 0 ? normalized : fallback;
    return {
      clueTypes,
      clueType: clueTypes[0],
      hint: data.hint,
      discovered: data.discovered,
    };
  });

export const clueSchema = baseEntitySchema.extend({
  data: clueDataSchema.default({}),
});

export type ClueFormValues = z.infer<typeof clueSchema>;

export const threadSchema = baseEntitySchema.extend({
  data: z.object({
    color: z.string().default('#6366f1'),
    status: z.enum(THREAD_STATUSES).default('active'),
    kind: z.enum(THREAD_KINDS).default('side'),
    priority: z.enum(THREAD_PRIORITIES).default('normal'),
    resolution: z.string().max(2000).default(''),
    sortOrder: z.number().int().min(0).optional(),
  }).default({}),
});

export type ThreadFormValues = z.infer<typeof threadSchema>;

export const sessionEventSchema = baseEntitySchema.extend({
  data: z.object({
    kind: z.enum(['session_timeline', 'npc_location_history']).default('session_timeline'),
    timestamp: z.string().default(() => new Date().toISOString()),
    text: z.string().min(1).max(2000),
    npcId: z.string().optional(),
    locationId: z.string().optional(),
    locationName: z.string().max(200).optional(),
    sessionId: z.string().optional(),
    sessionName: z.string().max(200).optional(),
  }),
});

export type SessionEventFormValues = z.infer<typeof sessionEventSchema>;

export const noteSchema = baseEntitySchema.extend({
  data: z.object({
    content: z.string().min(1).max(500),
    sessionId: z.string(),
    createdAt: z.string(),
  }),
});

export type NoteFormValues = z.infer<typeof noteSchema>;

export const entitySchemaMap = {
  npc: npcSchema,
  location: locationSchema,
  front: frontSchema,
  threat: threatSchema,
  clock: clockSchema,
  session: sessionSchema,
  faction: factionSchema,
  item: itemSchema,
  clue: clueSchema,
  thread: threadSchema,
  note: noteSchema,
  event: sessionEventSchema,
} as const;

export const entityDataSchemaMap = {
  npc: npcSchema.shape.data,
  location: locationSchema.shape.data,
  front: frontSchema.shape.data,
  threat: threatSchema.shape.data,
  clock: clockSchema.shape.data,
  session: sessionSchema.shape.data,
  faction: factionSchema.shape.data,
  item: itemSchema.shape.data,
  clue: clueSchema.shape.data,
  thread: threadSchema.shape.data,
  note: noteSchema.shape.data,
  event: sessionEventSchema.shape.data,
} as const;

const importedEntityBaseSchema = {
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
} as const;

export const importedEntitySchema = z.discriminatedUnion('type', [
  z.object({ ...importedEntityBaseSchema, type: z.literal('npc'), data: entityDataSchemaMap.npc.default({}) }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('location'), data: entityDataSchemaMap.location.default({}) }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('front'), data: entityDataSchemaMap.front.default({}) }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('threat'), data: entityDataSchemaMap.threat.default({}) }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('clock'), data: entityDataSchemaMap.clock.default({}) }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('session'), data: entityDataSchemaMap.session.default({}) }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('faction'), data: entityDataSchemaMap.faction.default({}) }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('item'), data: entityDataSchemaMap.item.default({}) }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('clue'), data: entityDataSchemaMap.clue.default({}) }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('thread'), data: entityDataSchemaMap.thread.default({}) }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('note'), data: entityDataSchemaMap.note }),
  z.object({ ...importedEntityBaseSchema, type: z.literal('event'), data: entityDataSchemaMap.event }),
]);

export const importedRelationSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  type: relationTypeSchema,
  label: z.string().optional(),
  meta: z.object({
    threadDerivationKind: z.enum(THREAD_DERIVATION_KIND_OPTIONS).optional(),
    clueStrength: z.enum(CLUE_STRENGTH_OPTIONS).optional(),
  }).optional(),
  createdAt: z.string(),
});

const importedGeneratorEntrySchema = z.object({
  id: z.string().min(1),
  value: z.string().min(1),
  weight: z.number().finite().positive(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean(),
});

const importedGeneratorTableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  entries: z.array(importedGeneratorEntrySchema),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const importedGeneratorPackSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  isActive: z.boolean(),
  tables: z.array(importedGeneratorTableSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const importedGeneratorRollLogSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  sessionId: z.string().nullable().optional(),
  packId: z.string().min(1),
  kind: z.string().min(1),
  resultText: z.string().min(1),
  sourceTableIds: z.array(z.string()),
  createdAt: z.string(),
});

export const importedDbSchema = z.object({
  entities: z.array(importedEntitySchema),
  relations: z.array(importedRelationSchema),
});

export type ImportedDb = z.infer<typeof importedDbSchema>;

export const versionedBackupSchema = z.object({
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  appVersion: z.string().min(1),
  exportedAt: z.string(),
  campaignMeta: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    createdAt: z.string(),
  }).nullable(),
  entities: z.array(importedEntitySchema),
  relations: z.array(importedRelationSchema),
  generatorPacks: z.array(importedGeneratorPackSchema).default([]),
  generatorRollLogs: z.array(importedGeneratorRollLogSchema).default([]),
});

export type VersionedBackup = z.infer<typeof versionedBackupSchema>;
