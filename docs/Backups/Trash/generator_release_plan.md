# Release plan i kryteria akceptacji (Generator)

## Go/No-Go

### Go gdy:

- brak otwartych bugow P0/P1 w generatorze,
- zielony pakiet testow krytycznych (`generator`, `session live`, `backup/import`),
- audit E2E i wydajnosci zakonczony wynikiem akceptowalnym,
- checklista kontraktu AI przechodzi dla paczek referencyjnych.

### No-Go gdy:

- jakakolwiek regresja danych po migracji/rollbacku,
- niespelniony kontrakt AI lub wysoka stopa odrzuconych importow,
- krytyczne flowy live (`Losuj`, `Utworz encje`, `Notatka`) sa niestabilne.

## Etapowy rollout

1. `beta-internal` (zespół + QA)
2. `beta-mg` (wybrani MG)
3. `stable` (wszyscy)

Warunek przejscia: min. 1 sprint stabilnych metryk i brak nowych P0.

## Incident response ownerzy

- Product owner: decyzje priorytetowe i komunikacja zmian.
- Tech owner: triage techniczny, rollback, hotfix.
- QA owner: reprodukcja, plan retestu, gate releasowy.

## SLA

- Krytyczne bugi generatora (P0): hotfix lub obejscie <= 24h.
- Poprawki UX (P2/P3): decyzja i plan <= 1 sprint.

## Finalny audit E2E

- import CSV/JSON + merge mode,
- losowanie 4 trybow,
- konwersja do notatki/encji,
- backup/restore + rollback migracyjny,
- telemetry insighty i feedback.

## Finalny audit wydajnosci

- losowanie dla tabel >10k wpisow,
- czas reakcji akcji panelu `Inspiracje`,
- koszt importu duzych paczek.

## Zamkniecie etapu

Po releasie: retro i decyzja o scope `v2 advanced generation`.
