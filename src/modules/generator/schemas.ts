import { z } from 'zod';
import { GENERATOR_SYSTEM_TABLE_TYPES } from './contracts';

export const GENERATOR_IMPORT_LIMITS = {
  maxEntryValueLength: 300,
  maxEntryTags: 20,
  maxTagLength: 40,
  maxEntriesPerTable: 10_000,
  maxTablesPerPack: 500,
  maxPacksPerImport: 100,
  maxCsvRows: 10_000,
} as const;

const isoDateSchema = z.string().min(1);

export const generatorEntrySchema = z.object({
  id: z.string().min(1),
  value: z.string().trim().min(1).max(GENERATOR_IMPORT_LIMITS.maxEntryValueLength),
  weight: z.number().finite().positive().max(1000).default(1),
  tags: z
    .array(z.string().trim().min(1).max(GENERATOR_IMPORT_LIMITS.maxTagLength))
    .max(GENERATOR_IMPORT_LIMITS.maxEntryTags)
    .default([]),
  isActive: z.boolean().default(true),
});

const customTableTypeSchema = z
  .string()
  .regex(/^custom:[a-z0-9][a-z0-9_-]{1,62}$/i, 'Nieprawidłowy typ tabeli custom.');

export const generatorTableSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  type: z.union([z.enum(GENERATOR_SYSTEM_TABLE_TYPES), customTableTypeSchema]),
  entries: z.array(generatorEntrySchema).max(GENERATOR_IMPORT_LIMITS.maxEntriesPerTable),
  isActive: z.boolean().default(true),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const generatorPackSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2_000).default(''),
  isActive: z.boolean().default(true),
  tables: z.array(generatorTableSchema).max(GENERATOR_IMPORT_LIMITS.maxTablesPerPack),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const generatorJsonImportSchema = z.object({
  packs: z.array(generatorPackSchema).max(GENERATOR_IMPORT_LIMITS.maxPacksPerImport),
});

export const generatorAiResponseSchema = z.object({
  pack: z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2_000).default(''),
    tables: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(120),
          type: z.union([
            z.enum(GENERATOR_SYSTEM_TABLE_TYPES),
            z.string().regex(/^custom:[a-z0-9][a-z0-9_-]{1,62}$/i),
          ]),
          entries: z
            .array(
              z.object({
                value: z.string().trim().min(1).max(GENERATOR_IMPORT_LIMITS.maxEntryValueLength),
                weight: z.number().finite().positive().max(1000).default(1),
                tags: z
                  .array(z.string().trim().min(1).max(GENERATOR_IMPORT_LIMITS.maxTagLength))
                  .max(GENERATOR_IMPORT_LIMITS.maxEntryTags)
                  .default([]),
              }),
            )
            .max(GENERATOR_IMPORT_LIMITS.maxEntriesPerTable),
        }),
      )
      .max(GENERATOR_IMPORT_LIMITS.maxTablesPerPack),
  }),
});

export type GeneratorEntryInput = z.infer<typeof generatorEntrySchema>;
export type GeneratorTableInput = z.infer<typeof generatorTableSchema>;
export type GeneratorPackInput = z.infer<typeof generatorPackSchema>;
export type GeneratorJsonImportInput = z.infer<typeof generatorJsonImportSchema>;
export type GeneratorAiResponseInput = z.infer<typeof generatorAiResponseSchema>;

