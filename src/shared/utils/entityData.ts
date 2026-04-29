import type { Entity } from '@shared/types/entity';
import { deriveLifecycleStatus, type LifecycleStatus } from '@shared/types/entityLifecycle';
import type { ClockData } from '@modules/clocks/types';
import type { ClueData } from '@modules/clues/types';
import type { FactionData } from '@modules/factions/types';
import type { FrontData, ThreatData } from '@modules/fronts/types';
import { THREAT_STATUSES, type ThreatStatus } from '@modules/fronts/types';
import type { ItemData } from '@modules/items/types';
import type { LocationData } from '@modules/locations/types';
import type { NoteData } from '@modules/notes/types';
import type { NpcData, NpcLocationHistoryData } from '@modules/npcs/types';
import type { SessionData, SessionEventData } from '@modules/sessions/types';
import type { ThreadData } from '@modules/threads/types';
import { deriveThreatStatus } from './threatLifecycle';

type EntityDataTarget = Pick<Entity, 'data'>;
type TimestampedEntityDataTarget = Pick<Entity, 'data' | 'createdAt'>;

function readData<T>(entity: EntityDataTarget): T {
  return entity.data as T;
}

export function getNpcData(entity: EntityDataTarget): NpcData {
  return readData<NpcData>(entity);
}

export function getNpcLifecycleStatus(entity: EntityDataTarget): LifecycleStatus {
  const d = getNpcData(entity);
  return deriveLifecycleStatus(d.status);
}

export function isPlayerNpc(entity: EntityDataTarget & { isPC?: boolean }): boolean {
  return getNpcData(entity).isPC === true || entity.isPC === true;
}

export function getLocationData(entity: EntityDataTarget): LocationData {
  return readData<LocationData>(entity);
}

export function getLocationLifecycleStatus(entity: EntityDataTarget): LifecycleStatus {
  const d = getLocationData(entity);
  return deriveLifecycleStatus(d.status);
}

export function getFrontData(entity: EntityDataTarget): FrontData {
  return readData<FrontData>(entity);
}

export function getThreatData(entity: EntityDataTarget): ThreatData {
  return readData<ThreatData>(entity);
}

export function getThreatStatus(entity: EntityDataTarget): ThreatStatus {
  const data = getThreatData(entity);
  return deriveThreatStatus(
    data.status && THREAT_STATUSES.includes(data.status) ? data.status : undefined,
    data.completionReason,
    data.reasonOfDead,
  );
}

export function getClockData(entity: EntityDataTarget): ClockData {
  return readData<ClockData>(entity);
}

export function getSessionData(entity: EntityDataTarget): SessionData {
  return readData<SessionData>(entity);
}

export function getSessionSortOrder(entity: EntityDataTarget): number {
  return getSessionData(entity).sortOrder ?? Number.POSITIVE_INFINITY;
}

export function getFactionData(entity: EntityDataTarget): FactionData {
  return readData<FactionData>(entity);
}

export function getFactionLifecycleStatus(entity: EntityDataTarget): LifecycleStatus {
  const d = getFactionData(entity);
  return deriveLifecycleStatus(d.status);
}

export function getItemData(entity: EntityDataTarget): ItemData {
  return readData<ItemData>(entity);
}

export function getItemLifecycleStatus(entity: EntityDataTarget): LifecycleStatus {
  const d = getItemData(entity);
  return deriveLifecycleStatus(d.status);
}

export function getClueData(entity: EntityDataTarget): ClueData {
  return readData<ClueData>(entity);
}

export function getThreadData(entity: EntityDataTarget): ThreadData {
  return readData<ThreadData>(entity);
}

export function getThreadSortOrder(entity: EntityDataTarget): number {
  return getThreadData(entity).sortOrder ?? Number.POSITIVE_INFINITY;
}

export function getSessionEventData(entity: EntityDataTarget): SessionEventData {
  return readData<SessionEventData>(entity);
}

export function getSessionEventTimestamp(entity: TimestampedEntityDataTarget): string {
  return getSessionEventData(entity).timestamp ?? entity.createdAt;
}

export function getNoteData(entity: EntityDataTarget): NoteData {
  return readData<NoteData>(entity);
}

export function getNpcLocationHistoryData(entity: EntityDataTarget): NpcLocationHistoryData {
  return readData<NpcLocationHistoryData>(entity);
}
