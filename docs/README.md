# Dokumentacja MG Helper

Ten katalog jest głównym miejscem dokumentacji technicznej i produktowej projektu.
Po porządkach z 2026-04-20 każdy obszar ma jedno źródło prawdy.

## Szybki start

1. Sprawdź stan wydania w [release-readiness.md](release-readiness.md).
2. Sprawdź aktywne zadania w [tasks.md](tasks.md).
3. Jeśli zmieniasz kontrakty techniczne, dopisz ADR w [decisions.md](decisions.md).
4. Zapisz efekt zmiany w [CHANGELOG.md](CHANGELOG.md).

## Źródła prawdy

| Obszar | Plik | Zakres |
|---|---|---|
| Architektura | [architecture.md](architecture.md) | Warstwy systemu, granice modułów, model danych, wzorce implementacyjne |
| Wymagania techniczne | [requirements.md](requirements.md) | Wymagania środowiska, komendy, bramki jakości, wymagania operacyjne |
| Decyzje architektoniczne | [decisions.md](decisions.md) | Rejestr ADR i uzasadnienie decyzji, które mają wpływ długoterminowy |
| Plan pracy | [tasks.md](tasks.md) | Tylko aktywne zadania i skrót ukończonych faz |
| Gotowość do wydania | [release-readiness.md](release-readiness.md) | Checklista release i krytyczne smoke testy |
| Historia zmian | [CHANGELOG.md](CHANGELOG.md) | Zmiany wersji i istotne modyfikacje produktu |
| Wielokampanijność | [multicampaign.md](multicampaign.md) | Szczegóły architektury i workflow dla kampanii |

## Archiwum i materiały robocze

| Plik | Status | Uwagi |
|---|---|---|
| [quickfix.md](quickfix.md) | Archiwum historyczne | Pełny plan i przebieg prac quickfix |
| [quickfix-technical-notes.md](quickfix-technical-notes.md) | Archiwum historyczne | Notatki techniczne z quickfix; decyzje przeniesione do ADR |
| [threats-clocks-scope.md](threats-clocks-scope.md) | Materiał roboczy | Zakres konkretnej serii zmian, nie źródło prawdy dla całej aplikacji |
| [story-domain-contract.md](story-domain-contract.md) | Materiał referencyjny | Kontrakt domenowy narracji i relacji |
| [Backups](Backups) | Kopie bezpieczeństwa | Snapshoty dokumentów przed większymi porządkami |

## Zasady utrzymania dokumentacji

- Jeden temat powinien mieć jeden plik źródłowy.
- Jeśli treść jest historyczna, przenosimy ją do archiwum zamiast dublować.
- Zmiana kodu, która wpływa na kontrakt techniczny lub UX, wymaga aktualizacji odpowiedniego dokumentu.
- Duże zmiany należy zapisać w dwóch miejscach: ADR (decyzja) i changelog (efekt).
