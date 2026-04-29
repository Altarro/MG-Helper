import {
  GENERATOR_IMPORT_LIMITS,
  generatorAiResponseSchema,
  generatorJsonImportSchema,
  type GeneratorAiResponseInput,
  type GeneratorJsonImportInput,
} from './schemas';
import { normalizeTagList } from './releaseContract';

export interface GeneratorCsvParseResult {
  ok: boolean;
  rows: Array<{ value: string; weight: number; tags: string[] }>;
  errors: string[];
}

/**
 * CSV shape (header optional):
 * value,weight,tags
 * "Ada",1,"hero,pc"
 */
export function parseGeneratorCsv(content: string): GeneratorCsvParseResult {
  const lines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { ok: false, rows: [], errors: ['Plik CSV jest pusty.'] };
  }

  const errors: string[] = [];
  const rows: Array<{ value: string; weight: number; tags: string[] }> = [];
  const first = (lines[0] ?? '').toLowerCase();
  const hasHeader = first.startsWith('value') || first.startsWith('wartosc');
  const body = hasHeader ? lines.slice(1) : lines;
  if (body.length > GENERATOR_IMPORT_LIMITS.maxCsvRows) {
    return {
      ok: false,
      rows: [],
      errors: [`CSV przekracza limit ${GENERATOR_IMPORT_LIMITS.maxCsvRows} wierszy.`],
    };
  }

  body.forEach((line, index) => {
    const rowNumber = hasHeader ? index + 2 : index + 1;
    const [rawValue = '', rawWeight = '1', rawTags = ''] = splitCsvLine(line);
    const value = rawValue.trim();
    if (!value) {
      errors.push(`Wiersz ${rowNumber}: pusta wartosc.`);
      return;
    }
    if (value.length > GENERATOR_IMPORT_LIMITS.maxEntryValueLength) {
      errors.push(
        `Wiersz ${rowNumber}: wartosc przekracza ${GENERATOR_IMPORT_LIMITS.maxEntryValueLength} znakow.`,
      );
      return;
    }

    const weightNum = Number(rawWeight.trim() || '1');
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      errors.push(`Wiersz ${rowNumber}: nieprawidlowa waga "${rawWeight}".`);
      return;
    }

    const tagsRaw = rawTags
      .split('|')
      .flatMap((item) => item.split(','))
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, GENERATOR_IMPORT_LIMITS.maxEntryTags);

    const tooLongTag = tagsRaw.find((tag) => tag.length > GENERATOR_IMPORT_LIMITS.maxTagLength);
    if (tooLongTag) {
      errors.push(
        `Wiersz ${rowNumber}: tag "${tooLongTag}" przekracza ${GENERATOR_IMPORT_LIMITS.maxTagLength} znakow.`,
      );
      return;
    }

    const tags = normalizeTagList(tagsRaw);
    rows.push({ value, weight: weightNum, tags });
  });

  return { ok: errors.length === 0, rows, errors };
}

export function parseGeneratorAiResponse(payload: unknown):
  | { ok: true; data: GeneratorAiResponseInput }
  | { ok: false; errors: string[] } {
  const parsed = generatorAiResponseSchema.safeParse(payload);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const errors = parsed.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });
  return { ok: false, errors };
}

export function parseGeneratorJson(payload: unknown):
  | { ok: true; data: GeneratorJsonImportInput }
  | { ok: false; errors: string[] } {
  const normalizedPayload = normalizeGeneratorJsonPayload(payload);
  const parsed = generatorJsonImportSchema.safeParse(normalizedPayload);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const errors = parsed.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });
  if (looksLikeSinglePackPayload(payload)) {
    errors.push(
      'Wykryto format `pack`. Uzyj formatu `{ "packs": [ ... ] }` lub skorzystaj z auto-wrap przy imporcie.',
    );
  } else if (!looksLikePacksPayload(payload)) {
    errors.push(
      'Payload nie wyglada na kontrakt generatora. Oczekiwany format: `{ "packs": [ { ... } ] }`.',
    );
  }
  return { ok: false, errors };
}

function normalizeGeneratorJsonPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const asObject = payload as Record<string, unknown>;
  if (Array.isArray(asObject.packs)) return payload;
  if (asObject.pack && typeof asObject.pack === 'object') {
    return { ...asObject, packs: [asObject.pack] };
  }
  return payload;
}

function looksLikeSinglePackPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const asObject = payload as Record<string, unknown>;
  return !!asObject.pack && !Array.isArray(asObject.packs);
}

function looksLikePacksPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const asObject = payload as Record<string, unknown>;
  return Array.isArray(asObject.packs);
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}

