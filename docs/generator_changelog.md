# Changelog modułu generatora

## 2026-04-23

- Dodano backup danych generatora do backupu JSON i ZIP.
- Dodano walidacje integralnosci generatora po starcie aplikacji.
- Dodano snapshoty migracyjne i rollback danych generatora.
- Dodano testy migracyjne na kopiach danych produkcyjnych.
- Dodano onboarding hint przy pierwszym uruchomieniu panelu `Inspiracje`.

## 2026-04-22

- Ustabilizowano `GeneratorSettingsPanel` (drafty per tabela, import JSON/AI, confirm replace).
- Dodano testy regresji importu, hookow i integracji sesyjnej.
- Rozszerzono kontrakty i walidacje importu (limity, kolizje, fallbacki).

## 2026-04-21

- Podlaczono panel `Inspiracje` do `SessionLive`.
- Dodano mapowanie losowan na encje/notatki sesyjne.
- Dodano historie losowan i akcje kontekstowe w panelu live.
