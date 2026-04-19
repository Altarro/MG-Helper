import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { isNamedLocation } from '@modules/locations/types';
import { isNote } from '@modules/notes/types';
import { isSession } from '@modules/sessions/types';
import { getEntityById } from '@shared/db/operations';
import type { MgHelperDb } from '@shared/db/database';
import { getClockData, getNoteData, getSessionData } from '@shared/utils/entityData';
import type { Entity } from '@shared/types/entity';

/**
 * Exports a full session report as a Markdown string.
 * Aggregates entities linked via `appears_in` and notes stored by sessionId.
 */
export async function exportSessionMarkdown(db: MgHelperDb, sessionId: string): Promise<string> {
  const session = await db.entities.get(sessionId);
  if (!session || !isSession(session)) throw new Error(`Session not found: ${sessionId}`);

  // Fetch all appears_in relations pointing at this session
  const rels = await db.relations
    .where('targetId')
    .equals(sessionId)
    .filter((r) => r.type === 'appears_in')
    .toArray();

  const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
  const valid = entities.filter((e): e is Entity => e !== undefined);

  const npcs = valid.filter((e) => e.type === 'npc');
  const locations = valid.filter(isNamedLocation);
  const items = valid.filter((e) => e.type === 'item');
  const threads = valid.filter((e) => e.type === 'thread');
  const clues = valid.filter((e) => e.type === 'clue');
  const clocks = valid.filter((e) => e.type === 'clock');

  // Fetch notes by sessionId
  const allNoteEntities = await db.entities.where('type').equals('note').toArray();
  const notes = allNoteEntities
    .filter(isNote)
    .filter((e) => e.data.sessionId === sessionId)
    .sort((a, b) => {
      const ca = getNoteData(a).createdAt ?? '';
      const cb = getNoteData(b).createdAt ?? '';
      return ca.localeCompare(cb);
    });

  const sessionData = getSessionData(session);
  const title = session.name || `Sesja ${sessionData.number ?? '?'}`;
  const dateStr = sessionData.date
    ? format(parseISO(sessionData.date), 'd MMMM yyyy', { locale: pl })
    : '';

  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');
  if (dateStr) lines.push(`**Data:** ${dateStr}  `);
  if (sessionData.summary) {
    lines.push('');
    lines.push(`> ${sessionData.summary}`);
  }

  // Notes section
  if (notes.length > 0) {
    lines.push('');
    lines.push('## Notatki');
    lines.push('');
    notes.forEach((note, i) => {
      const nd = getNoteData(note);
      const ts = nd.createdAt ? ` _(${nd.createdAt})_` : '';
      lines.push(`${i + 1}. ${nd.content}${ts}`);
    });
  }

  function entitySection(heading: string, items: Entity[], fmt: (e: Entity) => string) {
    if (items.length === 0) return;
    lines.push('');
    lines.push(`## ${heading}`);
    lines.push('');
    items.forEach((e) => lines.push(fmt(e)));
  }

  entitySection('Postacie', npcs, (e) => `- ${e.name}`);
  entitySection('Lokacje', locations, (e) => `- ${e.name}`);
  entitySection('Wątki', threads, (e) => `- ${e.name}`);
  entitySection('Wskazówki', clues, (e) => `- ${e.name}`);
  entitySection('Przedmioty', items, (e) => `- ${e.name}`);

  if (clocks.length > 0) {
    lines.push('');
    lines.push('## Zegary');
    lines.push('');
    clocks.forEach((e) => {
      const cd = getClockData(e);
      lines.push(`- ${e.name} (${cd.filled}/${cd.segments})`);
    });
  }

  return lines.join('\n');
}
