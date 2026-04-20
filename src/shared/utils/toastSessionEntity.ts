// Wspólny util do komunikatów toast dla usuwania encji z sesji
// Używaj w SessionDetail, SessionNpcPanel, SessionHudTray

export function toastRemoveEntitySuccess(entityType: string, entityName: string) {
  // Odmiana dla typów encji
  switch (entityType) {
    case 'npc':
      return `${entityName} usunięta z sesji`;
    case 'location':
      return `${entityName} usunięta z sesji`;
    case 'item':
      return `${entityName} usunięty z sesji`;
    case 'thread':
      return `${entityName} usunięty z sesji`;
    case 'clue':
      return `${entityName} usunięta z sesji`;
    case 'threat':
      return `${entityName} usunięte z sesji`;
    default:
      return `${entityName} usunięto z sesji`;
  }
}

export function toastRemoveEntityError(entityType: string) {
  switch (entityType) {
    case 'npc':
      return 'Nie udało się usunąć postaci z sesji';
    case 'location':
      return 'Nie udało się usunąć lokacji z sesji';
    case 'item':
      return 'Nie udało się usunąć przedmiotu z sesji';
    case 'thread':
      return 'Nie udało się usunąć wątku z sesji';
    case 'clue':
      return 'Nie udało się usunąć wskazówki z sesji';
    case 'threat':
      return 'Nie udało się usunąć zagrożenia z sesji';
    default:
      return 'Nie udało się usunąć encji z sesji';
  }
}
