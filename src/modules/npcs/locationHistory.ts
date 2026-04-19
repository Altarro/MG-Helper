import { isDraftLocation, isLocation } from '@modules/locations/types';
import type { SessionEventData } from '@modules/sessions/types';
import { isSession } from '@modules/sessions/types';
import type { MgHelperDb } from '@shared/db/database';
import { addEntity } from '@shared/db/operations';
import { nowISO } from '@shared/utils/date';
import { getNpcLocationHistoryData } from '@shared/utils/entityData';
import type { Entity } from '@shared/types/entity';
import {
  isNpc,
  isNpcLocationHistoryEvent,
  type NpcLocationHistoryData,
  type NpcLocationHistoryEvent,
} from './types';

export const NPC_LOCATION_HISTORY_KIND = 'npc_location_history' as const;

export interface RecordNpcLocationHistoryOptions {
  npcId: string;
  locationId: string;
  sessionId?: string | null;
}

function compareHistoryDesc(a: NpcLocationHistoryEvent, b: NpcLocationHistoryEvent): number {
  return b.data.timestamp.localeCompare(a.data.timestamp);
}

export async function getNpcLocationHistory(
  db: MgHelperDb,
  npcId: string,
): Promise<NpcLocationHistoryEvent[]> {
  const events = await db.entities
    .where('type')
    .equals('event')
    .filter((entity): entity is Entity => entity !== undefined)
    .toArray();

  return events
    .filter(isNpcLocationHistoryEvent)
    .filter((event) => event.data.npcId === npcId)
    .map((event) => ({ ...event, data: getNpcLocationHistoryData(event) }))
    .sort(compareHistoryDesc);
}

export async function recordNpcLocationHistory(
  db: MgHelperDb,
  options: RecordNpcLocationHistoryOptions,
): Promise<NpcLocationHistoryEvent | null> {
  const [npc, location, session, history] = await Promise.all([
    db.entities.get(options.npcId),
    db.entities.get(options.locationId),
    options.sessionId ? db.entities.get(options.sessionId) : Promise.resolve(undefined),
    getNpcLocationHistory(db, options.npcId),
  ]);

  if (!npc || !isNpc(npc)) return null;
  if (!location || !isLocation(location) || isDraftLocation(location)) return null;

  const latest = history[0];
  if (latest?.data.locationId === location.id) {
    return latest;
  }

  const sessionEntity = session && isSession(session) ? session : null;
  const data = {
    kind: NPC_LOCATION_HISTORY_KIND,
    timestamp: nowISO(),
    text: `${npc.name} widziany w ${location.name}`,
    npcId: npc.id,
    locationId: location.id,
    locationName: location.name,
    sessionId: sessionEntity?.id,
    sessionName: sessionEntity?.name,
  } satisfies NpcLocationHistoryData & SessionEventData;

  const entity = await addEntity(db, {
    type: 'event',
    name: 'Historia lokacji NPC',
    description: '',
    tags: [],
    data,
  });

  return { ...entity, type: 'event', data: getNpcLocationHistoryData(entity) };
}
