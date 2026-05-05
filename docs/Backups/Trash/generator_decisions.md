# Generator Inspiracji — decyzje produktowo-techniczne

## Etap 1.1 — decyzje MVP

- Zakres MVP: `postac`, `lokacja`, `eventTable`, `customTable`.
- Losowanie seryjne: presets `1`, `3`, `5`; rozszerzenie do `N` w etapie po-MVP.
- Format postaci: `Imie Przydomek Nazwisko` (segmenty puste sa pomijane).
- Format lokacji: `Typ: Nazwa` (fallback do samej nazwy gdy brak typu).
- Event table: pojedynczy wpis na losowanie.
- Braki danych: fallback stringi systemowe + toast w UI przy krytycznych brakach.
- Historia losowan: domyslnie zapisywana w kampanii + opcjonalnie z `sessionId`.
- Jezyk/tone: neutralny jako default; tone przez zestawy danych (PL/EN, fantasy itp.).

## Etap 1.4 — decyzje architektoniczne

- RNG: wspieramy deterministic roll przez `seed`; bez seeda losowanie niedeterministyczne.
- API: `previewRollFromPack` (bez skutkow ubocznych) oraz `commitRollFromPack` (zapis historii przez warstwe repo/hook).
- API panelu live: hook `useGeneratorRoll` z komendami domenowymi (`rollCharacter`, `rollLocation`, `rollEvent`, `rollCustom`).
- Telemetria: eventy lokalne (klik losuj, typ, seed/no-seed, czas akcji) przez moduł `generator/telemetry`.
- Definition of Ready Etapu 2:
  - kontrakty/schematy domkniete,
  - import/export i merge strategy wdrozone,
  - hooki generatora gotowe do integracji UI,
  - testy silnika RNG i wag przechodza.

