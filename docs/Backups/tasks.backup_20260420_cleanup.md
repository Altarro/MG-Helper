# MG Helper — Lista zadań (uporządkowana)

> Legenda statusów: `[ ]` do zrobienia · `[~]` w trakcie · `[x]` ukończone  
> Typ: `[release]` wydanie, `[mvp]` fundament produktu, `[rozwojowy]` rozwój po MVP

---

## 1) Ukończone (od góry)

### [x] [mvp] Fundament aplikacji

- [x] Faza 1 — Scaffold projektu
- [x] Faza 2 — Core infrastruktura (typy, DB, hooki, layout, routing, shared UI)
- [x] Faza 3 — Clocks
- [x] Faza 4 — NPC + Locations
- [x] Faza 5 — Fronts + Threats
- [x] Faza 6 — Sessions
- [x] Faza 7 — Factions + Items
- [x] Faza 7+ — Dashboard
- [x] Faza 8 — Graph
- [x] Faza 9 — Import / Export
- [x] Faza 10 — Polish i UX

### [x] [mvp] Rozszerzenia domenowe

- [x] Faza 11 — Rozbudowa funkcjonalna
- [x] Faza 12 — Moduł Wskazówki (Clues)
- [x] Faza 13 — Moduł Wątki (Plot Threads)
- [x] Faza 14 — Timeline (oś czasu)
- [x] Faza 15 — SessionLive Command Center + SessionDetail + CI
- [x] Faza 16 — Wielokampanijność
- [x] Faza F.3 — Drag & Drop
- [x] Faza 17 — Stabilizacja i UX Audit
- [x] Faza 18 — Żetonowe Notatki Sesji
- [x] Faza 19 — Session Report & Print
- [x] Faza OV — System Overlayów (Modale i Panele)

### [x] [release] Prerelease (zrealizowane)

- [x] Prerelease — SessionLive Command Center
- [x] Prerelease II — SessionLive Canvas Redesign
- [x] Prerelease III — Quickfix Hardening (`docs/quickfix.md`)

---

## 2) Aktywne priorytety (do wykonania)

### [ ] [release] Faza 20 — Alpha 1.0

- [ ] **20.1** Urealnić `seed.ts` pod pełny przekrój modułów
- [ ] **20.2** Uzupełnić główny `README.md` (opis, uruchomienie, moduły)
- [ ] **20.3** Potwierdzić zgodność wersji `package.json` z planem wydania
- [ ] **20.4** Finalny pełny pass: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
- [ ] **20.5** Tag wydania `v0.1.0-alpha` (manualnie po akceptacji)

### [ ] [mvp] Cross-cutting — jakość techniczna

- [ ] **T.2** Testy jednostkowe operacji DB przy każdej fazie
- [ ] **T.3** Testy komponentów (Testing Library) przy nowych widokach
- [ ] **T.4** Testy integracyjne kluczowych przepływów
- [ ] **T.5** Szersze pokrycie testami hooków reaktywnych (`useLiveQuery`)

### [ ] [mvp] Cross-cutting — dostępność

- [ ] **A.1** ARIA labels na interaktywnych elementach
- [ ] **A.2** Nawigacja klawiaturą + focus management/focus trap
- [ ] **A.3** Semantic HTML (headings, landmarks, listy)
- [ ] **A.4** Kontrast kolorów (WCAG AA)

### [ ] [mvp] Cross-cutting — wydajność

- [ ] **P.1** Weryfikacja code-splitting (lazy routes) po buildzie
- [ ] **P.2** `React.memo` na kartach encji w listach
- [ ] **P.3** Virtualizacja list >100 elementów (jeśli potrzebna)
- [ ] **P.4** Audit bundle size (target <500KB gzipped initial load)
- [ ] **P.5** Profiling zapytań Dexie (<100ms CRUD przy 10k encji)

---

## 3) Backlog rozwojowy (najniższy priorytet)

### [ ] [rozwojowy] Dalszy rozwój produktu

- [ ] **F.1** PWA (service worker, `manifest.json`, install flow)
- [ ] **F.2** Synchronizacja przez folder `.md` + Git
- [ ] **F.4** Undo/Redo na poziomie operacji danych
- [ ] **F.5** Szablony encji (archetypy)
- [ ] **F.8** Eksport PDF
- [ ] **F.9** Kolaboracja (CRDT / Yjs)
- [ ] **F.10** AI assist do generowania treści
- [ ] **F.11** Random tables / generatory
- [ ] **F.12** Integracja map
- [ ] **F.13** Encounter tracker (opcjonalny)

---

## 4) Notatka organizacyjna

- Pełna historia szczegółowych kroków i checklist prerelease znajduje się w:
  - `docs/quickfix.md`
  - `docs/CHANGELOG.md`
  - wcześniejszych wpisach fazowych w historii repo
# MG Helper — Lista zadań

> Legenda statusów: `[ ]` do zrobienia · `[~]` w trakcie · `[x]` ukończone

---

## Faza 1 — Scaffold projektu

Cel: działający skeleton z toolingiem, budujący się bez błędów.

- [x] **1.1** Inicjalizacja projektu Vite + React 19 + TypeScript (`pnpm create vite`)
- [x] **1.2** Konfiguracja TypeScript — `strict: true`, aliasy `@app`, `@modules`, `@shared` w `tsconfig.app.json`
- [x] **1.3** Konfiguracja Vite — aliasy ścieżek, resolve extensions
- [x] **1.4** Instalacja i konfiguracja TailwindCSS 4 — `src/styles/index.css` z dyrektywami `@import "tailwindcss"` i `@theme` (CSS-based config, bez pliku `tailwind.config.ts`), custom design tokens (kolory, spacing)
- [x] **1.5** ESLint 9 flat config + Prettier 3 — spójna konfiguracja, integracja z edytorem
- [x] **1.6** Vitest + fake-indexeddb — `tests/setup.ts`, konfiguracja w `vite.config.ts`
- [x] **1.7** Struktura katalogów — utworzenie drzewa `src/app`, `src/modules`, `src/shared` z plikami `index.ts`
- [x] **1.8** `main.tsx` + `App.tsx` — punkt wejścia, minimalna powłoka renderująca "Hello"
- [x] **1.9** Weryfikacja: `pnpm dev`, `pnpm build`, `pnpm test` przechodzą bez błędów

---

## Faza 2 — Core infrastruktura

Cel: warstwa danych, bazowy layout, routing, CRUD, wyszukiwanie — fundament dla wszystkich modułów.

### 2A — Typy i warstwa DB

- [x] **2.1** Definicja typów bazowych — `Entity`, `EntityType` w `shared/types/entity.ts`
- [x] **2.2** Definicja typów relacji — `Relation`, `RelationType` w `shared/types/relation.ts`
- [x] **2.3** Instancja Dexie + schema v1 — `shared/db/database.ts`, `shared/db/schema.ts` (tabele `entities`, `relations` z indeksami)
- [x] **2.4** Generyczne operacje CRUD — `shared/db/operations.ts`: `addEntity`, `updateEntity`, `deleteEntity` (z kaskadowym usuwaniem relacji w transakcji), `addRelation`, `deleteRelation`, `getRelationsFor`
- [x] **2.5** Helper `nanoid` — `shared/utils/id.ts`
- [x] **2.6** Helper `date-fns` — `shared/utils/date.ts` (formatowanie dat)
- [x] **2.7** Sanityzacja HTML — `shared/utils/sanitize.ts` z użyciem `DOMPurify`: czyszczenie outputu Tiptap przed zapisem/wyświetleniem, sanityzacja HTML w importowanym JSON
- [x] **2.7a** Walidacja danych (Zod) — `shared/utils/validation.ts`: schematy walidacji per EntityType, współdzielone między formularzami i importem JSON
- [x] **2.7b** Matryca dozwolonych relacji — `shared/db/relationRules.ts`: konfiguracja dopuszczalnych par (source type, target type, relation type), wymuszana w `addRelation()`
- [x] **2.7c** Konwencja migracji DB — dokumentacja w kodzie: kiedy bumować wersję Dexie (zmiana indeksów) vs. kiedy wystarczy zmiana typu TS (nowe pola encji)
- [x] **2.8** Testy jednostkowe operacji CRUD — dodawanie, edycja, usuwanie encji, kaskadowe usuwanie relacji, walidacja relacji

### 2B — Shared hooks

- [x] **2.9** `useEntityById(id)` — generyczny hook z `useLiveQuery`
- [x] **2.10** `useEntitiesByType(type)` — lista encji po typie z `useLiveQuery`
- [x] **2.11** `useRelations(entityId)` — dwukierunkowe query relacji
- [x] **2.12** `useContained(entityId)` — encje połączone relacją `contains`
- [x] **2.13** `useTags()` — unikalne tagi z autocomplete
- [x] **2.14** `useDebounce(value, delay)` — debounce dla inputów
- [x] **2.14a** `useAutosave(entityId, content)` — debounced autosave (1000ms) + zapis na `blur`, wskaźnik statusu (`Saving...` / `Saved`)
- [x] **2.15** `useSearch(query)` — fulltext po `name`, `tags`, `description` (strip HTML), debounce 300ms
- [x] **2.15a** `useAncestors(entityId)` — rekurencyjne query przodków encji przez relację `contains` (dla breadcrumbs w `TopBar`)
- [x] **2.16** Testy hooków — weryfikacja reaktywności `useLiveQuery`, poprawność filtrowania

### 2C — Layout i routing

- [x] **2.17** React Router — `app/router.tsx` z lazy-loaded routes, `Suspense` + `LoadingSpinner`
- [x] **2.18** `AppShell.tsx` — layout z sidebar + content area (flex, responsive min 768px)
- [x] **2.19** `Sidebar.tsx` — nawigacja modułowa z ikonami lucide-react, aktywny stan trasy
- [x] **2.20** `TopBar.tsx` — breadcrumbs (routing-based z `useMatches`) + `SearchBar`; ukończone
- [x] **2.20a** `Toaster.tsx` (sonner) — wrapper w `shared/components`, montaż w `App.tsx`; toast notifications od Fazy 2: potwierdzenia CRUD, błędy walidacji, feedback operacji
- [x] **2.21** `ErrorBoundary.tsx` — catch boundary per moduł, fallback UI z opcją retry
- [x] **2.22** `LoadingSpinner.tsx` — wskaźnik ładowania dla Suspense
- [x] **2.23** `EmptyState.tsx` — placeholder gdy lista jest pusta
- [x] **2.24** `ConfirmDialog.tsx` — dialog potwierdzenia usuwania (accessible, klawiatura)
- [x] **2.24a** `UnsavedChangesGuard` — hook `useUnsavedChanges` z React Router `useBlocker` + `beforeunload`, ostrzeżenie przy opuszczaniu formularza z niezapisanymi danymi

### 2D — Shared komponenty encji

- [x] **2.25** `EntityCard.tsx` — bazowa karta: name, type badge, tags, description preview; prop `renderExtra` dla pól modułowych
- [x] **2.26** `EntityForm.tsx` — bazowy formularz oparty na `react-hook-form` + `@hookform/resolvers/zod`: name, description (Tiptap), tags; prop `additionalFields` dla rozszerzenia
- [x] **2.27** `TagInput.tsx` — input tagów z autocomplete z `useTags()`
- [x] **2.28** `RichTextEditor.tsx` — wrapper Tiptap z toolbarem (bold, italic, headings, lists, links)
- [x] **2.29** `RelationPicker.tsx` — modal/dropdown do wyboru encji + typu relacji
- [x] **2.30** `RelationList.tsx` — lista relacji encji z akcjami (usuwanie, nawigacja do powiązanej)
- [x] **2.31** `SearchBar.tsx` + `SearchResultsPage.tsx` — komponent wyszukiwarki + strona wyników `/search?q=`
- [x] **2.32** Testy komponentów — EntityCard renderuje dane, EntityForm submit, TagInput autocomplete

