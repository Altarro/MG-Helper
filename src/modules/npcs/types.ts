import type { Entity } from '@shared/types/entity';
import type { SessionEventData } from '@modules/sessions/types';

export interface NpcData {
  instinct: string;
  motivation: string;
  appearance: string;
  playStyle: string; // how to portray/play this NPC at the table
  isPC?: boolean;
  playerName?: string;
}

export type Npc = Entity & { type: 'npc'; data: NpcData };

export function isNpc(entity: Entity): entity is Npc {
  return entity.type === 'npc';
}

export interface NpcLocationHistoryData extends SessionEventData, Record<string, unknown> {
  kind: 'npc_location_history';
  npcId: string;
  locationId: string;
  locationName: string;
  sessionId?: string;
  sessionName?: string;
}

export type NpcLocationHistoryEvent = Entity & { type: 'event'; data: NpcLocationHistoryData };

export function isNpcLocationHistoryEvent(entity: Entity): entity is NpcLocationHistoryEvent {
  return entity.type === 'event' && entity.data.kind === 'npc_location_history';
}
