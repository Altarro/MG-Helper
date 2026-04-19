import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

/** Returns an ISO 8601 string for the current moment. */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Formats an ISO string as a human-readable date, e.g. "7 kwi 2026". */
export function formatDate(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy', { locale: pl });
}

/** Formats an ISO string as a human-readable date+time, e.g. "7 kwi 2026, 14:32". */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy, HH:mm', { locale: pl });
}

/** Returns a relative time string, e.g. "2 minuty temu". */
export function timeAgo(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: pl });
}