---

## Faza 3 — Clocks (zegary)

Cel: pierwszy widoczny moduł PbtA — zegary z wizualnym SVG i tick/reset.

- [x] **3.1** Typy — `Clock extends Entity` w `modules/clocks/types.ts`
- [x] **3.2** `ClockVisual.tsx` — SVG zegar z segmentami (4/6/8/10/12), klikalne segmenty, animacja fill
- [x] **3.3** `ClockWidget.tsx` (shared) — mała wersja inline, click-to-tick, wyświetlanie w kontekście innych encji
- [x] **3.4** `useClocks()` — lista zegarów z `useLiveQuery`
- [x] **3.5** `useClockById(id)` — pojedynczy zegar + relacje
- [x] **3.6** `ClockForm.tsx` — formularz: name, segments (select 4/6/8/10/12), opis, tagi
- [x] **3.7** `ClockCard.tsx` — karta z wizualnym miniaturą zegara
- [x] **3.8** `ClockList.tsx` — lista zegarów z filtrami (all, active, completed)
- [x] **3.9** `ClockDetail.tsx` — widok szczegółowy z dużym zegarem, relacjami, historią tick
- [x] **3.10** Logika tick/reset — `updateEntity` z inkrementacją `filled`, reset do 0
- [x] **3.11** Testy — ClockVisual renderuje poprawną liczbę segmentów, tick inkrementuje, reset zeruje

---

## Faza 4 — NPC + Locations

Cel: główny workflow GM-a — NPC, lokacje zagnieżdżone, relacja `contains`.

### 4A — NPC

- [x] **4.1** Typy — `Npc extends Entity` (`instinct`, `motivation`, `appearance`)
- [x] **4.2** `useNpcs()` + `useNpcById(id)` — hooki z filtrami
- [x] **4.3** `NpcForm.tsx` — formularz: bazowe pola + instinct, motivation, appearance
- [x] **4.4** `NpcCard.tsx` — karta z instinct preview
- [x] **4.5** `NpcList.tsx` — lista NPC z filtrami po tagach, wyszukiwanie
- [x] **4.6** `NpcDetail.tsx` — szczegóły + relacje (lokacja, frakcja, sesje), inline clock

### 4B — Locations

- [x] **4.7** Typy — `Location extends Entity` (`locationType`, `senses`, `danger`); hierarchia przez relację `contains`
- [x] **4.8** `useLocations()` + `useLocationById(id)` + `useLocationTree(id)` — hooki z hierarchią
- [x] **4.9** `LocationForm.tsx` — formularz: bazowe pola + locationType, danger slider, senses (see/hear/smell/feel), parent location picker
- [x] **4.10** `LocationCard.tsx` — karta z typem lokacji i danger indicator
- [x] **4.11** `LocationList.tsx` — lista lokacji z filtrami
- [x] **4.12** `LocationDetail.tsx` — szczegóły + drzewo podlokacji + contained NPC/items
- [x] **4.13** `LocationTree.tsx` — rekurencyjny komponent drzewa hierarchii lokacji

### 4C — Integracja contains

- [x] **4.14** Quick-add z kontekstem — tworzenie NPC z widoku lokacji automatycznie tworzy relację `contains`
- [x] **4.15** Widok lokacji pokazuje NPCe, itemy, zagrożenia przypisane przez `contains`
- [x] **4.16** Testy integracyjne — dodanie NPC do lokacji, nawigacja, wyświetlanie hierarchii

---

## Faza 5 — Fronts + Threats

Cel: pełny PbtA workflow — fronty z zagrożeniami i powiązanymi zegarami.

- [x] **5.1** Typy — `Front extends Entity` (`category`, `stakes`)
- [x] **5.2** Typy — `Threat extends Entity` (`threatType`, `impulse`, `moves`); powiązanie z frontem przez relację `belongs_to`, z zegarem przez `tracks`
- [x] **5.3** `useFronts()` + `useFrontById(id)` — hooki
- [x] **5.4** `useThreats()` + `useThreatById(id)` — hooki
- [x] **5.5** `FrontForm.tsx` — formularz: category (campaign/adventure), stakes (dynamiczna lista), opis
- [x] **5.6** `FrontCard.tsx` — karta z category badge i liczbą zagrożeń
- [x] **5.7** `FrontList.tsx` — lista frontów z filtrami
- [x] **5.8** `FrontDetail.tsx` — front + zagnieżdżone zagrożenia + ich zegary (widok złożony)
- [x] **5.9** `ThreatForm.tsx` — formularz: threatType, impulse, moves (dynamiczna lista), przypisanie do frontu, opcjonalny zegar
- [x] **5.10** `ThreatCard.tsx` + `ThreatList.tsx` + `ThreatDetail.tsx`
- [x] **5.11** Tworzenie zagrożenia z kontekstu frontu — automatyczna relacja `belongs_to`
- [x] **5.12** Tworzenie/przypisanie zegara z kontekstu zagrożenia — automatyczna relacja `tracks`
- [x] **5.13** Testy — przepływ front → threat → clock, poprawność relacji

---

## Faza 6 — Sessions

Cel: dziennik sesji, sesja na żywo z quick-add i tick zegarów.

- [x] **6.1** Typy — `Session extends Entity` (`number`, `date`, `summary`, `notes`)
- [x] **6.2** `useSessions()` + `useSessionById(id)`
- [x] **6.3** `SessionForm.tsx` — formularz: numer, data (date-fns), summary, notes (Tiptap)
- [x] **6.4** `SessionCard.tsx` — karta z numerem, datą, preview summary
- [x] **6.5** `SessionList.tsx` — lista sesji, sortowanie po dacie/numerze
- [x] **6.6** `SessionDetail.tsx` — szczegóły + odwiedzone lokacje + napotkani NPCe (agregacja z relacji `appears_in`)
- [x] **6.7** `SessionLive.tsx` — widok sesji na żywo:
  - [x] Quick-add NPC/lokacji/itemu z automatycznym `appears_in`
  - [x] Tick zegarów inline (lista aktywnych zegarów)
  - [x] Notatki na żywo (Tiptap z autosave)
- [x] **6.8** Testy — quick-add tworzy relację, tick aktualizuje zegar

---

## Faza 7 — Factions + Items

Cel: rozszerzenie zbioru encji o frakcje i przedmioty.

- [x] **7.1** Typy — `Faction extends Entity` (`goals`, `resources`)
- [x] **7.2** Typy — `Item extends Entity` (`itemType`, `properties`)
- [x] **7.3** Hooki, formularze, karty, listy, widoki szczegółowe — `factions/`
- [x] **7.4** Hooki, formularze, karty, listy, widoki szczegółowe — `items/`
- [x] **7.5** Relacja `belongs_to` — NPC → Faction (widoczna w obu kierunkach)
- [x] **7.6** Relacja `owns` — NPC → Item

---

## Faza 7+ — Dashboard

Cel: strona główna agregująca kluczowe informacje z wszystkich modułów.

- [x] **D.1** `useDashboard()` — hook agregujący aktywne fronty, zegary w toku, ostatnio edytowane encje
- [x] **D.2** `Dashboard.tsx` — strona główna `/` z sekcjami: ActiveFronts, RunningClocks, RecentChanges
- [x] **D.3** `ActiveFronts.tsx` — lista aktywnych frontów z liczbą zagrożeń i postępem zegarów
- [x] **D.4** `RunningClocks.tsx` — zegary z `filled < segments`, inline `ClockWidget`
- [x] **D.5** `RecentChanges.tsx` — ostatnio edytowane encje (sortowanie po `updatedAt`)

---

## Faza 8 — Graph (mapa relacji)

Cel: interaktywna wizualizacja grafu powiązań.

- [x] **8.1** `useGraphData()` — transformacja encji + relacji → `{ nodes, links }` dla react-force-graph-2d
- [x] **8.2** `GraphView.tsx` — wrapper react-force-graph-2d, kolorowanie węzłów po `EntityType`, etykiety
- [x] **8.3** `GraphControls.tsx` — filtrowanie widocznych typów encji i relacji (checkboxy)
- [x] **8.4** `GraphTooltip.tsx` — tooltip nad węzłem (name, type, tags) i krawędzią (relation type, label)
- [x] **8.5** Kliknięcie węzła → nawigacja do `/:type/:id`
- [x] **8.6** Wydajność — ograniczenie grafu do podzbioru (np. connected component wybranej encji)

---

## Faza 9 — Import / Export

Cel: bezpieczeństwo danych — eksport i import pełnej bazy, eksport Markdown.

- [x] **9.1** `exportJson.ts` — serializacja `db.entities.toArray()` + `db.relations.toArray()` → JSON Blob → download
- [x] **9.2** `importJson.ts` — walidacja struktury JSON (wymagane pola, poprawność typów encji), import w transakcji (clear + bulkAdd) po potwierdzeniu użytkownika
- [x] **9.3** `exportMarkdown.ts` — konwersja pojedynczej encji do Markdown (name, type, tags, HTML→text, relacje)
- [x] **9.3a** `SettingsPage.tsx` — kontener widoku `/settings` z sekcjami: import/export danych, ładowanie danych demo
- [x] **9.4** `ExportButton.tsx` + `ImportButton.tsx` — UI w widoku ustawień `/settings`
- [x] **9.5** `MarkdownExport.tsx` — przycisk w widoku szczegółowym encji
- [x] **9.6** Walidacja bezpieczeństwa importu — sanityzacja HTML w polach description, weryfikacja referencji relacji
- [x] **9.7** Testy — roundtrip export → import zachowuje dane; import niepoprawnego JSON wyświetla błędy

---

## Faza 10 — Polish i UX

Cel: dopracowanie, animacje, onboarding, dane demo.

- [x] **10.1** Dane demo — `shared/db/seed.ts` — przykładowa kampania z frontami, NPCami, lokacjami, zegarami
- [x] **10.2** Onboarding — dialog pierwszego uruchomienia z opcją załadowania danych demo
- [x] **10.3** Animacje przejść — CSS transitions na kartach, formularzach, sidebar; fade-in animacja treści stron
- [x] **10.4** Toast customization — sonner `<Toaster />` zamontowany w App.tsx, używany we wszystkich modułach
- [x] **10.5** Keyboard shortcuts — `Ctrl+K` / `Cmd+K` globalna wyszukiwarka (hook `useKeyboardShortcut`)
- [x] **10.6** Dark mode — CSS `@theme` override z `.dark`, `useDarkMode()` hook + przełącznik w sidebar, localStorage persistence
- [x] **10.7** Responsywność — collapsible sidebar (mobilny overlay + hamburger menu w TopBar, `lg:` breakpoint)

---

## Faza 11 — Rozbudowa funkcjonalna

Cel: rozszerzenie istniejących modułów o nowe pola danych i UX bez migracji schematu Dexie (nowe pola są addytywne w `data: JSONB`, backward-compatible).

### 11.1 — Zegary: opisy tyknięć + status Aktywny/Martwy

