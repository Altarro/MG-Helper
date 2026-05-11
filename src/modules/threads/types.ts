import type { Entity } from '@shared/types/entity';

export const THREAD_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
] as const;

export const THREAD_STATUSES = ['active', 'completed'] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];

export const THREAD_STATUS_LABELS: Record<ThreadStatus, string> = {
  active: 'Aktywny',
  completed: 'Zakończony',
};

export const THREAD_KINDS = ['main', 'side', 'personal'] as const;
export type ThreadKind = (typeof THREAD_KINDS)[number];

export const THREAD_KIND_LABELS: Record<ThreadKind, string> = {
  main: 'Główny',
  side: 'Poboczny',
  personal: 'Osobisty',
};

export const THREAD_PRIORITIES = ['low', 'normal', 'high'] as const;
export type ThreadPriority = (typeof THREAD_PRIORITIES)[number];

export const THREAD_PRIORITY_LABELS: Record<ThreadPriority, string> = {
  low: 'Niski',
  normal: 'Normalny',
  high: 'Wysoki',
};

export interface ThreadData {
  // Thread is a playable quest / case / lead, not a generic note.
  color: string;
  status: ThreadStatus;
  kind?: ThreadKind;
  priority?: ThreadPriority;
  stakes?: string[];
  resolution?: string;
  sortOrder?: number;
}

export type Thread = Entity & { type: 'thread'; data: ThreadData };

export function isThread(entity: Entity): entity is Thread {
  return entity.type === 'thread';
}

export function getThreadStakes(thread: { data: ThreadData }): string[] {
  return Array.isArray(thread.data.stakes) ? thread.data.stakes : [];
}
