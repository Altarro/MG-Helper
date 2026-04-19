import { nanoid } from 'nanoid';

/** Generates a URL-safe unique ID (21 chars by default). */
export function generateId(): string {
  return nanoid();
}
