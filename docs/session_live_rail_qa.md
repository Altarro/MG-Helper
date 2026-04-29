# Session Live Rail QA Checklist

Ten dokument zbiera manualne scenariusze QA dla prawego raila w `SessionLive`.

## Overflow (bardzo długie listy)

- [ ] Otwórz `Inspiracje` i wygeneruj >30 wyników, sprawdź płynność scrolla i widoczność przycisku `scroll-to-top`.
- [ ] Otwórz `Wyszukaj` i sprawdź długą listę wyników (sesja + kampania), brak obcinania kart.
- [ ] Otwórz `Wskazówki` z wieloma grupami i potwierdź poprawne zachowanie badge count.

## Viewporty

- [ ] `640px` szerokości: rail i panel są używalne, sekcje otwierają się poprawnie.
- [ ] `1024px` szerokości: brak nachodzenia panelu na główny obszar treści.
- [ ] `1920px` szerokości: panel zachowuje spójny spacing i wysokości sekcji.

## Pointer drag vs klikalne elementy

- [ ] Drag na tle panelu przewija zawartość.
- [ ] Kliki na przyciskach/odnośnikach nadal działają po dragowaniu.
- [ ] Drag nie blokuje zmiany sekcji w railu (`Inspiracje` -> `Wyszukaj` -> `Wątki`).

## Focus i klawiatura

- [ ] `ArrowUp/ArrowDown` przechodzą po przyciskach sekcji raila.
- [ ] `Home/End` ustawiają fokus na pierwszej/ostatniej sekcji.
- [ ] `Escape` zamyka prawy panel.

## Spójność nagłówków i badge count

- [ ] `Inspiracje`, `Wyszukaj`, `Wskazówki` mają jednolity styl nagłówka.
- [ ] Badge count aktualizuje się poprawnie przy zmianie danych.
