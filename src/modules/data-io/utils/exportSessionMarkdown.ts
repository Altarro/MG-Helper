import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { isNamedLocation } from '@modules/locations/types';
import { isNote } from '@modules/notes/types';
import { isSession, isSessionEvent } from '@modules/sessions/types';
import { getEntityById } from '@shared/db/operations';
import type { MgHelperDb } from '@shared/db/database';
import { getClockData, getNoteData, getSessionData, getSessionEventData } from '@shared/utils/entityData';
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
  const operationalNotes = notes.filter((note) => {
    const decision = getNoteData(note).cleanupDecision ?? 'pending';
    return decision === 'keep' || decision === 'pending';
  });
  const archivedNotes = notes.filter(
    (note) => (getNoteData(note).cleanupDecision ?? 'pending') === 'archive',
  );

  const eventEntities = valid.filter(isSessionEvent);
  const timelineEvents = eventEntities
    .filter((eventItem) => (getSessionEventData(eventItem).kind ?? 'session_timeline') === 'session_timeline')
    .sort((a, b) =>
      getSessionEventData(a).timestamp.localeCompare(getSessionEventData(b).timestamp),
    );
  const signalEvents = eventEntities
    .filter((eventItem) => getSessionEventData(eventItem).kind === 'session_signal')
    .sort((a, b) =>
      getSessionEventData(a).timestamp.localeCompare(getSessionEventData(b).timestamp),
    );

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

  const allTimestamps = [
    ...timelineEvents.map((eventItem) => getSessionEventData(eventItem).timestamp),
    ...signalEvents.map((eventItem) => getSessionEventData(eventItem).timestamp),
    ...operationalNotes.map((note) => getNoteData(note).createdAt ?? ''),
  ]
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const runStart = sessionData.liveRunStartedAt ?? allTimestamps[0]?.toISOString();
  const runEnd = sessionData.liveRunEndedAt ?? allTimestamps[allTimestamps.length - 1]?.toISOString();
  const runDurationMin =
    runStart && runEnd
      ? Math.max(0, Math.round((Date.parse(runEnd) - Date.parse(runStart)) / 60000))
      : null;
  const plannedDurationMin =
    typeof sessionData.plannedDurationMin === 'number' ? sessionData.plannedDurationMin : null;
  const etaDeltaMin =
    runDurationMin != null && plannedDurationMin != null
      ? runDurationMin - plannedDurationMin
      : null;
  const threatStatusChanges = signalEvents.filter(
    (eventItem) => getSessionEventData(eventItem).signalType === 'threat_status_changed',
  );

  lines.push('');
  lines.push('## Metryki sesji');
  lines.push('');
  lines.push(`- Czas trwania sesji: ${runDurationMin != null ? `${runDurationMin} min` : 'brak danych'}`);
  lines.push(`- Planowany czas: ${plannedDurationMin != null ? `${plannedDurationMin} min` : 'brak planu'}`);
  lines.push(`- Odchylenie vs ETA: ${
    etaDeltaMin == null ? 'brak danych' : `${etaDeltaMin > 0 ? '+' : ''}${etaDeltaMin} min`
  }`);
  lines.push(`- Zmiany statusów zagrożeń: ${threatStatusChanges.length}`);

  if (sessionData.spotlightSummary) {
    lines.push('');
    lines.push('## Spotlight');
    lines.push('');
    lines.push(`- MG aktywnie: ${Math.round(sessionData.spotlightSummary.mgTotalActiveSec / 60)} min`);
    lines.push(`- MG oczekiwanie: ${Math.round(sessionData.spotlightSummary.mgWaitSec / 60)} min`);
    if (sessionData.spotlightSummary.players.length > 0) {
      lines.push('');
      lines.push('### Gracze');
      lines.push('');
      sessionData.spotlightSummary.players.forEach((player) => {
        lines.push(`- ${player.name}: aktywnie ${Math.round(player.totalActiveSec / 60)} min, oczekiwanie ${Math.round(player.waitSec / 60)} min`);
      });
    }
  }

  if (threatStatusChanges.length > 0) {
    lines.push('');
    lines.push('## Zmiany statusów zagrożeń');
    lines.push('');
    threatStatusChanges.forEach((eventItem) => {
      const data = getSessionEventData(eventItem);
      const fromStatus = typeof data.metadata?.from === 'string' ? data.metadata.from : null;
      const toStatus = typeof data.metadata?.to === 'string' ? data.metadata.to : null;
      lines.push(`- ${(data.entityName ?? eventItem.name)}${fromStatus && toStatus ? `: ${fromStatus} -> ${toStatus}` : ''}`);
    });
  }

  // Notes section
  if (operationalNotes.length > 0) {
    lines.push('');
    // Keep legacy heading for compatibility with existing tests/export consumers.
    lines.push('## Notatki');
    lines.push('');
    lines.push('## Notatki operacyjne');
    lines.push('');
    operationalNotes.forEach((note, i) => {
      const nd = getNoteData(note);
      const ts = nd.createdAt ? ` _(${nd.createdAt})_` : '';
      lines.push(`${i + 1}. ${nd.content}${ts}`);
    });
  }

  if (archivedNotes.length > 0) {
    lines.push('');
    lines.push('## Notatki archiwalne (poza raportem operacyjnym)');
    lines.push('');
    archivedNotes.forEach((note) => {
      const nd = getNoteData(note);
      lines.push(`- ${nd.content}`);
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

  lines.push('');
  lines.push('## Kolejne kroki');
  lines.push('');
  lines.push('- Domknąć cleanup i potwierdzić zależności encji po sesji.');
  lines.push('- Zweryfikować zagrożenia i wątki, które zmieniły status.');
  lines.push('- Przepisać kluczowe notatki do encji domenowych.');

  return lines.join('\n');
}
