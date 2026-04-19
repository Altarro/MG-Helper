# MG Helper

Aplikacja webowa dla Mistrza Gry do zarządzania notatkami kampanii RPG.
Zainspirowana mechanikami **PbtA (Powered by the Apocalypse)** — fronty, zagrożenia, zegary.  
Działa **w 100% offline** — dane przechowywane lokalnie w przeglądarce (IndexedDB).

---

## Funkcjonalności

| Moduł | Opis |
|---|---|
| **Postacie** | NPC i gracze PC z instinktem, motywacją, stylem gry |
| **Lokacje** | Zagnieżdżona hierarchia, zmysły, poziom niebezpieczeństwa |
| **Fronty i Zagrożenia** | Pełny PbtA workflow — cele, ruchy GM, pytania stawki |
| **Zegary** | SVG 4/6/8/10/12 segmentów, opisy tyknięć, status aktywny/martwy |
| **Sesje + Live** | Canvas na żywo z pływającymi kartami + dolny HUD tray (Spotlight/Zagrożenia/Notatki/Timeline/NPC) |
| **Współkampanijność** | Izolowane bazy per kampania, przełącznik kampanii w TopBar |
| **Notatki sesji** | Żetonowe notatki z auto-kontekstem (lokacja, postacie, wątki) i historią per encja |
| **Raporty sesji** | Agregowany raport po sesji, print CSS, eksport do Markdown; tryb sprzątania (`/cleanup`) |
| **Frakcje i Przedmioty** | Organizacje z siedzibami, artefakty i ekwipunek |
| **Wskazówki** | Three Clue Rule — typy, odkryte/nieodkryte, powiązanie z zagrożeniami |
| **Wątki fabularne** | Kolorowe wątki narracyjne z hierarchią `derives_from` |
| **Oś czasu** | Gantt: sesje (X) × wątki (Y) — widok narracji kampanii |
| **Mapa relacji** | Interaktywny graf powiązań (react-force-graph-2d) |
| **Import / Export** | Pełna baza → JSON; pojedyncza encja → Markdown |
| **Drag & Drop** | Sortowanie sesji/wątków; przenoszenie NPC między lokacjami |

---

## Reality Check

- Produkt jest offline-first na poziomie danych i pracy w przegladarce dzieki IndexedDB.
- Produkt nie jest jeszcze PWA: w repo nie ma `public/manifest.json`, service workera ani polityki cache.
- Oznacza to, ze CRUD i praca na danych sa lokalne, ale instalowalnosc i offline cold start pozostaja backlogiem.

## Uruchomienie

**Wymagania:** Node.js 20+, pnpm 9+

```bash
pnpm install
pnpm dev
```

Aplikacja dostępna pod `http://localhost:5173`.

```bash
pnpm build        # produkcyjny build do dist/
pnpm test         # testy jednostkowe i integracyjne (Vitest)
pnpm typecheck    # weryfikacja TypeScript
pnpm lint         # ESLint
```

## Wdrozenie na GitHub Pages

- Produkcyjny adres aplikacji: `https://altarro.github.io/MG-Helper/`
- Deployment jest realizowany przez workflow: `.github/workflows/deploy-pages.yml`
- Publikacja uruchamia sie automatycznie po pushu do brancha `main`
- W repo na GitHub ustaw `Settings -> Pages -> Source: GitHub Actions`

Routing dziala w trybie `HashRouter`, wiec adresy widokow maja format:

- `https://altarro.github.io/MG-Helper/#/campaigns`
- `https://altarro.github.io/MG-Helper/#/sessions`
- `https://altarro.github.io/MG-Helper/#/settings`

---

## Stack

| Warstwa | Technologia |
|---|---|
| UI | React 19 + TypeScript 5 + TailwindCSS 4 |
| Routing | React Router 7 (lazy routes) |
| Persystencja | Dexie.js 4 (IndexedDB, offline-first) |
| Formularze | react-hook-form + Zod |
| Rich-text | Tiptap 2 (ProseMirror) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Graf | react-force-graph-2d |
| Testy | Vitest + Testing Library + fake-indexeddb |

---

## Status implementacji

| Faza | Zakres | Status |
|---|---|---|
| 1–10 | Scaffold, Core, Clocks, NPC+Loc, Fronts, Sessions, Factions, Items, Graph, Import/Export, Polish | ✅ |
| 11 | Rozbudowa: tickLabels, PC flag, SpotlightTracker, TickProgress | ✅ |
| 12 | Moduł Wskazówki (Three Clue Rule) | ✅ |
| 13 | Moduł Wątki fabularne | ✅ |
| 14 | Oś czasu (Timeline Gantt) | ✅ |
| 15 | SessionLive Command Center + CI | ✅ |
| F.3 | Drag & Drop (@dnd-kit) | ✅ |
| 16 | Wielokampanijność (izolowane bazy per kampania) | ✅ |
| 17 | Stabilizacja i UX Audit | ✅ |
| 18 | Żetonowe Notatki Sesji | ✅ |
| 19 | Session Report & Print | ✅ |
| OV | System Overlayów (Modal, AnchoredPanel, Backdrop) | ✅ |
| PR | SessionLive Command Center (pełny rewrite) | ✅ |
| PR.II | SessionLive Canvas Redesign (pływające karty + HUD tray) | ✅ |
| 20 | Alpha 1.0 (seed finalny, README, tag) | 🔲 |

---

## Release Readiness

Przed wydaniem korzystaj z checklisty i polityk:

- [`docs/release-readiness.md`](release-readiness.md)
- [`docs/CHANGELOG.md`](CHANGELOG.md)
- [`docs/decisions.md`](decisions.md)
- [`docs/quickfix-technical-notes.md`](quickfix-technical-notes.md)

## Architektura

Modularny monolit frontendowy — każdy moduł domenowy jest izolowany i komunikuje się z resztą wyłącznie przez warstwę bazy danych (Dexie) i współdzielone hooki. Brak backendu, brak serwera.

Szczegóły: [`docs/architecture.md`](docs/architecture.md)  
Wymagania techniczne: [`docs/requirements.md`](docs/requirements.md)  
Lista zadań: [`docs/tasks.md`](docs/tasks.md)  
Decyzje projektowe: [`docs/decisions.md`](docs/decisions.md)

---

## Dane demo

Przy pierwszym uruchomieniu aplikacja oferuje załadowanie przykładowej kampanii (seed) zawierającej postacie, lokacje, fronty, zagrożenia, zegary, sesje, frakcje, wątki i wskazówki.

Seed można też załadować ręcznie w **Ustawieniach** (`/settings`).
