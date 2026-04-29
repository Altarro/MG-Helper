# Procedura rollback: migracje generatora

Cel: szybko przywrocic dane generatora po nieudanej automatycznej naprawie danych.

## Kiedy uruchamiac rollback

- Po starcie aplikacji pojawia sie komunikat o naprawie danych generatora i MG raportuje utrate paczek/logow.
- Po update widac niekompletne tabele lub brak historii losowan.
- QA potwierdza regresje w danych po migracji.

## Kroki operacyjne

1. Wejdz do `Ustawienia -> Ustawienia systemowe`.
2. W sekcji `Kopie zapasowe` kliknij `Przywróć ostatni backup migracyjny generatora`.
3. Zweryfikuj komunikat sukcesu (liczba paczek i logow).
4. Odswiez widok `Ustawienia generatora` i sprawdz:
   - listę paczek,
   - liczbę tabel,
   - historie losowan w `Inspiracje`.
5. Jesli rollback nie pomogl, wykonaj pełny import z backupu JSON/ZIP.

## Weryfikacja po rollbacku

- `generatorPacks` zawiera oczekiwana liczbe paczek.
- `generatorRollLogs` zawiera historie zgodna z ostatnim stanem przed naprawa.
- Kluczowe flowy (`Losuj`, `Dodaj do notatki`, `Utwórz encję`) dzialaja.

## Uwagi implementacyjne

- Backup migracyjny jest zapisywany automatycznie przed naprawa integralnosci danych generatora.
- Rollback dotyczy tylko danych generatora (paczki + logi), bez zmian encji kampanii.