- [x] **11.1a** `ClockData` (types.ts) — dodaj `tickLabels?: string[]` + `isActive?: boolean`
- [x] **11.1b** `clockSchema` (validation.ts) — `tickLabels` + `isActive` z wartościami domyślnymi
- [x] **11.1c** `ClockForm.tsx` — dynamiczna lista inputów `tickLabels` (react-hook-form `useFieldArray`); toggle `isActive` (switch)
- [x] **11.1d** `ClockDetail.tsx` — ponumerowana lista tickLabels z kolorowaniem wypełnionych; przycisk "Oznacz jako martwy / Reaktywuj"
- [x] **11.1e** `ClockCard.tsx` — szary badge "Martwy" + `opacity-60` gdy `isActive === false`
- [x] **11.1f** `ClockWidget.tsx` — wyszarzony + brak `onTick` gdy `isActive === false`
- [x] **11.1g** `ClockList.tsx` — filtr "Aktywne": `filled < segments AND isActive !== false`
- [x] **11.1h** `useDashboard.ts` — `runningClocks` dodaje warunek `isActive !== false`
- [x] **11.1i** `FrontDetail.tsx ThreatDetailPanel.handleUpdate` — tworzenie zegara przy edycji istniejącego zagrożenia gdy zegar jeszcze nie istnieje (wcześniej działało tylko przy tworzeniu nowego zagrożenia)
- [x] **11.1j** `ThreatCard.tsx` — pasek postępu zegara: prostokąt podzielony na segmenty `[ | | | ]` pod treścią karty, pełna szerokość, kolorowany proporcjonalnie do wypełnienia

### 11.2 — Fronty: pole "Cel" (nadrzędny cel frontu)

- [x] **11.2a** `FrontData` (types.ts) — dodaj `goal: string`
- [x] **11.2b** `frontSchema` (validation.ts) — `goal: z.string().max(2000).default('')`
- [x] **11.2c** `FrontForm.tsx` — textarea `goal` ("Cel frontu") przed sekcją Stakes
- [x] **11.2d** `FrontDetail.tsx` — wyświetl `data.goal` w wyróżnionym bloku na górze (przed stakes)
- [x] **11.2e** `FrontCard.tsx` — `data.goal` jako tekst podglądu na karcie

### 11.3 — Zagrożenia: opcjonalne powiązanie zegara

- [x] **11.3a** `ThreatForm.tsx` — collapsible sekcja "Powiązany zegar" (domyślnie zwinięta); pola: `clockName` + `clockSegments`; `ThreatFormValues` +`clock?: { name; segments } | null`
- [x] **11.3b** `FrontDetail.tsx handleAddThreat` — jeśli `values.clock` → `addEntity(clock)` + `addRelation` z typem `tracks`
- [x] **11.3c** `ThreatDetailPanel` — `useLiveQuery` do pobrania powiązanego zegara (`tracks`); `ClockWidget` display; cascade-delete zegara przy usunięciu zagrożenia

### 11.4 — NPC: pole "Sposób odgrywania"

- [x] **11.4a** `NpcData` (types.ts) — dodaj `playStyle: string`
- [x] **11.4b** `npcSchema` (validation.ts) — `playStyle: z.string().max(1000).default('')`
- [x] **11.4c** `NpcForm.tsx` — textarea `playStyle` ("Sposób odgrywania") po polu `appearance`
- [x] **11.4d** `NpcDetail.tsx` — wyświetl + zapisuj `data.playStyle`

### 11.5 — Frakcje: powiązanie z lokacjami (siedziby)

- [x] **11.5a** `relationRules.ts` — `belongs_to.sourceTypes`: zmień na `['threat', 'npc', 'location']`
- [x] **11.5b** `FactionDetail.tsx` — `useFactionLocations` hook; sekcja "Siedziby (lokacje)" ze zwykłymi linkami do `/locations/:id`
- [x] **11.5c** `RelationPicker` w `LocationDetail` automatycznie oferuje `belongs_to → faction` po zmianie reguł (brak dodatkowych zmian)

### 11.6 — Postacie: flaga PC + przemianowanie UI

- [x] **11.6a** `NpcData` (types.ts) — dodaj `isPC?: boolean` + `playerName?: string`
- [x] **11.6b** `npcSchema` (validation.ts) — `isPC` + `playerName` z wartościami domyślnymi
- [x] **11.6c** `NpcForm.tsx` — toggle „Postacć gracza” + pole `playerName` (widoczne gdy isPC)
- [x] **11.6d** `NpcList.tsx` — zakładki/filtr Wszyscy / Gracze / Postacie niezależne
- [x] **11.6e** `NpcCard.tsx` — badge „Gracz” gdy isPC, pokazuj playerName
- [x] **11.6f** Etykiety UI — `Sidebar.tsx`: „Postacie”; `TopBar.tsx`: „Postacie”; `EntityCard`/`RelationPicker`/`RecentChanges`: `npc` → `'Postać'`; `SessionDetail` sekcja: „Postacie”; `FactionDetail`: „Członkowie (Postacie)”; `OnboardingDialog`; `SessionLive` quick-add opcje: „Postać niezależna” / „Postać gracza”

### 11.7 — Spotlight Tracker

- [x] **11.7a** `SpotlightTracker.tsx` — timer per gracz (encje `isPC === true`) + timer MG; czysty React state (nie persystowany)
- [x] **11.7b** Dwukolumnowy layout Drużyna/MG ↔ Split Party z inline toggle; w trybie Split: karty per gracz, kolumna MG wyszarzona/ukryta
- [x] **11.7c** Kolory timera: zielony (0–5 min) → żółty (5–10) → pomarańczowy (10–15) → czerwony (>15); progi konfigurowalne w komponencie
- [x] **11.7d** Kliknięcie tokenu gracza = reset jego timera („dostał spotlight”)
- [x] **11.7e** Integracja w `SessionLive` sidebar — nowy panel nad Quick-add

### 11.8 — SessionLive: panel zagrożeń + opisy ticków

- [x] **11.8a** `TickProgress.tsx` (shared) — reużywalny komponent: przyjmuje `tickLabels`/`filled`/`segments`, renderuje aktualny tick (bold) + następny (muted/italic)
- [x] **11.8b** `ActiveThreatsPanel.tsx` — zastępuje `ActiveClocksPanel`: zagrożenia z relacją `tracks` → zagnieżdżony zegar + `TickProgress`; sekcja "Pozostałe zegary" dla zegarów bez zagrożenia
- [x] **11.8c** `ThreatCard.tsx` — pod paskiem postępu: aktualny + następny opis ticka z `TickProgress`
- [x] **11.8d** `ThreatDetailPanel` (FrontDetail) — pełna lista tickLabels z `TickProgress` dla aktualnego/następnego
- [x] **11.8e** Integracja `SessionLive` — zamiana `ActiveClocksPanel` na `ActiveThreatsPanel`

---

## Faza 12 — Moduł Wskazówki (Clues)

Cel: system Three Clue Rule — wskazówki powiązane z zagrożeniami i frontami, śledzone na sesji na żywo.

- [x] **12.1** Typy — `ClueData` (`clueType: 'character'|'location'|'event'`, `hint: string`, `discovered: boolean`); nowy `EntityType: 'clue'`
- [x] **12.2** Relacja `clues_for` — nowy `RelationType` + `relationRules` (`clue → threat|front`) + etykiety w `EntityCard`/`RelationPicker`
- [x] **12.3** `clueSchema` (validation.ts) + aktualizacja map etykiet i linków w `SearchResultsPage`, `RecentChanges`, `GraphView`
- [x] **12.4** `useClues()` + `useClueById(id)` + `useCluesFor(parentId)` — hooki
- [x] **12.5** `ClueForm.tsx` — `clueType` (select: Postać/Lokacja/Zdarzenie), `hint` (textarea), `discovered` (checkbox), opcjonalny picker encji NPC/Lokacja (`related_to`)
- [x] **12.6** `ClueCard.tsx` — ikona per typ (User/MapPin/Zap), styl odkryta/nieodkryta, link do powiązanej encji
- [x] **12.7** `ClueList.tsx` — filtry: wszystkie / odkryte / nieodkryte / per typ
- [x] **12.8** `ClueDetail.tsx` — widok szczegółowy + przycisk "Oznacz jako odkrytą / Ukryj"
- [x] **12.9** `ClueSection.tsx` (shared) — reużywalny panel: lista wskazówek + quick-add z kontekstu rodzica; cascade-delete wskazówek przy usunięciu rodzica
- [x] **12.10** Integracja `ThreatDetailPanel` (FrontDetail) — sekcja "Wskazówki" z `ClueSection`
- [x] **12.11** Integracja `FrontDetail` — sekcja "Wskazówki frontu" z `ClueSection`
- [x] **12.12** Sidebar + routing — wpis "Wskazówki" (ikona Search/Compass), lazy routes `/clues` + `/clues/:id`
- [x] **12.13** `SessionLive` `ActiveThreatsPanel` — wskazówki zagrożenia z inline checkboxem odkrycia
- [x] **12.14** Testy — CRUD wskazówek, relacja `clues_for`, toggle `discovered`

---

## Faza 13 — Moduł Wątki (Plot Threads)

Cel: wątki fabularne łączące sesje w ciągi narracyjne — podstawa dla widoku Timeline.

- [x] **13.1** Typy — `ThreadData` (`color: string`, `status: 'active'|'completed'`); nowy `EntityType: 'thread'`
- [x] **13.2** Relacja `appears_in` — rozszerz `sourceTypes` o `'thread'`; aktualizacja wszystkich map etykiet (`EntityCard`, `RelationPicker`, `RelationList`, `RecentChanges`, `SearchResultsPage`, `GraphControls`, `GraphView`)
- [x] **13.3** `threadSchema` (validation.ts) + paleta 8 kolorów presetowych w `types.ts`
- [x] **13.4** `useThreads()` + `useThreadById(id)` + `useThreadSessions(threadId)` — hooki
- [x] **13.5** `ThreadForm.tsx` — name, color (paleta presetów), status toggle, description, tags
- [x] **13.6** `ThreadCard.tsx` — kolorowy lewy border (`borderLeftColor: data.color`), badge statusu Aktywny/Zakończony
- [x] **13.7** `ThreadList.tsx` — filtry: wszystkie / aktywne / zakończone
- [x] **13.8** `ThreadDetail.tsx` — widok szczegółowy + lista sesji (relacje `appears_in`) + RelationList + RelationPicker + MarkdownExportButton
- [x] **13.9** Sidebar + routing — wpis "Wątki" (ikona `Milestone`), lazy routes `/threads` + `/threads/:id`; `TopBar` ROUTE_LABELS
- [x] **13.10** Testy — CRUD wątku, relacja `appears_in → session`, filtr statusu

---

## Faza 14 — Timeline (oś czasu)

Cel: widok Gantt łączący sesje i wątki fabularne w czytelną wizualizację narracji kampanii.

- [x] **14.1** `useTimeline()` — hook: sesje posortowane po `data.number` + mapa `threadId → Set<sessionId>` z relacji `appears_in`
- [x] **14.2** `TimelinePage.tsx` — widok Gantt: sesje jako kolumny (X), wątki jako wiersze z kolorowymi pasami (Y); klik nagłówka sesji → `/sessions/:id`; klik nazwy wątku → `/threads/:id`; wiersz "Sesje bez wątków" na dole jeśli istnieją; pure CSS grid, brak zewnętrznych bibliotek
- [x] **14.3** Sidebar + routing — wpis "Oś czasu" (ikona `CalendarDays`), route `/timeline`; `TopBar` ROUTE_LABELS
- [x] **14.4** Testy — `useTimeline` zwraca posortowane sesje i poprawnie mapuje wątki do sesji

