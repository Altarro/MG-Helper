import { nowISO } from '@shared/utils/date';
import { addEntity, addRelation } from '@shared/db/operations';
import type { MgHelperDb } from '@shared/db/database';
import type { Entity } from '@shared/types/entity';
import type { SessionEventData } from '../types';

export type SessionSignalType = NonNullable<SessionEventData['signalType']>;

interface RecordSessionSignalInput {
  sessionId: string;
  signalType: SessionSignalType;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
}

function buildSignalText(input: RecordSessionSignalInput): string {
  const name = input.entityName?.trim() || input.entityId || 'nieznany obiekt';
  if (input.signalType === 'entity_added_to_session') return `Dodano do sesji: ${name}`;
  if (input.signalType === 'entity_removed_from_session') return `Usunięto z sesji: ${name}`;
  if (input.signalType === 'thread_created_in_session') return `Utworzono wątek: ${name}`;
  if (input.signalType === 'threat_status_changed') return `Zmiana statusu zagrożenia: ${name}`;
  if (input.signalType === 'entity_died_in_session') return `Śmierć w sesji: ${name}`;
  if (input.signalType === 'threat_clock_started') return `Ruszył zegar zagrożenia: ${name}`;
  if (input.signalType === 'entity_updated_in_session') return `Zmiana encji w sesji: ${name}`;
  if (input.signalType === 'clock_ticked') return `Tick zegara: ${name}`;
  if (input.signalType === 'clue_discovered') return `Odkryto wskazówkę: ${name}`;
  if (input.signalType === 'clue_hidden') return `Ukryto wskazówkę: ${name}`;
  return `${input.signalType}: ${name}`;
}

export async function recordSessionSignal(
  db: MgHelperDb,
  input: RecordSessionSignalInput,
): Promise<void> {
  const sessionEntity = await db.entities.get(input.sessionId);
  const sessionContext =
    sessionEntity?.type === 'session'
      ? {
          sessionName: sessionEntity.name,
          sessionNumber:
            typeof sessionEntity.data.number === 'number' ? sessionEntity.data.number : undefined,
        }
      : undefined;

  const eventData: SessionEventData = {
    kind: 'session_signal',
    timestamp: nowISO(),
    text: buildSignalText(input),
    sessionId: input.sessionId,
    signalType: input.signalType,
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    sessionName: sessionContext?.sessionName,
    metadata: {
      ...(input.metadata ?? {}),
      sessionContext,
    },
  };

  const eventEntity = await addEntity(db, {
    type: 'event',
    name: eventData.text.slice(0, 80),
    description: '',
    tags: ['session-signal', input.signalType],
    data: eventData as unknown as Record<string, unknown>,
  });

  await addRelation(db, {
    type: 'appears_in',
    sourceId: eventEntity.id,
    targetId: input.sessionId,
  });
}

export async function recordEntityMutationInSession(
  db: MgHelperDb,
  input: {
    sessionId: string;
    entityType: string;
    entityId: string;
    entityName: string;
    changedFields: string[];
    source: string;
    extra?: Record<string, unknown>;
  },
): Promise<void> {
  await recordSessionSignal(db, {
    sessionId: input.sessionId,
    signalType: 'entity_updated_in_session',
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    metadata: {
      changedFields: input.changedFields,
      source: input.source,
      ...(input.extra ?? {}),
    },
  });
}

export function getEntityIdentity(entity: Entity | undefined): {
  entityType?: string;
  entityId?: string;
  entityName?: string;
} {
  if (!entity) return {};
  return {
    entityType: entity.type,
    entityId: entity.id,
    entityName: entity.name,
  };
}
