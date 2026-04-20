# MG Helper — Wymagania techniczne

Ten dokument opisuje wymagania operacyjne projektu.
Szczegóły architektury i struktury kodu znajdują się w [architecture.md](architecture.md).
Szczegółowy kontrakt danych encji i relacji znajduje się w [story-domain-contract.md](story-domain-contract.md).

## 1. Środowisko uruchomieniowe

### 1.1 Narzędzia

- Node.js 20+
- pnpm 9+
- Git

### 1.2 Przeglądarki

- Wspierane: nowoczesne przeglądarki z IndexedDB i ES2022.
- Minimalnie testowane: aktualne wersje Chromium.

## 2. Instalacja i uruchamianie

```bash
pnpm install
pnpm dev
```

Build produkcyjny:

```bash
pnpm build
```

## 3. Bramy jakości

Każda większa zmiana powinna przechodzić minimum:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Dla zmian dotyczących kodowania i treści wymagających walidacji znaków:

```bash
pnpm test:encoding
```

Jeśli zmiana dotyczy lifecycle zagrożeń lub cleanup:

```bash
pnpm test tests/shared/threatLifecycle.test.ts
```

## 4. Wymagania danych i bezpieczeństwa

- Dane użytkownika są lokalne (IndexedDB) i nie wymagają backendu.
- Backup JSON jest traktowany jako krytyczna ścieżka bezpieczeństwa danych.
- Import danych musi przechodzić walidację kontraktu i sanityzację treści.

## 5. Wymagania UX i dostępności

- Akcje krytyczne wymagają jednoznacznych etykiet i przewidywalnego efektu.
- Overlaye i modale muszą zachowywać focus management.
- Interfejs ma utrzymywać spójne słownictwo działań sesja/scena.

## 6. Wersje i zależności

- Źródłem prawdy dla zależności i wersji runtime jest package.json.
- Źródłem prawdy dla rozstrzygniętych wersji pakietów jest pnpm-lock.yaml.
- Przy zmianie narzędzi lub wersji krytycznych należy zaktualizować ten dokument oraz changelog.

## 7. Powiązane dokumenty

- [architecture.md](architecture.md) — model architektury.
- [decisions.md](decisions.md) — uzasadnienie decyzji technicznych.
- [story-domain-contract.md](story-domain-contract.md) — kontrakty encji i relacji.
- [release-readiness.md](release-readiness.md) — checklista release.
- [CHANGELOG.md](CHANGELOG.md) — historia zmian.