---

## Faza 15 — SessionLive Command Center + SessionDetail + CI

Cel: ekran sesji na żywo jako pełne centrum dowodzenia GM-a; rozbudowany SessionDetail; automatyczne CI.

- [x] **15.1** Relacja `derives_from` — nowy `RelationType` (thread → thread); rules w `relationRules.ts`; labels w `RelationPicker`, `RelationList`, `GraphControls`
- [x] **15.2** `CollapsiblePanel.tsx` — shared komponent z persistencją stanu w localStorage; `id`, `title`, `icon`, `defaultOpen`, `badge`
- [x] **15.3** `LocationTreePanel.tsx` — rekurencyjne drzewo lokacji sesji; inline dodawanie podlokacji; klik → ustawia bieżącą lokację; `appears_in` + `contains`
- [x] **15.4** `NpcContextPanel.tsx` — dwie sekcje: "W lokacji" (via `contains`) + "W sesji" (via `appears_in`); przycisk `+` dodaje NPC z lokacji do sesji
- [x] **15.5** `ThreadTreePanel.tsx` — drzewo wątków sesji z hierarchią `derives_from`; inline dodawanie wątków pochodnych; link do `/threads/:id`
- [x] **15.6** Przebudowa `SessionLive.tsx` — sidebar jako `CollapsiblePanel` stack: Spotlight / Lokacje / Szybkie dodawanie / Postacie / Wątki / Zagrożenia; `QuickAddPanel` auto-linkuje NPC/item do bieżącej lokacji przez `contains`
- [x] **15.7** Rozbudowa `SessionDetail.tsx` — nowe kolumny: Wątki (z kolorowymi kropkami), Wskazówki; Items linkowane do `/items/:id`; 5-kolumnowy grid
- [x] **15.8** CI — `.github/workflows/ci.yml`: typecheck + lint + test + build na push/PR

---

## Faza 16 — Wielokampanijność

Cel: izolowane bazy danych per kampania — każda kampania to osobna instancja Dexie (`mg-helper-{id}`); pełne CRUD kampanii; przełącznik w UI; migracja istniejących danych.

### Architektura

Każda kampania przechowuje metadane (`id`, `name`, `description`, `createdAt`) w `localStorage` pod kluczem `mg-campaigns`. Aktywna kampania zapisana w `localStorage[mg-active-campaign]`. Baza Dexie otwierana dynamicznie jako `mg-helper-{campaignId}`. Wszystkie hooki pobierają `db` z kontekstu React zamiast importować singleton — to jedyna większa zmiana przekrojowa.

### 16.1 — Typy i metadane kampanii

- [x] **16.1a** `shared/types/campaign.ts` — interfejs `CampaignMeta { id: string; name: string; description: string; createdAt: string }`
- [x] **16.1b** `shared/db/campaignStore.ts` — helpery operujące na `localStorage`:
  - `listCampaigns(): CampaignMeta[]` — odczyt i parsowanie; zwraca `[]` gdy brak
  - `saveCampaign(meta: CampaignMeta): void` — upsert po `id`
  - `deleteCampaignMeta(id: string): void` — usuwa wpis z listy (nie usuwa Dexie DB)
  - `getActiveCampaignId(): string | null`
  - `setActiveCampaignId(id: string): void`

### 16.2 — Fabryka bazy danych

- [x] **16.2a** `database.ts` — dodaj funkcję `openCampaignDb(campaignId: string): MgHelperDb`, która otwiera Dexie pod nazwą `mg-helper-${campaignId}` z identycznym schema jak obecna baza
- [x] **16.2b** `database.ts` — dodaj `deleteCampaignDb(campaignId: string): Promise<void>` wywołujące `Dexie.delete('mg-helper-${campaignId}')` — używane przy usuwaniu kampanii
- [x] **16.2c** Obecny singleton `db` (eksportowany z `database.ts`) zostaje jako kompatybilność wsteczna tylko na czas refaktoru (Fazy 16.3–16.5); docelowo usunięty

### 16.3 — CampaignContext

- [x] **16.3a** `shared/db/CampaignContext.tsx` — `React.createContext` z typem `{ db: MgHelperDb; campaignId: string; campaignName: string; setActiveCampaign(id: string): void }`
- [x] **16.3b** `CampaignProvider` (w tym samym pliku) — inicjalizuje `db = openCampaignDb(activeCampaignId)` przy starcie i przy każdej zmianie `activeCampaignId`; zapisuje nowe `activeCampaignId` do localStorage; eksportuje hook `useCampaign()`
- [x] **16.3c** `App.tsx` — opakuj `<AppShell>` w `<CampaignProvider>`; provider musi być wewnątrz `<RouterProvider>` (potrzebny dostęp do nawigacji w guardzie)

### 16.4 — Refaktor operacji DB

- [x] **16.4a** `shared/db/operations.ts` — wszystkie funkcje (`addEntity`, `updateEntity`, `deleteEntity`, `addRelation`, `deleteRelation`, `getEntityById`, `getRelationsFor`) przyjmują `db: MgHelperDb` jako **pierwszy parametr**
- [x] **16.4b** Eksportuj aliasy bez parametru `db` (wrappers korzystające z `legacyDb`) aby nie łamać wszystkiego naraz — zostaną usunięte po zakończeniu refaktoru hooków (16.5)

### 16.5 — Refaktor hooków shared

We wszystkich hookach: zamień `import { db } from '@shared/db/database'` na `const { db } = useCampaign()`.

- [x] **16.5a** `useEntityById.ts`, `useEntitiesByType.ts`, `useRelations.ts`, `useContained.ts`, `useAncestors.ts`, `useSearch.ts`, `useTags.ts`
- [x] **16.5b** Hooki modułowe: `useClocks`, `useClockById`, `useNpcs`, `useNpcById`, `useLocations`, `useLocationById`, `useFronts`, `useFrontById`, `useThreats`, `useThreatById`, `useSessions`, `useSessionById`, `useFactions`, `useFactionById`, `useItems`, `useItemById`, `useClues`, `useClueById`, `useCluesFor`, `useThreads`, `useThreadById`, `useThreadSessions`, `useTimeline`
- [x] **16.5c** `useDashboard.ts` — analogicznie
- [x] **16.5d** Usunięcie wrapperów z 16.4b po zakończeniu 16.5a–c; usunięcie eksportu singletona `db` z `database.ts`

### 16.6 — Refaktor komponentów używających `db` bezpośrednio

Komponenty używające `useLiveQuery` lub `db` bezpośrednio (nie przez hooki) — zamiana na `useCampaign().db`.

- [x] **16.6a** `SessionDetail.tsx` (`useSessionAppearances`), `NpcContextPanel.tsx`, `LocationTreePanel.tsx`, `ThreadTreePanel.tsx`
- [x] **16.6b** `ActiveThreatsPanel.tsx`, `ClueSection.tsx` — jeśli używają `db` bezpośrednio
- [x] **16.6c** Moduły `data-io/`: `exportJson.ts`, `importJson.ts` — eksport/import przyjmuje `db` jako parametr (nie importuje singletona)

### 16.7 — UI: lista kampanii

- [x] **16.7a** `modules/campaigns/components/CampaignCard.tsx` — karta kampanii: nazwa, data, opis (skrót); przyciski: **Otwórz**, **Zmień nazwę**, **Usuń**; usunięcie: `ConfirmDialog` + `deleteCampaignDb` + `deleteCampaignMeta`
- [x] **16.7b** `modules/campaigns/components/CampaignForm.tsx` — dialog (modal) tworzenia/edycji: pole `name` (wymagane, max 100 zn.), pole `description` (opcjonalne); walidacja Zod; przy tworzeniu: `nanoid()` jako `id`, `saveCampaign()`, `openCampaignDb(id)`, `setActiveCampaign(id)`
- [x] **16.7c** `modules/campaigns/components/CampaignList.tsx` — strona `/campaigns`: siatka kart `CampaignCard`; przycisk „+ Nowa kampania" otwierający `CampaignForm`; gdy lista pusta — `EmptyState` z CTA
- [x] **16.7d** `modules/campaigns/index.ts` — eksporty modułu

### 16.8 — UI: przełącznik kampanii

- [x] **16.8a** `modules/campaigns/components/CampaignSwitcher.tsx` — dropdown w `TopBar` (obok breadcrumbs): wyświetla nazwę aktywnej kampanii + ikona `ChevronDown`; lista pozostałych kampanii + separator + pozycja „Zarządzaj kampaniami" → `/campaigns`; kliknięcie kampanii wywołuje `setActiveCampaign(id)` i nawiguje do `/`
- [x] **16.8b** `TopBar.tsx` — dodaj `<CampaignSwitcher />` po lewej stronie, przed breadcrumbs

### 16.9 — Guard routingu

- [x] **16.9a** `app/router.tsx` — route `/campaigns` (lazy `CampaignList`); dodaj `<RequireCampaign>` wrapper wokół wszystkich pozostałych routes
- [x] **16.9b** `app/RequireCampaign.tsx` — sprawdza `getActiveCampaignId()`; jeśli `null` lub kampania nie istnieje na liście → `<Navigate to="/campaigns" replace />`; w przeciwnym razie renderuje `children`

### 16.10 — Migracja istniejących danych

- [x] **16.10a** `shared/db/migrateLegacyDb.ts` — funkcja `migrateLegacyDb(): Promise<boolean>`: sprawdza czy baza `mg-helper` (bez suffixu) istnieje przez `Dexie.exists('mg-helper')` i czy lista kampanii w localStorage jest pusta; jeśli tak — tworzy `CampaignMeta { id: 'legacy', name: 'Moja kampania', ... }` i zapisuje do localStorage; `openCampaignDb('legacy')` musi otworzyć TĘ SAMĄ bazę (przez jawne przekazanie nazwy `'mg-helper'` jako opcji Dexie zamiast `mg-helper-legacy`); nie kopiuje danych
- [x] **16.10b** `CampaignProvider` — wywołaj `migrateLegacyDb()` jednorazowo przed inicjalizacją kontekstu; jeśli migracja się wykonała, pokaż `toast.info('Dane przeniesione do kampanii „Moja kampania"')`

### 16.11 — Testy

- [x] **16.11a** Testy `campaignStore.ts` — `listCampaigns` / `saveCampaign` / `deleteCampaignMeta` / `setActiveCampaignId` operują na prawidłowych kluczach localStorage; fake localStorage w `tests/setup.ts`
- [x] **16.11b** Test izolacji danych — dodanie encji w kampanii A nie jest widoczne przez `useEntitiesByType` w kampanii B (dwie osobne instancje `openCampaignDb` w jednym teście)
- [x] **16.11c** Test migracji — `migrateLegacyDb` tworzy wpis kampanii gdy `mg-campaigns` jest puste i baza `mg-helper` istnieje

---

## Faza F.3 — Drag & Drop

Cel: intuicyjne przenoszenie encji przeciąganiem — NPC między lokacjami, sortowanie list sesji i wątków, szybkie dodawanie do aktywnej sesji przez upuszczenie. Wszystkie zmiany stanu persystowane w Dexie; brak zewnętrznego store'a.

**Wymagana instalacja:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — pakiety nieobecne w `package.json`.

**Zasada `sortOrder`:** nowe pole `data.sortOrder?: number` — addytywne w `data: JSONB`, backward-compatible, brak migracji Dexie. Encje bez `sortOrder` trafiają na koniec listy (fallback `Infinity`).

