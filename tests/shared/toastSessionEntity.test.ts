import { describe, expect, it } from 'vitest';
import {
  toastRemoveEntityError,
  toastRemoveEntitySuccess,
} from '@shared/utils/toastSessionEntity';

describe('toastSessionEntity', () => {
  it('returns correct success messages for supported entity types', () => {
    expect(toastRemoveEntitySuccess('npc', 'Ala')).toBe('Ala usunięta z sesji');
    expect(toastRemoveEntitySuccess('location', 'Wieża')).toBe('Wieża usunięta z sesji');
    expect(toastRemoveEntitySuccess('item', 'Relikt')).toBe('Relikt usunięty z sesji');
    expect(toastRemoveEntitySuccess('thread', 'Wątek')).toBe('Wątek usunięty z sesji');
    expect(toastRemoveEntitySuccess('clue', 'Wskazówka')).toBe('Wskazówka usunięta z sesji');
    expect(toastRemoveEntitySuccess('threat', 'Zagrożenie')).toBe('Zagrożenie usunięte z sesji');
  });

  it('returns fallback success message for unsupported entity type', () => {
    expect(toastRemoveEntitySuccess('unknown', 'Encja')).toBe('Encja usunięto z sesji');
  });

  it('returns correct error messages for supported entity types', () => {
    expect(toastRemoveEntityError('npc')).toBe('Nie udało się usunąć postaci z sesji');
    expect(toastRemoveEntityError('location')).toBe('Nie udało się usunąć lokacji z sesji');
    expect(toastRemoveEntityError('item')).toBe('Nie udało się usunąć przedmiotu z sesji');
    expect(toastRemoveEntityError('thread')).toBe('Nie udało się usunąć wątku z sesji');
    expect(toastRemoveEntityError('clue')).toBe('Nie udało się usunąć wskazówki z sesji');
    expect(toastRemoveEntityError('threat')).toBe('Nie udało się usunąć zagrożenia z sesji');
  });

  it('returns fallback error message for unsupported entity type', () => {
    expect(toastRemoveEntityError('unknown')).toBe('Nie udało się usunąć encji z sesji');
  });
});
