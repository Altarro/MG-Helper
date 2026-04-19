import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Location } from '@modules/locations/types';
import type { Npc } from '@modules/npcs/types';
import type { Thread } from '@modules/threads/types';
import {
  getContainedNpcIds,
  getContainedNpcs,
  getCurrentSceneNpcIds,
  getDraftSceneNpcs,
  getLiveLocation,
  getSessionNpcPanelData,
  getSessionThreadBoardData,
  getSessionThreatCount,
  getSessionThreadIds,
  getSessionThreads,
  type SessionThreadBoardData,
  type SessionNpcPanelData,
} from '../utils/liveSessionData';

const EMPTY_THREADS: Thread[] = [];
const EMPTY_NPCS: Npc[] = [];
const EMPTY_IDS: string[] = [];
const EMPTY_SESSION_THREAD_BOARD: SessionThreadBoardData = {
  threatGroups: [],
  freeThreads: [],
};
const EMPTY_NPC_PANEL_DATA: SessionNpcPanelData = {
  npcs: EMPTY_NPCS,
  locationRelIds: new Map<string, string>(),
  draftRelIds: new Map<string, string>(),
};

export function useLiveLocation(locationId: string | null): Location | null {
  const { db } = useCampaign();
  return useLiveQuery(() => getLiveLocation(db, locationId), [db, locationId]) ?? null;
}

export function useSessionThreads(sessionId: string): Thread[] {
  const { db } = useCampaign();
  return useLiveQuery(() => getSessionThreads(db, sessionId), [db, sessionId]) ?? EMPTY_THREADS;
}

export function useSessionThreadIds(sessionId: string): string[] {
  const { db } = useCampaign();
  return useLiveQuery(() => getSessionThreadIds(db, sessionId), [db, sessionId]) ?? EMPTY_IDS;
}

export function useSessionThreadBoard(sessionId: string): SessionThreadBoardData {
  const { db } = useCampaign();
  return useLiveQuery(
    () => getSessionThreadBoardData(db, sessionId),
    [db, sessionId],
  ) ?? EMPTY_SESSION_THREAD_BOARD;
}

export function useSessionThreatCount(sessionId: string): number {
  const { db } = useCampaign();
  return useLiveQuery(() => getSessionThreatCount(db, sessionId), [db, sessionId]) ?? 0;
}

export function useContainedNpcIds(locationId: string | null): string[] {
  const { db } = useCampaign();
  return useLiveQuery(() => getContainedNpcIds(db, locationId), [db, locationId]) ?? EMPTY_IDS;
}

export function useContainedNpcs(locationId: string | null): Npc[] {
  const { db } = useCampaign();
  return useLiveQuery(() => getContainedNpcs(db, locationId), [db, locationId]) ?? EMPTY_NPCS;
}

export function useDraftSceneNpcs(sessionId: string): Npc[] {
  const { db } = useCampaign();
  return useLiveQuery(() => getDraftSceneNpcs(db, sessionId), [db, sessionId]) ?? EMPTY_NPCS;
}

export function useCurrentSceneNpcIds(sessionId: string, currentLocationId: string | null): string[] {
  const { db } = useCampaign();
  return useLiveQuery(
    () => getCurrentSceneNpcIds(db, sessionId, currentLocationId),
    [db, sessionId, currentLocationId],
  ) ?? EMPTY_IDS;
}

export function useSessionNpcPanelData(
  sessionId: string,
  locationId: string | null,
): SessionNpcPanelData {
  const { db } = useCampaign();
  return useLiveQuery(
    () => getSessionNpcPanelData(db, sessionId, locationId),
    [db, sessionId, locationId],
  ) ?? EMPTY_NPC_PANEL_DATA;
}
