/**
 * Polish count phrases: 1 → `one`, 2–4 (except 12–14) → `few`, else → `many`.
 */
export function formatPolishCount(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(count);
  if (n === 1) return `${count} ${one}`;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
    return `${count} ${few}`;
  }
  return `${count} ${many}`;
}

export function formatPolishFrontCount(count: number): string {
  return formatPolishCount(count, 'front', 'fronty', 'frontów');
}

export function formatPolishThreatCount(count: number): string {
  return formatPolishCount(count, 'zagrożenie', 'zagrożenia', 'zagrożeń');
}

export function formatPolishThreadCount(count: number): string {
  return formatPolishCount(count, 'wątek', 'wątki', 'wątków');
}

export function formatPolishClueCount(count: number): string {
  return formatPolishCount(count, 'wskazówka', 'wskazówki', 'wskazówek');
}

/** Krótko w UI: „postać / postacie / postaci” (zamiast skrótu „NPC”). */
export function formatPolishCharacterCount(count: number): string {
  return formatPolishCount(count, 'postać', 'postacie', 'postaci');
}
