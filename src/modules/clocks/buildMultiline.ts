/** Łączy niepuste wiersze pól tekstowych w jeden string z separatorem nowej linii (np. „Zegar tyka, gdy”). */
export function buildMultilineFromRows(rows: { value: string }[]): string {
  return rows.map((r) => r.value.trim()).filter(Boolean).join('\n');
}
