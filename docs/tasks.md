# MG Helper — Lista zadań

Legenda statusów: [ ] do zrobienia, [~] w trakcie, [x] ukończone.

## Aktywny plan wydania

### [ ] Faza 20 — Alpha 1.0

- [ ] 20.1 Urealnić dane demo w seedzie pod pełny przekrój modułów.
- [ ] 20.2 Dokończyć główny README produktu (opis, uruchomienie, moduły).
- [ ] 20.3 Potwierdzić spójność wersji wydania w miejscach będących źródłem prawdy.
- [ ] 20.4 Wykonać finalny pełny pass jakości: pnpm typecheck, pnpm lint, pnpm test, pnpm build.
- [ ] 20.5 Oznaczyć wydanie tagiem v0.1.0-alpha po akceptacji.

## Stałe obszary jakości (poza pojedynczym release)

### [ ] Testy

- [ ] Rozszerzać pokrycie testów operacji DB i ścieżek integracyjnych.
- [ ] Rozszerzać testy komponentowe dla nowych paneli i modalnych ścieżek UX.
- [ ] Stabilizować testy reaktywne oparte o useLiveQuery.

### [ ] Dostępność

- [ ] Utrzymać pełne aria-label/title dla akcji ikonowych.
- [ ] Utrzymać przewidywalny focus management (modal, popover, formularze).
- [ ] Utrzymać semantykę HTML i kontrast zgodny z WCAG AA.

### [ ] Wydajność

- [ ] Kontrolować code-splitting i rozmiar bundla po większych zmianach.
- [ ] Profilować najcięższe widoki i zapytania Dexie przy większych danych.
- [ ] Wprowadzać memoizację/wirtualizację tylko tam, gdzie pomiar daje zysk.

## Backlog rozwojowy (po Alpha)

- [ ] PWA (service worker, manifest, strategia cache).
- [ ] Synchronizacja między urządzeniami.
- [ ] Undo/Redo na poziomie operacji danych.
- [ ] Szablony encji i workflow przyspieszające przygotowanie sesji.
- [ ] Eksport PDF i dalsza automatyzacja raportów.

## Historia ukończonych faz (skrót)

- [x] Fazy 1-10: fundament aplikacji, moduły rdzeniowe, dashboard, graph, import/export, polish.
- [x] Faza 11: rozbudowa domenowa i workflow Session Live.
- [x] Faza 12: wskazówki (Three Clue Rule).
- [x] Faza 13: wątki fabularne.
- [x] Faza 14: oś czasu.
- [x] Faza 15: SessionLive Command Center + CI.
- [x] Faza 16: wielokampanijność.
- [x] Faza 17: stabilizacja i UX audit.
- [x] Faza 18: żetonowe notatki sesji.
- [x] Faza 19: session report i print.
- [x] Faza OV/F.3 + Prerelease I-III: overlay system, drag and drop, redesign i hardening Session Live.

## Archiwum szczegółowe

Szczegółowe, historyczne checklisty i rozpiski faz są dostępne w:

- [Backups/tasks.backup_20260420_cleanup.md](Backups/tasks.backup_20260420_cleanup.md)
- [Backups/tasks.backup_20260414_144744.md](Backups/tasks.backup_20260414_144744.md)
- [quickfix.md](quickfix.md)