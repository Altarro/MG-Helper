# MG Helper — Architektura

Ten dokument opisuje docelowy i aktualny model architektury aplikacji.
Szczegóły implementacyjne pojedynczych feature'ów znajdują się w modułach kodu i testach.

## 1. Kontekst systemu

MG Helper to frontendowa aplikacja SPA działająca lokalnie w przeglądarce.

- Brak backendu aplikacyjnego.
- Persystencja danych: IndexedDB przez Dexie.
- Model pracy: offline-first.
- Model wdrożenia web: GitHub Pages + HashRouter.

## 2. Model warstw

```
┌──────────────────────────────────────────────┐
│                 UI (React)                   │
│ app/ + modules/* + shared/components         │
├──────────────────────────────────────────────┤
│           Logika domenowa i hooki            │
│ modules/*/hooks + shared/hooks               │
├──────────────────────────────────────────────┤
│         Operacje danych i reguły relacji     │
│ shared/db/operations + relationRules          │
├──────────────────────────────────────────────┤
│             Dexie / IndexedDB                │
│ entities + relations                          │
└──────────────────────────────────────────────┘
```

## 3. Granice modułów

Projekt jest zorganizowany feature-based, a nie technicznie per typ pliku.

- Każdy obszar domenowy ma własny katalog w modules.
- Każdy moduł zarządza własnym UI, hookami i kontraktami typów.
- Wspólne elementy trafiają do shared dopiero, gdy realnie służą wielu modułom.

Przykładowe moduły domenowe:

- npcs, locations, sessions, fronts, clues, threads, items, factions, notes.
- graph, search, settings, campaigns, dashboard jako moduły przekrojowe.

## 4. Model danych

### 4.1 Encje

- Wszystkie rekordy domenowe są przechowywane w tabeli entities.
- Typ rekordu jest rozróżniany polem type.
- Pola wspólne są stabilne, a pola domenowe trzymane w data.

To podejście zmniejsza liczbę migracji schematu Dexie przy rozwoju produktu.

### 4.2 Relacje

- Powiązania między encjami są przechowywane osobno w tabeli relations.
- Reguły dozwolonych relacji są walidowane w shared/db/relationRules.
- Relacje są traktowane jako kontrakt domenowy i podstawa widoków cross-entity.

### 4.3 Operacje i integralność

- Operacje zapisu realizują funkcje z shared/db/operations.
- Usuwanie encji czyści zależne relacje.
- Import/eksport przechodzi przez walidację i sanityzację danych.

## 5. Wzorce implementacyjne

### 5.1 Odczyt

- Odczyty korzystają z useLiveQuery i hooków modułowych.
- Komponenty wyższego poziomu korzystają z hooków zamiast bezpośrednich zapytań.

### 5.2 Zapis

- Zmiany stanu domeny idą przez funkcje command/operations.
- Logika side effect (toast, nawigacja, focus) pozostaje po stronie UI.

### 5.3 Formularze

- Kontrakt formularzy opiera się o react-hook-form + Zod.
- Walidacja wejścia jest spójna między tworzeniem, edycją i importem danych.

### 5.4 Overlay i interakcje

- Bazowe prymitywy overlay: Modal, AnchoredPanel, Backdrop.
- Kluczowe kontrakty UX: ESC close, backdrop close, focus trap, restore focus.

## 6. Session Live — architektura stanu

Session Live utrzymuje dwa poziomy stanu:

- Stan danych kampanii w IndexedDB (encje i relacje).
- Stan sesji roboczej w storage przeglądarki (layout, aktywne karty, HUD, spotlight).

Założenia:

- Odtwarzalność po odświeżeniu strony.
- Idempotentne operacje dodaj/odepnij/przypnij.
- Jasny podział sesja vs scena.

## 7. Wielokampanijność

Każda kampania ma osobną bazę Dexie.

- Nazwa bazy jest pochodną campaignId.
- Aktywna kampania jest wybierana przez CampaignContext.
- Hooki i operacje korzystają z db dostarczonego przez kontekst kampanii.

Skutek: silna izolacja danych między kampaniami i prostszy model backupu.

## 8. Routing i deployment

- Routing aplikacji opiera się o React Router i HashRouter.
- Build jest przygotowany pod publikację na GitHub Pages.
- Konfiguracja deploymentu i base path jest utrzymywana zgodnie z konfiguracją Vite.

## 9. Ograniczenia i decyzje produktowe

- Produkt jest offline-first, ale nie jest pełnym PWA (brak service workera i instalowalności).
- Brak serwera oznacza brak synchronizacji w czasie rzeczywistym między urządzeniami.
- Import/eksport backupu pozostaje krytycznym mechanizmem bezpieczeństwa danych.

## 10. Dokumenty powiązane

- [requirements.md](requirements.md) — wymagania techniczne i operacyjne.
- [decisions.md](decisions.md) — decyzje ADR.
- [release-readiness.md](release-readiness.md) — checklista release.
- [tasks.md](tasks.md) — aktywny plan pracy.
- [CHANGELOG.md](CHANGELOG.md) — historia zmian.