### F.3.1 — Instalacja i infrastruktura

- [x] **F.3.1a** `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` — dodaj do `dependencies`
- [x] **F.3.1b** `shared/utils/dnd.ts` — re-export `arrayMove` z `@dnd-kit/sortable` jako `reorderIds`; helper `reorderEntities<T extends { id: string }>(items: T[], activeId: string, overId: string): T[]` (pure, bez mutacji)
- [x] **F.3.1c** `shared/db/operations.ts` — `updateSortOrders(db, ids: string[]): Promise<void>` — zapisuje `data.sortOrder = index` dla każdego id w pojedynczej transakcji `db.transaction('rw', db.entities, ...)`
- [x] **F.3.1d** `shared/components/DragHandle.tsx` — mały komponent `<GripVertical>` (Lucide) z `cursor-grab active:cursor-grabbing`; przyjmuje `...listeners` i `...attributes` z `useSortable`

### F.3.2 — Sortowanie listy sesji

- [x] **F.3.2a** `useSessions()` — zmień sortowanie na `data.sortOrder ?? Infinity` jako klucz pierwotny, `data.number` (desc) jako fallback
- [x] **F.3.2b** `SortableSessionCard.tsx` — wrapper `SessionCard` używający `useSortable({ id })`; `DragHandle` widoczny na hover; `transform: CSS.Transform.toString(transform)` + `transition` z `@dnd-kit/utilities`
- [x] **F.3.2c** `SessionList.tsx` — opakowanie listy w `<DndContext collisionDetection={closestCenter} onDragEnd>` + `<SortableContext items strategy={verticalListSortingStrategy}>`; `onDragEnd`: `reorderEntities` → `updateSortOrders` → `toast('Kolejność zaktualizowana')`
- [x] **F.3.2d** `SessionList.tsx` — `<DragOverlay>`: semi-transparent (`opacity-80 shadow-xl`) kopia przeciąganej karty wyrenderowana poza przepływem dokumentu

### F.3.3 — Sortowanie listy wątków

- [x] **F.3.3a** `useThreads()` — sortowanie po `data.sortOrder ?? Infinity`, fallback na `name` (asc)
- [x] **F.3.3b** `SortableThreadCard.tsx` — analogicznie do `SortableSessionCard`; `DragHandle` w prawym górnym rogu karty
- [x] **F.3.3c** `ThreadList.tsx` — identyczne opakowanie `DndContext` / `SortableContext` / `DragOverlay` jak w `SessionList`; persist przez `updateSortOrders`

### F.3.4 — Drag NPC między lokacjami

