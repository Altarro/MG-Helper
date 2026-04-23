# Release notes (zespół) — Generator

## Zakres

- domkniecie stabilizacji Etapu 4.1-4.4,
- telemetry insighty + feedback loop,
- kontrakt AI z walidacja keywordow i normalizacja tagow.

## Najwazniejsze zmiany techniczne

- backup JSON/ZIP obejmuje dane generatora,
- health-check danych generatora po starcie + snapshot i rollback,
- migracja legacy ustawien do per-kampania,
- panel insightow produktowych i formularz feedbacku w `Inspiracje`,
- kontrolowany slownik tagow i walidacja kompatybilnosci `locationType`/`locationName`.

## Ryzyka i obserwacja

- jakosc danych AI zalezna od przestrzegania kontraktu,
- ryzyko odrzuconych importow przy niespojnych tagach,
- monitoring: porzucone importy, konwersje, srednia ocena feedbacku.
