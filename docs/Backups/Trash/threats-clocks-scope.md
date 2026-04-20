 # Zasięg prac — Zagrożenia (threats) i Zegary (clocks)

 Cel:
 Ograniczamy zmiany do poniższych plików. Przed edycją innych plików proszę o potwierdzenie.

 Pliki (zwięzły opis):
 - src/modules/fronts/types.ts — definicje `ThreatData`, `THREAT_STATUSES`, `THREAT_TYPES`.
 - src/modules/fronts/hooks/useThreatById.ts — pobieranie pojedynczego zagrożenia.
 - src/modules/fronts/hooks/useThreats.ts — lista/pobieranie zagrożeń.
 - src/modules/fronts/components/ThreatList.tsx — lista zagrożeń / dodawanie.
 - src/modules/fronts/components/ThreatCard.tsx — skrócony widok zagrożenia.
 - src/modules/fronts/components/ThreatForm.tsx — formularz tworzenia/edycji (z opcją zegara).
 - src/modules/fronts/components/ThreatDetail.tsx — logika powiązań z zegarem, tworzenia zegara, kasowania kaskadowego, tick.
 - src/modules/fronts/components/FrontDetail.tsx — tworzenie/łączenie threat ↔ clock przy edycji frontu.
 - src/modules/clocks/types.ts — model `ClockData` (`segments`, `filled`, `tickLabels`, `isActive`) i helper `isCompleted`.
 - src/modules/clocks/components/ClockWidget.tsx — widżet i prezentacja zegara.
 - src/modules/clocks/components/ClockDetail.tsx — szczegóły zegara.
 - src/shared/db/relationRules.ts — reguły relacji (np. `tracks: threat -> clock`).
 - src/shared/types/relation.ts — definicje typów relacji (`tracks`).
 - src/shared/utils/entityData.ts — `getThreatStatus`, `getClockData` (logika statusów).
 - src/shared/db/operations.ts — `addEntity`, `addRelation`, `updateEntity`, `deleteEntity` (operacje DB).
 - src/modules/sessions/components/ActiveThreatsPanel.tsx — panel sesji, toggle statusu, tickowanie zegarów.
 - src/shared/components/RelationPicker.tsx, src/shared/components/RelationList.tsx — interfejs do dodawania/usuwania relacji.
 - src/shared/hooks/useRelatedEntities.ts — helper do pobierania powiązanych encji.

 Główne reguły i uwagi:
 - Status zagrożenia: `getThreatStatus(entity)` zwraca `data.status` jeśli jest poprawny; jeśli brak `status`, ale `reasonOfDead` jest nie-pusty → `'completed'`; w przeciwnym razie `'active'`.
 - Relacja `tracks` jest dozwolona tylko od `threat` do `clock` (reguły w `relationRules.ts`). Tworzenie relacji odbywa się przez `addRelation`.
 - Tworzenie zegara: komponenty (np. `ThreatDetail`, `FrontDetail`) tworzą encję typu `clock` z `filled: 0` i `isActive: true` oraz dodają relację `tracks`.
 - Zmiana statusu: przy przełączeniu statusu aktualizowany jest `threat.data.status` oraz `reasonOfDead`; jeśli istnieje związany zegar, aktualizowane jest `clock.data.isActive`.
 - Tickowanie: inkrementacja `clock.data.filled` przez `updateEntity`; gdy `filled >= segments` → zegar traktowany jako wypełniony.

 Kolejne kroki:
 1. Potwierdź scope (tak/nie).
 2. Po potwierdzeniu: przeanalizuję szczegóły `getThreatStatus` i miejsca, gdzie status jest modyfikowany, oraz zaproponuję ewentualne drobne poprawki.

Kroki do wykonania:
1. Ujednolicić logikę `threat` w jednej ścieżce domenowej, bez dokładania nowych reguł w komponentach UI.
2. Wydzielić wspólne operacje dla `threat` i `clock` do jednego miejsca, tak żeby tworzenie, zmiana statusu i kasowanie miały jedną kanoniczną ścieżkę.
3. Zachować obecne reguły relacji i walidacji jako źródło prawdy, a komponenty ograniczyć do wywołań akcji.
4. Zmiany robić etapami, zaczynając od najbezpieczniejszych miejsc: sesja live, szczegóły zagrożenia, tworzenie zagrożenia z zegarem.
5. Po każdej zmianie sprawdzić, czy status zagrożenia, `reasonOfDead`, relacja `tracks` i `clock.isActive` zachowują się spójnie.
6. Nie rozszerzać zakresu na `threads`, `clues` i `fronts`, dopóki ścieżka `threats` + `clocks` nie jest ustabilizowana.