- [x] **F.3.4a** `DraggableNpcChip.tsx` (shared) — `useDraggable({ id: npcId, data: { type: 'npc', npcId, fromLocationId } })`; chip z avatarem i imieniem; `cursor-grab`; gdy `isDragging` — `opacity-50` na oryginale
- [x] **F.3.4b** `DroppableLocationZone.tsx` (shared) — `useDroppable({ id: locationId, data: { locationId } })`; dzieci owijane divem; `ring-2 ring-primary-400 bg-primary-50 dark:bg-primary-900/20` gdy `isOver` i `canDrop` (canDrop = `fromLocationId !== locationId`)
- [x] **F.3.4c** `LocationDetail.tsx` — sekcja „Postacie w lokacji" przemianowana na `DraggableNpcChip`; cała sekcja owinięta `<DroppableLocationZone locationId>`; `onDragEnd` w `<DndContext>`: usuń `contains(fromLocation → npc)` przez `deleteRelation`, dodaj `contains(toLocation → npc)` przez `addRelation`; toast `'${npcName} przeniesiony do ${locationName}'`
- [x] **F.3.4d** `LocationTreePanel.tsx` (SessionLive) — każdy węzeł lokacji owinięty `<DroppableLocationZone>`; drag NPC z `NpcContextPanel` (sekcja „W lokacji") do innego węzła → `contains` swap + `setCurrentLocationId(targetId)` jeśli to aktywna lokacja

### F.3.5 — Drop NPC do aktywnej sesji (SessionLive)

- [x] **F.3.5a** `DroppableSessionZone.tsx` (shared) — `useDroppable({ id: sessionId, data: { sessionId } })`; akceptuje `data.type === 'npc' | 'item'`; ring `ring-2 ring-green-400` gdy `isOver`
- [x] **F.3.5b** `NpcContextPanel.tsx` — NPCe w sekcji „W lokacji" renderowane jako `<DraggableNpcChip>` z `data: { type: 'npc', npcId: id, fromLocationId }`
- [x] **F.3.5c** `SessionLive.tsx` — środkowy panel (obszar notatek) owinięty `<DroppableSessionZone sessionId>`; `onDragEnd`: sprawdź czy `appears_in(npc → session)` już istnieje (`getRelationsFor`); jeśli nie — `addRelation`; toast `'${name} dodany do sesji'`
- [x] **F.3.5d** `SessionLive.tsx` — `<DndContext>` owijający cały widok (sidebar + środek) z `onDragStart` ustawiającym aktywny element w lokalnym state dla `DragOverlay`

### F.3.6 — Testy

- [x] **F.3.6a** Test `reorderEntities` — poprawna kolejność po reorder; brak mutacji tablicy wejściowej; edge cases (activeId = overId, element nieistniejący)
- [x] **F.3.6b** Test `updateSortOrders` — każda encja ma zapisane `data.sortOrder` zgodne z pozycją w tablicy `ids`; operacja atomowa (rollback przy błędzie)
- [x] **F.3.6c** Test integracyjny drag NPC między lokacjami — relacja `contains(loc1 → npc)` usunięta, `contains(loc2 → npc)` utworzona; brak duplikatów relacji
- [x] **F.3.6d** Test idempotentności drop do sesji — wielokrotny drop tego samego NPC do sesji tworzy dokładnie jedną relację `appears_in`

---

## Faza 17 — Stabilizacja i UX Audit

Cel: dopracowanie projektu przed fazą funkcjonalną — empty states, obsługa błędów, dostępność, wydajność.

- [x] **17.1** Audyt `EmptyState` — każda lista (`NpcList`, `LocationList`, `SessionList`, `ClueList`, itd.) ma dedykowany komunikat z CTA; brak pustych białych ekranów
- [x] **17.2** `ErrorBoundary` per route — osobne boundary dla każdego modułu (nie tylko globalne); fallback z nazwą modułu i przyciskiem "Odśwież"
- [x] **17.3** Toast coverage — każda operacja CRUD (create/update/delete) w każdym module kończy się toastem; audyt brakujących wywołań
- [x] **17.4** Focus management — po zamknięciu `ConfirmDialog` i `RelationPicker` focus wraca do triggera; formularze inline (quick-add) focusują pierwszy input po otwarciu
- [x] **17.5** Responsywność SessionLive — sidebar zwijany na `md:` breakpoint (hamburger); główna kolumna notatek pełnoekranowa na mobile
- [x] **17.6** Bundle size audit — `pnpm build` + analiza `dist/`; target <500 KB gzipped; lazy loading weryfikacja code splitting

---

## Faza 18 — Żetonowe Notatki Sesji

Cel: błyskawiczne notatki kontekstowe tworzone w trakcie sesji na żywo — automatycznie powiązane z aktywną lokacją, postaciami i wątkami; widoczne jako historia w każdej encji.

**Nowy `EntityType: 'note'`, nowy `RelationType: 'related_to'`** — addytywne, bez migracji Dexie.

### 18.1 — Typy i schemat

- [x] **18.1a** `modules/notes/types.ts` — `NoteData { content: string; sessionId: string; createdAt: string }`; eksport `Note extends Entity`
- [x] **18.1b** `shared/utils/validation.ts` — `noteSchema`: `content: z.string().min(1).max(500)`, `sessionId: z.string()`, `createdAt: z.string()`
- [x] **18.1c** `shared/types/relation.ts` — dodaj `'related_to'` do `RelationType`
- [x] **18.1d** `shared/db/relationRules.ts` — `related_to`: `sourceTypes: ['note']`, `targetTypes: ['npc', 'location', 'thread', 'item', 'front', 'threat', 'faction', 'clue', 'session']`
- [x] **18.1e** Aktualizacja map etykiet — `EntityCard`, `RelationPicker`, `RelationList`, `RecentChanges`, `SearchResultsPage`, `GraphControls`, `GraphView`: dodaj `'note'` i `'related_to'`

### 18.2 — Hooki

- [x] **18.2a** `modules/notes/hooks/useNotes.ts` — `useNotes()`: wszystkie notatki posortowane po `data.createdAt` desc
- [x] **18.2b** `modules/notes/hooks/useNotesBySession.ts` — `useNotesBySession(sessionId)`: notatki przez `data.sessionId`
- [x] **18.2c** `modules/notes/hooks/useNotesFor.ts` — `useNotesFor(entityId)`: notatki powiązane z encją przez `related_to` (query na relacjach)

### 18.3 — QuickNotePanel (SessionLive)

- [x] **18.3a** `modules/notes/components/QuickNotePanel.tsx` — textarea (max 500 zn.) + przycisk "Dodaj notatkę"; odczytuje aktywny kontekst z propsów: `sessionId`, `currentLocationId`, `activeNpcIds`, `activeThreadIds`
- [x] **18.3b** Chipy kontekstu — nad textareą wiersz chipów "📍 Karczma · 👤 Aldric · 🧵 Spisek"; każdy chip ma `×` do odznaczenia przed zapisem; kontekst przekazywany z `SessionLive`
- [x] **18.3c** Zapis — `addEntity(note)` z `data.sessionId` + `data.createdAt = new Date().toISOString()` + `addRelation(appears_in → session)` + `addRelation(related_to → X)` dla każdego aktywnego kontekstu; toast `'Notatka dodana (N powiązań)'`
- [x] **18.3d** Live preview — ostatnie 5 notatek z bieżącej sesji pod formularzem; chronologicznie, z chipami powiązań

### 18.4 — Integracja SessionLive

- [x] **18.4a** `SessionLive.tsx` — nowy `CollapsiblePanel` "Notatki" z `QuickNotePanel`; panel umieszczony między "Szybkie dodawanie" a "Postacie"; przekazuje `currentLocationId`, zaznaczone NPC z `NpcContextPanel`, aktywne wątki z `ThreadTreePanel`
- [x] **18.4b** `NpcContextPanel.tsx` — eksponuje `selectedNpcIds: string[]` przez callback prop `onSelectionChange`; checkboxy przy NPC w sekcji "W sesji"
- [x] **18.4c** `ThreadTreePanel.tsx` — eksponuje `selectedThreadIds: string[]` analogicznie

### 18.5 — NotesList (shared) + integracja w widokach encji

- [x] **18.5a** `modules/notes/components/NotesList.tsx` — lista notatek z `useNotesFor(entityId)`; każda nota: treść + data + badge numeru sesji (link do `/sessions/:id`); sortowanie po `createdAt` desc; `EmptyState` gdy brak
- [x] **18.5b** Integracja w `NpcDetail.tsx` — sekcja "Historia notatek" z `NotesList`; collapsible (domyślnie otwarta gdy >0 notatek)
- [x] **18.5c** Integracja w `LocationDetail.tsx` — analogicznie
- [x] **18.5d** Integracja w `ThreadDetail.tsx` — analogicznie
- [x] **18.5e** Integracja w `FrontDetail.tsx`, `FactionDetail.tsx`, `ItemDetail.tsx` — analogicznie

### 18.6 — SessionDetail: agregacja notatek

- [x] **18.6a** `SessionDetail.tsx` — nowa sekcja "Notatki z sesji" z `useNotesBySession(sessionId)`; chronologiczna lista + chipy powiązanych encji jako linki; sekcja po istniejących kolumnach

### 18.7 — Pełny widok modułu

- [x] **18.7a** `modules/notes/components/NoteCard.tsx` — karta: treść (max 2 wiersze), data, badge sesji, chipy powiązań; link do `/notes/:id`
- [x] **18.7b** `modules/notes/components/NoteList.tsx` — strona `/notes`: wszystkie notatki z filtrem per sesja (select) i per typ encji (checkboxy); `EmptyState`
- [x] **18.7c** `modules/notes/components/NoteDetail.tsx` — widok szczegółowy: pełna treść + edycja inline (textarea) + lista powiązań z `RelationList` + przycisk `RelationPicker` + `MarkdownExportButton`
- [x] **18.7d** Sidebar + routing — wpis "Notatki" (ikona `StickyNote`), lazy routes `/notes` + `/notes/:id`; `TopBar` ROUTE_LABELS; `modules/notes/index.ts`

### 18.8 — Testy

- [x] **18.8a** CRUD notatki — tworzenie, edycja treści, usuwanie (cascade-delete relacji)
- [x] **18.8b** Automatyczne powiązania — nota tworzona z kontekstem `{locationId, npcIds, threadIds}` ma poprawne relacje `appears_in` + `related_to` dla każdego
- [x] **18.8c** `useNotesFor(entityId)` — zwraca tylko noty powiązane z daną encją przez `related_to`
- [x] **18.8d** `useNotesBySession(sessionId)` — zwraca tylko noty z `data.sessionId === sessionId`

---

## Faza 19 — Session Report & Print

Cel: czytelny raport po sesji — agregacja wszystkich wydarzeń, notatek, zmian w jednym widoku gotowym do wydruku lub eksportu do Markdown.

- [x] **19.1** `SessionReport.tsx` — widok `/sessions/:id/report`; agreguje: postacie (z `appears_in`), lokacje, wątki, wskazówki odkryte, zegary stickowane, notatki z sesji (chronologicznie); czytelny layout A4-like (max-width 800px, białe tło niezależnie od dark mode)
- [x] **19.2** Print CSS — `@media print` w `index.css`: ukrycie sidebar/topbar/przycisków, marginesy, page-break przed sekcjami; przycisk "Drukuj" (`window.print()`) w `SessionReport`
- [x] **19.3** `exportSessionMarkdown(sessionId)` w `data-io/` — eksport raportu sesji jako `.md`: nagłówki sekcji, listy wypunktowane, treść notatek; przycisk "Eksportuj .md" w `SessionReport`
- [x] **19.4** Link "Raport" w `SessionDetail.tsx` — przycisk nawigacji do `/sessions/:id/report`
- [x] **19.5** Routing — lazy route `/sessions/:id/report`; `TopBar` ROUTE_LABELS
- [x] **19.6** Testy — `exportSessionMarkdown` zawiera nazwy encji powiązanych z sesją; sekcje raportu obecne gdy dane istnieją

---

## Faza OV — System Overlayów (Modale i Panele)

Cel: reużywalny system "latających okienek" z przyciemnionym tłem — dwa warianty: wycentrowany modal i panel kotwiczony przy elemencie triggera. Bez animacji. Klik obok wyszarzonego tła lub ESC = zamknięcie. Fundament dla formularzy edycji, podglądów szczegółów i selektorów w sesji na żywo.

### OV.A — Komponenty bazowe

- [x] **OV.A.1** `shared/components/Backdrop.tsx` — `fixed inset-0 z-40 bg-black/40`; `onClick` wywołuje `onClose`; renderowane przez portal (`ReactDOM.createPortal` do `document.body`); props: `{ onClose: () => void; zIndex?: number }`
- [x] **OV.A.2** `shared/components/Modal.tsx` — wycentrowany dialog nad Backdrop (`fixed inset-0 z-50 flex items-center justify-center`); `useEffect` na `keydown` Escape → `onClose`; focus trap (pierwszy focusable element); props: `{ title?: string; children: ReactNode; onClose: () => void; size?: 'sm' | 'md' | 'lg' }`; warianty szerokości: sm=`w-80`, md=`w-[480px]`, lg=`w-[640px]`; biały panel z `rounded-xl shadow-2xl border border-surface-200`; opcjonalny nagłówek z separatorem i przyciskiem X
- [x] **OV.A.3** `shared/components/AnchoredPanel.tsx` — panel pozycjonowany relative do ref elementu triggera; oblicza pozycję przez `getBoundingClientRect()` + `placement: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'` (domyślnie `bottom-start`); fallback: jeśli panel wychodzi poza viewport → odwraca kierunek; Backdrop z `bg-black/20` (delikatniejsze); renderuje przez portal; scrolluje do widoku gdy poza viewport; props: `{ anchorRef: RefObject<HTMLElement>; onClose: () => void; children: ReactNode; placement?: Placement }`
- [x] **OV.A.4** Eksport z `shared/components/index.ts` — `Modal`, `AnchoredPanel`, `Backdrop`
- [x] **OV.A.5** Testy — `Modal`: renderuje dzieci, zamyka się na klik Backdrop, zamyka się na ESC, nie zamyka się na klik wewnątrz; `AnchoredPanel`: renderuje w portalu, reaguje na klik poza panelem

### OV.B — Migracja istniejących popoverów (stopniowo)

> Obecne komponenty (`LocationTreePopover`, `AddFromCampaignPanel`, `InlineCreateNpc`) używają własnego `mousedown` + `div absolute`. Migracja na `AnchoredPanel` jest opcjonalna — robić przy okazji edycji danego komponentu.

- [x] **OV.B.1** `LocationBreadcrumb` → `LocationTreePopover` przeniesiony do `AnchoredPanel`
- [x] **OV.B.2** `ScenePillsRow` → `AddFromCampaignPanel` i `InlineCreateNpc` przeniesione do `AnchoredPanel`
- [x] **OV.B.3** `ConfirmDialog.tsx` — zrefaktorowany do `<Modal size="sm">` zamiast własnego fixedowego divа

### OV.C — Pierwsze zastosowania w SessionLive

- [x] **OV.C.1** **Selektor postaci** w sesji na żywo — `<CharacterPickerModal>` (`Modal size="md"`): pełna lista PC/NPC kampanii z wyszukiwarką, checkbox multi-select, przycisk "Dodaj do sesji" → `addRelation(appears_in)`; otwierany z `ScenePillsRow` przyciskiem "Dodaj z kampanii"
- [x] **OV.C.2** **Selektor lokacji** — `<LocationPickerPanel>` (`AnchoredPanel`): drzewo lokacji sesji z wyszukiwarką + "Pusta scena"; zastępuje `LocationTreePopover` w `LocationBreadcrumb`
- [x] **OV.C.3** **Selektor wątku** — `<ThreadPickerPanel>` (`AnchoredPanel`): lista wątków kampanii z wyszukiwarką; klik = `addRelation(appears_in → session)`; otwierany z `ScenePillsRow`

### OV.D — Podglądy szczegółów (preview)

- [x] **OV.D.1** `<NpcPreviewModal>` (`Modal size="md"`) — read-only podgląd NPC: imię, badge, instinct, motivation, appearance, powiązane relacje (lista); otwierany np. z chipu postaci w SpotlightTracker lub z listy NPC
- [x] **OV.D.2** `<LocationPreviewModal>` — lokacja: nazwa, opis, senses, zagnieżdżone lokacje (lista), NPC w lokacji
- [x] **OV.D.3** `<ThreatPreviewModal>` — zagrożenie: nazwa, opis, zegar (ClockWidget readonly), powiązane wskazówki

---

## Faza 20 — Alpha 1.0

Cel: zamknięcie projektu do pierwszej używalnej wersji — zaktualizowany seed, dokumentacja, tag wersji.

- [ ] **20.1** Zaktualizowany `seed.ts` — przykładowa kampania pokrywająca WSZYSTKIE zaimplementowane moduły: 3 PC + 4 NPC, 2 fronty z zagrożeniami i zegarami (w tym `tickLabels`, `isActive: false`), 4 lokacje zagnieżdżone, 2 frakcje z siedzibami, 3 sesje z `sortOrder`, 3 wątki z kolorami, 6 wskazówek (mix odkrytych/nieodkrytych), 5 notatek sesji z powiązaniami, 3 itemy
- [ ] **20.2** `README.md` — opis projektu, screenshot (lub opis UI), instrukcja uruchomienia (`pnpm install`, `pnpm dev`), lista modułów
- [ ] **20.3** `package.json` — `"version": "0.1.0-alpha"`
- [ ] **20.4** Finalny CI pass — `pnpm typecheck && pnpm lint && pnpm test && pnpm build` wszystkie zielone
- [ ] **20.5** Git tag `v0.1.0-alpha` (ręcznie przez użytkownika po weryfikacji)

---

## Prerelease — SessionLive Command Center

Cel: pełny redesign ekranu sesji na żywo — Discord-style timeline, centrum sceny z kartami kontekstowymi, SpotlightTracker z nową logiką timerów, persystencja stanu w sessionStorage/localStorage, tryb Sprzątania. Desktop-only.

### PR.A — Model danych: Session Events

- [x] **PR.A.1** `shared/types/entity.ts` — dodaj `'event'` do `ENTITY_TYPES` i `EntityType`
- [x] **PR.A.2** `modules/sessions/types.ts` — dodaj `SessionEventData { timestamp: string; text: string }` oraz `SessionEvent = Entity & { type: 'event'; data: SessionEventData }`
- [x] **PR.A.3** `shared/utils/validation.ts` — dodaj `sessionEventSchema`: `text: z.string().min(1).max(2000)`, `timestamp: z.string()`
- [x] **PR.A.4** Mapy etykiet — dodaj `'event': 'Zdarzenie'` w: `EntityCard.tsx`, `RelationPicker.tsx`, `RelationList.tsx`, `SearchResultsPage.tsx`, `RecentChanges.tsx`, `GraphView.tsx`, `GraphControls.tsx`

### PR.B — Hook useSessionEvents

- [x] **PR.B.1** `modules/sessions/hooks/useSessionEvents.ts` — `useLiveQuery`: events przez `appears_in → sessionId`, filtr `type === 'event'`, sort rosnący po `data.timestamp`; wzorzec `const { db } = useCampaign()`
- [x] **PR.B.2** Eksport z `modules/sessions/index.ts`

### PR.C — SessionTimeline (`w-64`, lewa kolumna)

- [x] **PR.C.1** `modules/sessions/components/SessionTimeline.tsx` — layout `flex flex-col h-full w-64 shrink-0 border-r`; lista wpisów (`flex-1 overflow-y-auto`): każdy wpis `HH:mm` + tekst, hover → menu Edytuj/Usuń; edycja inline (textarea, Enter=zapis, Escape=anuluj); usuwanie przez `ConfirmDialog` + `deleteEntity(db, id)`
- [x] **PR.C.2** Autoscroll do dołu przy nowym wpisie; **freeze** gdy użytkownik scrolluje do góry (detekcja: `scrollTop + clientHeight < scrollHeight - 8`)
- [x] **PR.C.3** Sticky formularz na dole (`border-t`): `<textarea>` — **Enter = submit**, **Shift+Enter = nowa linia**; submit: `addEntity(db, { type: 'event', name: '', data: { text, timestamp: new Date().toISOString() } })` + `addRelation(db, appears_in → sessionId)`

### PR.D — LocationBreadcrumb + LocationTreePopover

- [x] **PR.D.1** `modules/sessions/components/LocationBreadcrumb.tsx` — wyświetla `📍 [nazwa]` lub `📍 Pusta scena`; klik → otwiera `LocationTreePopover`
- [x] **PR.D.2** `modules/sessions/components/LocationTreePopover.tsx` — floating div (`absolute`, `z-50`); input wyszukiwarki; pierwsza pozycja: "Pusta scena" (null); rekurencyjne drzewo lokacji (`useLocations()`) z wcięciami per poziom hierarchii; klik = `onSelect(id)` + zamknij; wybór lokacji spoza sesji → auto `addRelation(appears_in → session)`

### PR.E — ScenePillsRow

- [x] **PR.E.1** `modules/sessions/components/ScenePillsRow.tsx` — sekcja "Postacie": NPCs z `contains(currentLocation → npc)`; pełny kolor = NPC jest też `appears_in → session`; szary = tylko w lokacji; klik szarego → `addRelation(appears_in)` + aktywuje kartę; klik pełnego → toggle karty; `+ Postać` quick-add inline
- [x] **PR.E.2** Sekcja "Wątki & Zagrożenia": threats `appears_in → session` z powiązanym aktywnym zegarem (pill z `⚠`); threads `appears_in → session` (pill z `data.color`); `+ Wątek` quick-add → `addRelation(appears_in → session)`
- [x] **PR.E.3** Przycisk **`+ Dodaj z kampanii`** (sekcja Postacie) — inline combobox z wyszukiwarką; lista wszystkich NPC/PC z kampanii których jeszcze nie ma `appears_in → session`; klik = `addRelation(appears_in → session)` + otwiera kartę; **nie** dodaje do bieżącej lokacji automatycznie (lokacja przypisywana osobno — np. w trybie Sprzątania)

### PR.F — Karty sceny (max 4, LRU)

**Zasada LRU:** `openCardIds: string[]` — nowa karta na początku; `length > 4` → ostatni element odpada. Persystowane w `sessionStorage['session-live-{sessionId}']`.

- [x] **PR.F.1** `modules/sessions/components/NpcSceneCard.tsx` — `useNpcById`; wyświetla: imię, badge Gracz/NPC, instinct, motivation, `playStyle` (gdy `isPC`); przycisk X; link do `/npcs/:id`
- [x] **PR.F.2** `modules/sessions/components/ThreatSceneCard.tsx` — zagrożenie + zegar (relacja `tracks`); `ClockWidget` (inline tick), `TickProgress`, `ClueSection` z inline toggle odkrycia; przycisk X
- [x] **PR.F.3** `modules/sessions/components/LocationSceneCard.tsx` — `useLocationById`; `data.senses.feel` lub description (max 140 zn.); NPCs w lokacji jako `DraggableNpcChip`; przycisk X

### PR.G — useLiveSessionState + SceneCenter

- [x] **PR.G.1** `modules/sessions/hooks/useLiveSessionState.ts` — klucz `sessionStorage['session-live-{sessionId}']`; persystuje i odczytuje: `currentLocationId: string | null`, `openCardIds: string[]` (LRU max 4), `spotlightState: SpotlightState`; eksponuje settery; zapis przy każdej zmianie
- [x] **PR.G.2** `modules/sessions/components/SceneCenter.tsx` — korzysta z `useLiveSessionState`; struktura (top→down): `LocationBreadcrumb` → `ScenePillsRow` → siatka kart (`flex flex-wrap gap-3`) → `CollapsiblePanel` "Notatki ogólne" (RichTextEditor, autosave) → `CollapsiblePanel` "Szybkie dodawanie" (`QuickAddPanel`); `DroppableSessionZone` wrapping obszaru

### PR.H — SpotlightTracker (pełny rewrite)

**Stan:**
```
type TimerState = { elapsed: number; startedAt: string | null }
// SpotlightState: mgActive, mgTimer (waitTimer MG), players[], isPaused
// SpotlightPlayer: { id, active, waitTimer, totalActiveTimer }
```

**Logika kliknięć:**
- Gracz nieaktywny → aktywuje go, resetuje jego `waitTimer→{elapsed:0,startedAt:now}`, **deaktywuje MG** jeśli `mgActive`
- Gracz aktywny → deaktywuje, startuje jego `waitTimer` od 0
- MG → aktywuje MG, **deaktywuje WSZYSTKICH graczy** (ich `waitTimer` kontynuuje — NIE resetuje)
- `waitTimer` gracza rośnie zawsze gdy `active=false`, nawet gdy MG aktywny
- MG i gracze wzajemnie wykluczają się

- [x] **PR.H.1** `modules/sessions/components/SpotlightTracker.tsx` — pełny rewrite; props: `{ sessionId: string; state: SpotlightState; onChange(s: SpotlightState): void }`; pobiera graczy: `useNpcs()` filtr `isPC === true` + `appears_in → session`; `setInterval(100ms)` gdy `!isPaused` aktualizuje rosnące timery; layout `fixed top-4 right-4 z-40`: MG na górze, separator, lista graczy
- [x] **PR.H.2** Wizualizacja: aktywny = zielone tło + "Gra" + `totalActiveTimer` (szary); nieaktywny = `waitTimer` z kolorem (zielony 0–5 min, żółty 5–10, pomarańczowy 10–15, czerwony >15) + `totalActiveTimer` (frozen, szary)
- [x] **PR.H.3** Pauza: `isPaused=true` → freeze WSZYSTKICH timerów (`startedAt→null`, `elapsed` zachowane); recovery po F5: `elapsed + (Date.now() - Date.parse(startedAt))`

### PR.I — LiveSessionIndicator + TopBar

- [x] **PR.I.1** `shared/components/LiveSessionIndicator.tsx` — czyta `localStorage['mg-live-session'] = { sessionId, sessionName, isPaused }`; gdy brak → nie renderuje; widok: `● Sesja #N  ⏸/▶`; `●` pulsuje czerwony (aktywna) / szary (pauzowana); klik nazwy → `navigate('/sessions/:id/live')`; klik `⏸/▶` → toggle `isPaused` w localStorage
- [x] **PR.I.2** `app/layout/TopBar.tsx` — dodaj `<LiveSessionIndicator />` po prawej stronie (obok dark mode toggle)

### PR.J — SessionLive (pełny rewrite)

- [x] **PR.J.1** `modules/sessions/components/SessionLive.tsx` — na mount: zapisuje `localStorage['mg-live-session']`; layout `flex flex-col h-screen` (desktop-only)
- [x] **PR.J.2** Header (`shrink-0 border-b`): `← Sesja #N` (link do `/sessions/:id`) | tytuł | przycisk **"Zakończ sesję na żywo"** (ghost, `StopCircle`, `text-red-500`) → `sessionStorage.removeItem('session-live-{id}')` + `localStorage.removeItem('mg-live-session')` → `navigate('/sessions/:id/cleanup')`
- [x] **PR.J.3** Body (`flex flex-1 overflow-hidden`): `<SessionTimeline sessionId>` (`w-64 shrink-0 border-r`) | `<SceneCenter sessionId>` (`flex-1 overflow-y-auto`)
- [x] **PR.J.4** `<SpotlightTracker>` fixed top-right poza flow layoutu; `DndContext` wrapping body (DragOverlay + handlery DnD)

### PR.K — SessionCleanup

- [x] **PR.K.1** `modules/sessions/components/SessionCleanup.tsx` — route `/sessions/:id/cleanup`; agreguje: NPC `appears_in → session` bez `contains`/`belongs_to` → "Postacie bez lokacji"; lokacje `appears_in → session` bez `contains(parent→location)` → "Lokacje bez rodzica"; threads `appears_in → session` bez `derives_from` ani zagrożeń → "Wątki wiszące"; per element: `[Przypisz]` (RelationPicker) | `[Otwórz]` (link `/:type/:id`) | `[Usuń]` (ConfirmDialog); `EmptyState` "Sesja uporządkowana!" gdy puste; przycisk "Przejdź do podsumowania" → `/sessions/:id`
- [x] **PR.K.1a** Sekcja "Postacie bez lokacji" w cleanup — każda postać ma dodatkowy inline picker lokacji (`select` z lokacji sesji) + przycisk `[Przypisz do lokacji]` → `addRelation(contains)`; zastępuje generyczny RelationPicker dla tego konkretnego przypadku
- [x] **PR.K.2** `app/router.tsx` — dodaj lazy route `/sessions/:id/cleanup`; `TopBar` ROUTE_LABELS
- [x] **PR.K.3** `modules/sessions/components/SessionDetail.tsx` — przycisk "Sprzątaj sesję" obok "Na żywo", nawiguje do `/sessions/:id/cleanup`

### PR.L — Testy

- [x] **PR.L.1** `tests/modules/sessions/useSessionEvents.test.ts` — CRUD eventów, sort po `timestamp`, kaskadowe usuwanie relacji
- [x] **PR.L.2** `useLiveSessionState` — LRU (>4 kart: ostatnia odpada), zapis/odczyt `sessionStorage`, recovery po reinicjalizacji
- [x] **PR.L.3** SpotlightTracker logika — klik gracza nieaktywnego deaktywuje MG; klik MG nie resetuje `waitTimer` graczy; pauza freezuje wszystkie timery
- [x] **PR.L.4** Smoke test `SessionLive` — renderuje bez crashu z `renderWithProviders`

---

## Prerelease II — SessionLive Canvas Redesign

Cel: zastąpienie trójkolumnowego layoutu ekranem w stylu RTS — puste płótno z pływającymi kartami + dolny HUD tray z zakładkami. Bez zmian kolorystycznych.

**Ustalenia projektowe (Q&A 2026-04-10):**
- Center = puste płótno (`position: relative`, `flex-1`); karty unoszą się jako `position: fixed`
- Karty pamiętają pozycję w `sessionStorage['fcard-pos-{id}']`; startowa pozycja: kaskada `(64 + idx*24, 80 + idx*24)` px
- Z-index globalny `_zTop` — klik karty wynosi ją na wierzch
- SessionTimeline + SpotlightTracker + ActiveThreatsPanel + QuickNotePanel → zakładki w dolnym tray
- LocationTreePanel + NpcContextPanel → zakładka "Mapa NPC" w tray (split view)
- MAX_OPEN_CARDS: 4 → 8

### PR.M — FloatingCard

- [x] **PR.M.1** `modules/sessions/components/FloatingCard.tsx` — nowy komponent; `position: fixed`; drag przez `onPointerDown/Move/Up` + `setPointerCapture`; `sessionStorage` persystuje `{ x, y }` pod kluczem `fcard-pos-{id}`; globalny licznik `_zTop` (module-level `let`), klik outer div → `setZ(++_zTop)`; props: `id, title, badge?, linkPath?, onClose, children, width=272, initialX=64, initialY=80`; header z `<GripVertical>`, linkiem zewnętrznym i przyciskiem X; body `overflow-y-auto` z `maxHeight: calc(100vh - 140px)`
- [x] **PR.M.2** `modules/sessions/components/SceneCards.tsx` — usuń `SceneCardShell`; każda karta (`NpcSceneCard`, `ThreatSceneCard`, `LocationSceneCard`) opakowuje treść w `<FloatingCard>`; dodaj props `initialX?: number, initialY?: number`; przekaż `id` jako `npc-{id}` / `threat-{id}` / `loc-{id}`; treść kart bez zmian
- [x] **PR.M.3** `modules/sessions/hooks/useLiveSessionState.ts` — zmień `MAX_OPEN_CARDS = 4` na `MAX_OPEN_CARDS = 8`; zaktualizuj komentarz LRU

### PR.N — SceneCenter jako płótno

- [x] **PR.N.1** `modules/sessions/components/SceneCenter.tsx` — usuń: blok "Scene cards area" (`openCardIds.length > 0` + horizontal scroll), sekcje `QuickNotePanel` i `ActiveThreatsPanel`, import `ActiveThreatsPanel`, import `QuickNotePanel`; zachowaj: `LocationBreadcrumb` + QuickAdd row, `ScenePillsRow`
- [x] **PR.N.2** Zastąp usuniętą dolną część nowym canvas div: `<div className="flex-1 overflow-hidden bg-surface-50">` z `EmptyState` gdy `openCardIds.length === 0` (tekst: "Kliknij tabliczkę powyżej, by otworzyć kartę postaci lub zagrożenia")
- [x] **PR.N.3** Renderuj pływające karty bezpośrednio w `SceneCenter` (poza canvas divem, po nim): `{openCardIds.map((id, idx) => ...)}` — dla każdego otwartego id wybierz odpowiedni `*SceneCard` z `initialX = 64 + idx*24`, `initialY = 80 + idx*24`; karty renderowane warunkowo przez `openEntities.get(id)?.type`

### PR.O — SessionHudTray

- [x] **PR.O.1** `modules/sessions/components/SessionHudTray.tsx` — nowy komponent; props: `sessionId, currentLocationId, onLocationChange, spotlightState: SpotlightState, onSpotlightChange`; stan `{ open: boolean; tab: TabId }` persystowany w `sessionStorage['hud-tray-{sessionId}']`
- [x] **PR.O.2** Pasek statusu (zawsze widoczny, `h-9`, `border-t border-surface-200 bg-white`): `📍 nazwa lokacji (max-w-[140px] truncate)` | `👥 aktywny gracz` | `⚠ N` (tylko gdy zagrożenia > 0) | skróty zakładek jako text-buttony | przycisk `▲/▼`; lokację czyta przez `useLiveQuery(() => db.entities.get(currentLocationId))`, licznik zagrożeń przez zapytanie `useActiveThreatsCount`
- [x] **PR.O.3** Tray content (`max-h-[340px]`, `overflow-hidden`, animacja `transition-all duration-200`): pasek zakładek (`bg-surface-50 border-b`) + obszar treści (`h-[280px] overflow-y-auto`); zakładki: `Spotlight | Zagrożenia | Notatki | Oś czasu | Mapa NPC`; aktywna zakładka: `border-b-2 border-primary-500 bg-white text-primary-700`
- [x] **PR.O.4** Treści zakładek:
  - `spotlight` → `<SpotlightTracker sessionId state onChange />` w `<div className="p-3">`
  - `threats` → `<ActiveThreatsPanel />` w `<div className="p-3">`
  - `notes` → `<QuickNotePanel sessionId contextLocationId />` w `<div className="p-3">`
  - `timeline` → `<SessionTimeline sessionId />` (pełna wysokość)
  - `map` → split: `<LocationTreePanel>` (flex-1, `overflow-y-auto p-2`) + `<NpcContextPanel>` (`w-52 overflow-y-auto p-2`), oddzielone `divide-x divide-surface-200`

### PR.P — SessionLive nowy layout

- [x] **PR.P.1** `modules/sessions/components/SessionLive.tsx` — usuń: import `SessionTimeline`, `SpotlightTracker`; usuń panel lewy (`w-64 bg-navy-800`) i panel prawy (`w-72`); zmień `<div className="flex flex-1 overflow-hidden">` na `<div className="flex flex-1 flex-col overflow-hidden">`; dodaj import + render `<SessionHudTray>` poniżej `<SceneCenter>`, przekaż `sessionId, currentLocationId, onLocationChange={setCurrentLocationId}, spotlightState={spotlightState ?? DEFAULT_SPOTLIGHT}, onSpotlightChange={setSpotlightState}`
- [x] **PR.P.2** `modules/sessions/components/SessionTimeline.tsx` — zamień ciemny motyw navy na jasny surface: `bg-navy-800 text-navy-100` → `bg-surface-50 text-surface-900`; `border-navy-700` → `border-surface-200`; `text-navy-300/400` → `text-surface-500`; `bg-navy-700` → `bg-white`; `text-navy-100` (tekst wpisów) → `text-surface-800`; `hover:bg-navy-700` → `hover:bg-surface-100`; `border-navy-600 bg-navy-700 text-navy-100 placeholder:text-navy-400 focus:border-navy-300` w textarea → `border-surface-300 bg-white text-surface-900 placeholder:text-surface-400 focus:border-primary-500`

### PR.Q — Testy

- [x] **PR.Q.1** `FloatingCard` — pozycja startowa zapisana do `sessionStorage` po render; pozycja z `sessionStorage` odczytana przy kolejnym render z tym samym `id`; klik karty podnosi `z-index` ponad inne
- [x] **PR.Q.2** `useLiveSessionState` — `MAX_OPEN_CARDS = 8`: po otwarciu 9 kart LRU wyrzuca pierwszą (najstarszą), stan ma dokładnie 8 pozycji
- [x] **PR.Q.3** Smoke test `SessionLive` po redesignie — renderuje `SceneCenter` + `SessionHudTray`, brak `SessionTimeline` na poziomie głównym layoutu, brak panelu `w-64 bg-navy-800`

---

## Prerelease III — Quickfix Hardening

Cel: domknięcie warstwy jakości i stabilizacji przed wydaniem, zgodnie z planem w `docs/quickfix.md`.

### PR.R — Stabilizacja wejścia (Faza 0)

- [x] **PR.R.1** Domknięto bazowe bramki jakości: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- [x] **PR.R.2** Ograniczono warningi utrzymaniowe i uporządkowano testy emitujące ostrzeżenia `act(...)`.

### PR.S — Kontrakty danych i integralność relacji (Grupy 1–3)

- [x] **PR.S.1** Ujednolicono kontrakty domenowe `EntityType -> data` między typami, walidacją i runtime.
- [x] **PR.S.2** Ograniczono casty techniczne (`as unknown as`, `as never`) przez helpery domenowe.
- [x] **PR.S.3** Uszczelniono integralność relacji i walidację importu względem `relationRules`.
- [x] **PR.S.4** Wprowadzono wersjonowanie backupu i warstwę migracji formatu import/export.
- [x] **PR.S.5** Uporządkowano źródła prawdy dla hierarchii i sortowania (contains/sortOrder) oraz domknięto regresje.

### PR.T — Skalowalność i porządki Session Live (Grupy 4–5)

- [x] **PR.T.1** Wydzielono wspólną warstwę query dla kluczowych ścieżek Session Live.
- [x] **PR.T.2** Wydzielono command layer dla mutacji live (dodawanie do sesji, przenoszenie NPC, status wątków, nazwa sceny).
- [x] **PR.T.3** Uszczelniono kontrakt stanu live w storage i regresje na uszkodzone dane przeglądarki.
- [x] **PR.T.4** Zachowano kompatybilność logiki UI Session Live bez zmiany semantyki danych domenowych.

### PR.U — UI standard i release readiness (Grupy 6–8)

- [x] **PR.U.1** Dopracowano wspólny `Modal` (initial focus, focus trap, restore focus).
- [x] **PR.U.2** Uspójniono krytyczne ścieżki fokusowania i zamykania dialogów (`ConfirmDialog`, kluczowe pickery Session Live).
- [x] **PR.U.3** Uporządkowano Search UX dla `Ctrl+K` i testy regresyjne.
- [x] **PR.U.4** Urealniono dokumentację release readiness (jawne rozdzielenie offline-first vs PWA).

### PR.V — Moduły dodatkowe z quickfix

- [x] **PR.V.1** Historia NPC „ostatnio widziany w” — kontrakt, zapis logu zmian lokacji, widok ostatnich wpisów i modal historii.
- [x] **PR.V.2** Architektura fabuły (fronty/zagrożenia/wątki/wskazówki) — domknięte kontrakty i relacje domenowe (`affects`, rozszerzone `clues_for`, questline metadata).
- [x] **PR.V.3** Dopracowanie detali i Session Live pod model fabularny, wraz z regresjami.

---

## Cross-cutting — ciągłe

Zadania realizowane równolegle z fazami, nie jednorazowo.

### Testy

- [x] **T.1** Konfiguracja CI — GitHub Actions: lint, typecheck, test, build na PR (→ Faza 15.8)
- [ ] **T.2** Testy jednostkowe operacji DB przy każdej fazie
- [ ] **T.3** Testy komponentów (Testing Library) przy każdym nowym widoku
- [ ] **T.4** Testy integracyjne kluczowych przepływów (np. dodaj encję → widoczna na liście → relacja → widoczna w grafie)
- [ ] **T.5** Pokrycie testami hooków reaktywnych (useLiveQuery reaguje na mutacje)

### Dostępność (a11y)

- [ ] **A.1** ARIA labels na wszystkich interaktywnych elementach
- [ ] **A.2** Nawigacja klawiaturą — focus management, focus trap w modalach
- [ ] **A.3** Semantic HTML — headings, landmarks, listy
- [ ] **A.4** Kontrast kolorów — WCAG AA minimum

### Wydajność

- [ ] **P.1** Lazy loading routes — weryfikacja code splitting w build output
- [ ] **P.2** `React.memo` na kartach encji w listach
- [ ] **P.3** Virtualizacja listy — jeśli >100 elementów (react-window lub podobne)
- [ ] **P.4** Bundle size audit — target <500KB gzipped initial load
- [ ] **P.5** Profiling Dexie queries — <100ms na operacje CRUD przy 10 000 encji

---

## Przyszłe rozwinięcia (backlog)

Zadania poza MVP — do rozważenia po ukończeniu faz 1–10.

- [ ] **F.1** PWA — Service Worker, `manifest.json`, instalacja na urządzeniu, pełny offline
- [ ] **F.2** Synchronizacja przez folder `.md` + Git — obsługa FileSystem Access API
- [ ] **F.3** Drag & drop — sortowanie list sesji/wątków, przenoszenie NPC między lokacjami, drop do sesji na żywo *(→ Faza F.3)*
- [ ] **F.4** Undo/Redo — stos operacji na poziomie DB (op log lub Zustand middleware)
- [ ] **F.5** Szablony encji — predefiniowane typy zagrożeń PbtA, archetypy NPC
- [x] **F.6** Timeline — wizualna oś czasu sesji i wydarzeń (→ Faza 14)
- [ ] **F.7** Wielokampanijność — oddzielne bazy danych per kampania (Dexie named databases) *(→ Faza 16)*
- [ ] **F.8** Eksport PDF — generowanie ładnego PDF z encji (jsPDF lub print CSS)
- [ ] **F.9** Kolaboracja — CRDTs (Yjs) do współdzielenia bazy między GM-ami
- [ ] **F.10** AI assist — generowanie opisów NPC, lokacji, zagrożeń z promptów
- [ ] **F.11** Random tables — generatory losowe (imiona, cechy, lokacje) konfigurowane przez GM
- [ ] **F.12** Mapy — integracja z Leaflet do osadzania map z pinami lokacji
- [ ] **F.13** Encounter tracker — tracker inicjatywy i HP na sesji na żywo *(opcjonalne, niski priorytet)*
