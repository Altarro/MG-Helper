import type { Entity } from '@shared/types/entity';
import type { Relation } from '@shared/types/relation';
import {
  getClueStrengthLabel,
  getThreadDerivationKindLabel,
} from '@shared/domain/storyContracts';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  npc: 'NPC',
  location: 'Lokacja',
  front: 'Front',
  threat: 'Zagrożenie',
  clock: 'Zegar',
  session: 'Sesja',
  faction: 'Frakcja',
  item: 'Przedmiot',
};

const RELATION_TYPE_LABELS: Record<string, string> = {
  contains: 'zawiera',
  belongs_to: 'należy do',
  tracks: 'śledzi',
  appears_in: 'pojawia się w',
  owns: 'posiada',
  related_to: 'powiązany z',
  clues_for: 'wskazowka do',
  derives_from: 'wynika z',
  affects: 'wplywa na',
};

/** Strips simple HTML tags to get plain text */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Exports a single entity + its relations to a Markdown string.
 * Does NOT use database — caller must pass `relations` and an optional
 * `relatedEntities` map for resolving names.
 */
export function exportEntityMarkdown(
  entity: Entity,
  relations: Relation[] = [],
  relatedEntities: Map<string, Entity> = new Map(),
): string {
  const lines: string[] = [];
  lines.push(`# ${entity.name}`);
  lines.push('');
  lines.push(`**Typ:** ${ENTITY_TYPE_LABELS[entity.type] ?? entity.type}`);
  if (entity.tags.length > 0) {
    lines.push(`**Tagi:** ${entity.tags.join(', ')}`);
  }
  lines.push('');

  // Module-specific data fields
  const data = entity.data;
  const dataEntries = Object.entries(data).filter(
    ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0),
  );
  if (dataEntries.length > 0) {
    lines.push('## Dane');
    for (const [key, value] of dataEntries) {
      if (Array.isArray(value)) {
        lines.push(`**${key}:**`);
        value.forEach((item) => lines.push(`- ${item}`));
      } else {
        lines.push(`**${key}:** ${value}`);
      }
    }
    lines.push('');
  }

  if (entity.description) {
    const text = htmlToText(entity.description);
    if (text) {
      lines.push('## Opis');
      lines.push(text);
      lines.push('');
    }
  }

  if (relations.length > 0) {
    lines.push('## Relacje');
    for (const rel of relations) {
      const otherId = rel.sourceId === entity.id ? rel.targetId : rel.sourceId;
      const other = relatedEntities.get(otherId);
      const otherName = other ? `**${other.name}**` : `(${otherId})`;
      const direction = rel.sourceId === entity.id ? '→' : '←';
      const typeLabel = RELATION_TYPE_LABELS[rel.type] ?? rel.type;
      const relationMetaSuffix =
        rel.type === 'derives_from' && rel.meta?.threadDerivationKind
          ? getThreadDerivationKindLabel(rel.meta.threadDerivationKind)
          : rel.type === 'clues_for' && rel.meta?.clueStrength
            ? getClueStrengthLabel(rel.meta.clueStrength)
            : undefined;
      const suffixParts = [rel.label, relationMetaSuffix].filter(Boolean);
      const labelSuffix = suffixParts.length > 0 ? ` (${suffixParts.join('; ')})` : '';
      lines.push(`- ${direction} ${typeLabel} ${otherName}${labelSuffix}`);
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`*Eksport: ${new Date().toLocaleString('pl-PL')}*`);
  return lines.join('\n');
}

/** Triggers a Markdown file download for the given entity */
export function downloadEntityMarkdown(
  entity: Entity,
  relations: Relation[] = [],
  relatedEntities: Map<string, Entity> = new Map(),
): void {
  const md = exportEntityMarkdown(entity, relations, relatedEntities);
  const blob = new Blob([md], { type: 'text/markdown; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = entity.name.replace(/[^a-z0-9\-_]/gi, '-').toLowerCase();
  a.href = url;
  a.download = `${entity.type}-${safeName}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
