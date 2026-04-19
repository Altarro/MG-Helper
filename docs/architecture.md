# MG Helper — Architektura aplikacji

## 1. Przegląd architektury

Aplikacja oparta na **modularnym monolicie frontendowym** — SPA (Single Page Application) bez backendu, z danymi przechowywanymi w IndexedDB (przez Dexie.js). Architektura wymusza izolację modułów domenowych — komunikacja wyłącznie przez warstwę persystencji i współdzielone hooki.

```
┌─────────────────────────────────────────────────────────┐
│                      React SPA                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │  NPCs  │ │  Locs  │ │ Fronts │ │Clocks  │ ...       │  ← Moduły domenowe
│  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘           │
│      │          │          │          │                  │
│  ┌───┴──────────┴──────────┴──────────┴──────────────┐  │
│  │              Shared Layer                          │  │  ← Współdzielone UI,
│  │   components · hooks · types · utils               │  │    hooki, typy
│  └──────────────────────┬────────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────┴────────────────────────────┐  │
│  │              Dexie.js (IndexedDB)                  │  │  ← Persystencja offline
│  │   entities · relations                             │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Kluczowe decyzje architektoniczne

| Decyzja | Uzasadnienie |
|---|---|
| Brak backendu, 100% offline | Dane GM-a są prywatne; eliminuje koszty hostingu i latencję sieciową |
| Dexie.js + IndexedDB | Reaktywne query (`useLiveQuery`), indeksowanie, wsparcie dla dużych zbiorów |
| Moduły izolowane, komunikacja przez DB | Luźne powiązania — moduł można usunąć/dodać bez wpływu na resztę |
| Zustand per moduł (opcjonalnie) | Lekki stan UI (filtry, zaznaczenia) obok ciężkiego stanu w DB |
| Tiptap (ProseMirror) | Rich-text z pełną kontrolą nad schematem dokumentu |
| Feature-based struktura katalogów | Łatwiejsze skalowanie niż podział techniczny (components/ hooks/ …) |

---

## 2. Struktura plików i folderów

```
MG_Helper/
├── .github/
│   └── workflows/
│       └── ci.yml                      # CI pipeline (lint, test, build)
│
├── public/
│   ├── favicon.svg
│   └── manifest.json                   # PWA manifest (offline-first)
│
├── src/
│   ├── main.tsx                        # Punkt wejścia — mountuje <App />
│   │
│   ├── app/                            # Warstwa aplikacyjna (shell, routing, providers)
│   │   ├── App.tsx                     # Root: providers (Router, CampaignProvider, ErrorBoundary)
│   │   ├── router.tsx                  # Definicja tras (React Router lazy routes)
│   │   ├── RequireCampaign.tsx         # Guard: redirect na /campaigns gdy brak aktywnej kampanii
│   │   └── layout/
│   │       ├── AppShell.tsx            # Główny layout: sidebar + content area
│   │       ├── Sidebar.tsx             # Nawigacja modułowa + ikony lucide
│   │       └── TopBar.tsx              # Breadcrumbs + CampaignSwitcher + LiveSessionIndicator
│   │
│   ├── modules/                        # Moduły domenowe (feature slices)
│   │   ├── npcs/
│   │   │   ├── components/
│   │   │   │   ├── NpcCard.tsx         # Karta NPC w liście
│   │   │   │   ├── NpcForm.tsx         # Formularz tworzenia/edycji NPC
│   │   │   │   ├── NpcList.tsx         # Lista NPC z filtrami
│   │   │   │   └── NpcDetail.tsx       # Widok szczegółowy NPC
│   │   │   ├── hooks/
│   │   │   │   ├── useNpcs.ts          # Lista NPC z filtrami (useLiveQuery)
│   │   │   │   └── useNpcById.ts       # Pojedynczy NPC + relacje
│   │   │   ├── store.ts               # Zustand: stan UI (filtry, sortowanie)
│   │   │   ├── types.ts               # Npc extends Entity
│   │   │   └── index.ts               # Public API modułu (re-eksport)
│   │   │
│   │   ├── locations/
│   │   │   ├── components/
│   │   │   │   ├── LocationCard.tsx
│   │   │   │   ├── LocationForm.tsx
│   │   │   │   ├── LocationList.tsx
│   │   │   │   ├── LocationDetail.tsx
│   │   │   │   └── LocationTree.tsx    # Drzewo hierarchii lokacji
│   │   │   ├── hooks/
│   │   │   │   ├── useLocations.ts
│   │   │   │   ├── useLocationById.ts
│   │   │   │   └── useLocationTree.ts  # Rekurencyjne ładowanie podlokacji
│   │   │   ├── store.ts
│   │   │   ├── types.ts               # Location extends Entity
│   │   │   └── index.ts
│   │   │
│   │   ├── fronts/
│   │   │   ├── components/
│   │   │   │   ├── FrontCard.tsx
│   │   │   │   ├── FrontForm.tsx
│   │   │   │   ├── FrontList.tsx
│   │   │   │   └── FrontDetail.tsx     # Front + zagnieżdżone zagrożenia + zegary
│   │   │   ├── hooks/
│   │   │   │   ├── useFronts.ts
│   │   │   │   └── useFrontById.ts
│   │   │   ├── types.ts               # Front extends Entity
│   │   │   └── index.ts
│   │   │
│   │   ├── threats/
│   │   │   ├── components/
│   │   │   │   ├── ThreatCard.tsx
│   │   │   │   ├── ThreatForm.tsx
│   │   │   │   ├── ThreatList.tsx
│   │   │   │   └── ThreatDetail.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useThreats.ts
│   │   │   │   └── useThreatById.ts
│   │   │   ├── types.ts               # Threat extends Entity
│   │   │   └── index.ts
│   │   │
│   │   ├── clocks/
│   │   │   ├── components/
│   │   │   │   ├── ClockCard.tsx
│   │   │   │   ├── ClockForm.tsx
│   │   │   │   ├── ClockList.tsx
│   │   │   │   ├── ClockDetail.tsx
│   │   │   │   └── ClockVisual.tsx     # SVG zegar z segmentami (4/6/8/12)
│   │   │   ├── hooks/
│   │   │   │   ├── useClocks.ts
│   │   │   │   └── useClockById.ts
│   │   │   ├── types.ts               # Clock extends Entity
│   │   │   └── index.ts
│   │   │
│   │   ├── sessions/
│   │   │   ├── components/
│   │   │   │   ├── SessionCard.tsx
│   │   │   │   ├── SessionForm.tsx
│   │   │   │   ├── SessionList.tsx        # z DndContext + SortableSessionCard
│   │   │   │   ├── SortableSessionCard.tsx
│   │   │   │   ├── SessionDetail.tsx      # 5-kolumnowy grid + wątki, wskazówki, notatki
│   │   │   │   ├── SessionLive.tsx        # Canvas layout: SceneCenter + SessionHudTray
│   │   │   │   ├── SessionCleanup.tsx     # /cleanup — nieprzypisane encje sesji
│   │   │   │   ├── SessionReport.tsx      # /report — raport po sesji, print CSS
│   │   │   │   ├── SceneCenter.tsx        # Puste płótno + pływające karty
│   │   │   │   ├── SceneCards.tsx         # NpcSceneCard, ThreatSceneCard, LocationSceneCard
│   │   │   │   ├── ScenePillsRow.tsx      # Chipy NPC/wątek/zagrożenie + quick-add
│   │   │   │   ├── FloatingCard.tsx       # position:fixed draggable wrapper + sessionStorage
│   │   │   │   ├── SessionHudTray.tsx     # Dolny HUD: status bar + tray z 5 zakładkami
│   │   │   │   ├── SessionTimeline.tsx    # Discord-style oś czasu z wpisami
│   │   │   │   ├── SpotlightTracker.tsx   # Timer per gracz (waitTimer + totalActiveTimer)
│   │   │   │   ├── LocationBreadcrumb.tsx # 📍 aktywna lokacja + LocationTreePopover
│   │   │   │   ├── LocationTreePanel.tsx  # Drzewo lokacji sesji z inline dodawaniem
│   │   │   │   ├── NpcContextPanel.tsx    # W lokacji / W sesji z checkbox multi-select
│   │   │   │   ├── ThreadTreePanel.tsx    # Drzewo wątków z derives_from
│   │   │   │   ├── ActiveThreatsPanel.tsx # Zagrożenia + zegary + TickProgress + ClueSection
│   │   │   │   ├── NpcPreviewModal.tsx    # Read-only podgląd NPC (Modal)
│   │   │   │   ├── LocationPreviewModal.tsx
│   │   │   │   └── ThreatPreviewModal.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useSessions.ts         # sortOrder → number (desc) fallback
│   │   │   │   ├── useSessionById.ts
│   │   │   │   ├── useLiveSessionState.ts # sessionStorage: currentLocationId, openCardIds, spotlightState
│   │   │   │   └── useSessionEvents.ts    # events (type='event') posortowane po timestamp
│   │   │   ├── types.ts               # Session extends Entity; SessionEventData
│   │   │   └── index.ts
│   │   │
│   │   ├── factions/
│   │   │   ├── components/
│   │   │   │   ├── FactionCard.tsx
│   │   │   │   ├── FactionForm.tsx
│   │   │   │   ├── FactionList.tsx
│   │   │   │   └── FactionDetail.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useFactions.ts
│   │   │   │   └── useFactionById.ts
│   │   │   ├── types.ts               # Faction extends Entity
│   │   │   └── index.ts
│   │   │
│   │   ├── items/
│   │   │   ├── components/
│   │   │   │   ├── ItemCard.tsx
│   │   │   │   ├── ItemForm.tsx
│   │   │   │   ├── ItemList.tsx
│   │   │   │   └── ItemDetail.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useItems.ts
│   │   │   │   └── useItemById.ts
│   │   │   ├── types.ts               # Item extends Entity
│   │   │   └── index.ts
│   │   │
│   │   ├── graph/
│   │   │   ├── components/
│   │   │   │   ├── GraphView.tsx       # react-force-graph-2d wrapper
│   │   │   │   ├── GraphControls.tsx   # Filtrowanie typów encji/relacji
│   │   │   │   └── GraphTooltip.tsx    # Tooltip nad węzłem/krawędzią
│   │   │   ├── hooks/
│   │   │   │   └── useGraphData.ts     # Transformacja encji+relacji → nodes+links
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── Dashboard.tsx       # Strona główna
│   │   │   │   ├── ActiveFronts.tsx    # Skrót aktywnych frontów
│   │   │   │   ├── RunningClocks.tsx   # Zegary w toku
│   │   │   │   └── RecentChanges.tsx   # Ostatnio edytowane encje
│   │   │   ├── hooks/
│   │   │   │   └── useDashboard.ts     # Agregacja danych dashboardu
│   │   │   └── index.ts
│   │   │
│   │   ├── data-io/
│   │       ├── components/
│   │       │   ├── ExportButton.tsx    # Export JSON całej bazy
│   │       │   ├── ImportButton.tsx    # Import JSON z walidacją
│   │       │   └── MarkdownExport.tsx  # Export encji do .md
│   │       ├── hooks/
│   │       │   └── useDataIO.ts        # Logika serializacji/deserializacji
│   │       ├── utils/
│   │       │   ├── exportJson.ts       # Serializacja DB → JSON
│   │       │   ├── importJson.ts       # Walidacja + zapis JSON → DB
│   │       │   └── exportMarkdown.ts   # Entity → Markdown string
│   │       └── index.ts
│   │   │
│   │   ├── clues/                      # Wskazówki (Three Clue Rule)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── types.ts               # Clue extends Entity (ClueData)
│   │   │   └── index.ts
│   │   │
│   │   ├── threads/                    # Wątki fabularne (Plot Threads)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── types.ts               # Thread extends Entity (ThreadData)
│   │   │   └── index.ts
│   │   │
│   │   ├── timeline/                   # Oś czasu Gantt (sesje × wątki)
│   │   │   ├── components/             # TimelineView.tsx — Gantt siatka
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   │
│   │   ├── campaigns/
│   │   │   ├── components/
│   │   │   │   ├── CampaignCard.tsx    # Karta kampanii: nazwa, opis, przyciski Otwórz/Zmień/Usuń
│   │   │   │   ├── CampaignForm.tsx    # Dialog tworzenia/edycji kampanii (Zod, nanoid)
│   │   │   │   ├── CampaignList.tsx    # Strona /campaigns — siatka kart + EmptyState
│   │   │   │   └── CampaignSwitcher.tsx # Dropdown w TopBar — aktywna kampania + lista
│   │   │   └── index.ts
│   │   │
│   │   ├── notes/
│   │   │   ├── components/
│   │   │   │   ├── NoteCard.tsx        # Karta: treść, data, badge sesji, chipy powiązań
│   │   │   │   ├── NoteList.tsx        # Strona /notes z filtrami per sesja i typ encji
│   │   │   │   ├── NotesList.tsx       # Embedded lista historii notatek dla encji
│   │   │   │   ├── NoteDetail.tsx      # Edycja inline + RelationList + MarkdownExportButton
│   │   │   │   └── QuickNotePanel.tsx  # Textarea + chipy kontekstu + live preview ostatnich 5
│   │   │   ├── hooks/
│   │   │   │   ├── useNotes.ts
│   │   │   │   ├── useNotesBySession.ts
│   │   │   │   └── useNotesFor.ts
│   │   │   ├── types.ts               # Note extends Entity (NoteData)
│   │   │   └── index.ts
│   │   │
│   │   ├── search/
│   │   │   └── SearchResultsPage.tsx   # /search?q= — wyniki fulltext
│   │   │
│   │   └── settings/
│   │       └── SettingsPage.tsx        # Import/export JSON, dane demo, usuwanie bazy
│   │
│   ├── shared/                         # Współdzielona infrastruktura
│   │   ├── components/
│   │   │   ├── EntityCard.tsx          # Bazowy komponent karty encji
│   │   │   ├── EntityForm.tsx          # Bazowy formularz z polami wspólnymi
│   │   │   ├── TagInput.tsx            # Tagi z autocomplete
│   │   │   ├── RelationPicker.tsx      # Wybór powiązanej encji (modal/dropdown)
│   │   │   ├── RelationList.tsx        # Lista relacji encji z akcjami
│   │   │   ├── SearchBar.tsx           # Globalne wyszukiwanie
│   │   │   ├── ClockWidget.tsx         # Mały wizualny zegar inline
│   │   │   ├── RichTextEditor.tsx      # Wrapper na Tiptap
│   │   │   ├── ConfirmDialog.tsx       # Dialog potwierdzenia (usuwanie) — oparty na Modal
│   │   │   ├── EmptyState.tsx          # Placeholder gdy brak danych
│   │   │   ├── ErrorBoundary.tsx       # Catch boundary per moduł
│   │   │   ├── LoadingSpinner.tsx      # Wskaźnik ładowania
│   │   │   ├── Toaster.tsx             # Toast notifications (sonner wrapper)
│   │   │   ├── OnboardingDialog.tsx    # Dialog pierwszego uruchomienia (seed / zacznij od zera)
│   │   │   ├── MarkdownExportButton.tsx # Eksport encji do pliku .md
│   │   │   ├── CollapsiblePanel.tsx    # Panel zwijany z persystencją stanu w localStorage
│   │   │   ├── ClueSection.tsx         # Reużywalny panel wskazówek z quick-add
│   │   │   ├── TickProgress.tsx        # Aktualny + następny opis tyknięcia zegara
│   │   │   ├── Modal.tsx               # Wycentrowany dialog; focus trap; ESC; size variants
│   │   │   ├── Backdrop.tsx            # fixed inset-0 overlay przez portal
│   │   │   ├── AnchoredPanel.tsx       # Panel kotwiczony przy triggerze; placement + fallback
│   │   │   ├── LiveSessionIndicator.tsx # Pulsujący wskaźnik aktywnej sesji (localStorage)
│   │   │   ├── DragHandle.tsx          # GripVertical z cursor-grab; używany w SortableCard
│   │   │   ├── DraggableNpcChip.tsx    # useDraggable chip NPC z fromLocationId
│   │   │   ├── DroppableLocationZone.tsx # useDroppable strefa lokacji; ring przy isOver
│   │   │   └── DroppableSessionZone.tsx  # useDroppable strefa sesji; akceptuje npc/item
│   │   │
│   │   ├── db/
│   │   │   ├── database.ts            # Fabryka baz: openCampaignDb(id), deleteCampaignDb(id)
│   │   │   ├── schema.ts              # Definicja tabel, indeksów, migracji
│   │   │   ├── operations.ts          # CRUD + updateSortOrders — każda fn przyjmuje db jako param
│   │   │   ├── CampaignContext.tsx    # CampaignProvider + useCampaign() hook
│   │   │   ├── campaignStore.ts       # localStorage: listCampaigns, saveCampaign, getActiveCampaignId
│   │   │   ├── migrateLegacyDb.ts     # Jednorazowa migracja mg-helper → kampania 'legacy'
│   │   │   ├── seed.ts                # Dane demo
│   │   │   └── relationRules.ts       # Matryca dozwolonych relacji — walidacja addRelation()
│   │   │
│   │   ├── hooks/
│   │   │   ├── useSearch.ts            # Fulltext search po encjach
│   │   │   ├── useRelations.ts         # CRUD relacji + query dwukierunkowe
│   │   │   ├── useContained.ts         # Encje zawarte w kontenerze (contains)
│   │   │   ├── useEntityById.ts        # Generyczny hook: encja po ID
│   │   │   ├── useEntitiesByType.ts    # Generyczny hook: lista po typie
│   │   │   ├── useTags.ts             # Unikalne tagi z autocomplete
│   │   │   ├── useDebounce.ts          # Debounce wartości (search input)
│   │   │   ├── useAncestors.ts         # Przodkowie encji przez relację contains (breadcrumbs)
│   │   │   ├── useAutosave.ts          # Debounced autosave dla Tiptap (1000ms + blur)
│   │   │   ├── useDarkMode.ts          # Dark mode toggle z persystencją w localStorage
│   │   │   └── useKeyboardShortcut.ts  # Globalny listener skrótów (Ctrl+K, Escape)
│   │   │
│   │   ├── types/
│   │   │   ├── entity.ts              # Entity, EntityType, bazowe pola
│   │   │   └── relation.ts            # Relation, RelationType
│   │   │
│   │   └── utils/
│   │       ├── id.ts                   # nanoid wrapper
│   │       ├── date.ts                 # date-fns helpery
│   │       └── sanitize.ts            # Sanityzacja HTML przez DOMPurify
│   │
│   └── styles/
│       └── index.css                   # Tailwind directives + custom CSS variables
│
├── tests/
│   ├── setup.ts                        # Vitest setup (fake-indexeddb, cleanup)
│   ├── helpers/
│   │   ├── renderWithProviders.tsx     # Test wrapper (router, db)
│   │   └── factories.ts               # Fabryki encji testowych
│   └── modules/                        # Testy odzwierciedlają strukturę src/modules
│       ├── npcs/
│       │   └── NpcForm.test.tsx
│       ├── clocks/
│       │   └── ClockVisual.test.tsx
│       └── ...
│
├── index.html                          # Entry HTML (Vite)
├── vite.config.ts                      # Vite config + aliasy ścieżek
├── tsconfig.json                       # Strict TS config
├── tsconfig.app.json                   # Config dla src/
├── tsconfig.node.json                  # Config dla vite.config.ts
├── eslint.config.js                    # ESLint 9 flat config
├── .prettierrc                         # Prettier config
├── package.json
├── pnpm-lock.yaml
├── requirements.md
└── architecture.md                     # Ten plik
```

---

## 3. Warstwa persystencji (Dexie / IndexedDB)

### 3.1 Schema

Baza zawiera **dwie tabele**: `entities` (polimorficzna) i `relations`.

```
┌──────────────────────────────────────┐     ┌──────────────────────────────┐
│              entities                │     │          relations           │
├──────────────────────────────────────┤     ├──────────────────────────────┤
│ PK  id         string (nanoid)       │     │ PK  id        string        │
│ IX  type       EntityType            │◄────│ IX  sourceId  string → FK   │
│ IX  name       string                │◄────│ IX  targetId  string → FK   │
│ MX  *tags      string[]             │     │ IX  type      RelationType  │
│ IX  createdAt  string (ISO 8601)    │     │     label?    string        │
│ IX  updatedAt  string (ISO 8601)    │     └──────────────────────────────┘
│     ...pola specyficzne per EntityType│
└──────────────────────────────────────┘
  PK = Primary Key, IX = Index, MX = Multi-entry Index
```

### 3.2 Polimorfizm encji

Jedna tabela `entities` przechowuje wszystkie typy. Dyskryminator: pole `type`. Hooki modułowe filtrują `db.entities.where('type').equals('npc')` itp. Dzięki indeksowi na `type` query jest O(log n).

### 3.3 Migracje

Dexie obsługuje migracje wersjonowane. Każda zmiana schematu to nowa wersja:

```typescript
// shared/db/schema.ts
db.version(1).stores({
  entities: 'id, type, name, *tags, createdAt, updatedAt',
  relations: 'id, sourceId, targetId, type',
});
```

**Konwencja migracji**: polimorficzna tabela `entities` nie wymaga migracji Dexie przy dodawaniu nowych pól — wystarczy zmiana typu TypeScript. Migracja Dexie potrzebna tylko przy zmianach indeksów. Numer wersji rośnie inkrementalnie, a `upgrade()` transformuje istniejące dane.

### 3.4 Operacje CRUD (generyczne)

```
shared/db/operations.ts
├── addEntity(entity)        → db.entities.add(entity)
├── updateEntity(id, patch)  → db.entities.update(id, { ...patch, updatedAt })
├── deleteEntity(id)         → transaction: usuń encję + powiązane relacje
├── addRelation(relation)    → db.relations.add(relation)
├── deleteRelation(id)       → db.relations.delete(id)
├── getRelationsFor(id)         → db.relations.where('sourceId').equals(id)
│                                 .or('targetId').equals(id)
├── updateSortOrders(ids)       → bulkUpdate: ustawia data.sortOrder wg pozycji w ids
└── getEntityById(id)           → db.entities.get(id)
```

Usuwanie encji odbywa się w **transakcji** — usuwa encję i wszystkie relacje, w których jest `sourceId` lub `targetId`.

---

## 4. Routing

Lazy-loaded routes per moduł. `React.lazy()` + `Suspense` w `router.tsx`.

```
/                           → Dashboard
/campaigns                  → CampaignList — CRUD kampanii; RequireCampaign guard na pozostałych
/npcs, /locations, /fronts, … → EntityList per moduł (statyczne lazy trasy)
/:type/:id                  → EntityDetail
/locations/:id              → LocationDetail (z drzewem hierarchii)
/sessions/:id/live          → SessionLive — canvas layout: SceneCenter + SessionHudTray
/sessions/:id/cleanup       → SessionCleanup — nieprzypisane encje po sesji
/sessions/:id/report        → SessionReport — raport po sesji + print
/fronts/:id                 → FrontDetail (front + zagrożenia + zegary)
/clues, /clues/:id          → ClueList / ClueDetail
/threads, /threads/:id      → ThreadList / ThreadDetail
/notes, /notes/:id          → NoteList / NoteDetail
/timeline                   → TimelineView (Gantt: sesje × wątki)
/graph                      → GraphView
/search?q=...               → SearchResults
/settings                   → Import/Export, dane demo, usuwanie bazy
```

### Lazy loading modułów

```typescript
// app/router.tsx
const NpcList    = lazy(() => import('../modules/npcs/components/NpcList'));
const NpcDetail  = lazy(() => import('../modules/npcs/components/NpcDetail'));
// ...analogicznie dla pozostałych modułów
```

Dzięki temu initial bundle nie zawiera kodu nieużywanych modułów.

### Breadcrumbs

Breadcrumbs w `TopBar.tsx` łączą dwa źródła:

1. **Routing-based** — typ encji z URL: `Dashboard > NPCs > [name]`
2. **Hierarchy-based** (lokacje) — `useAncestors(id)` rekurencyjnie buduje ścieżkę przodków przez relację `contains`: `Region > Settlement > Building > [name]`

```typescript
// shared/hooks/useAncestors.ts
// Zwraca tablicę encji od korzenia do bezpośredniego rodzica
const ancestors = useAncestors(entityId); // [Region, Settlement, Building]
```

Dla encji bez hierarchii (NPC, Clock, itp.) breadcrumbs opierają się wyłącznie na trasie routera.

---

## 5. Przepływ danych

### 5.1 Odczyt — reaktywne query

```
Komponent → useLiveQuery(dexie query) → IndexedDB
                  ↓ (auto re-render przy zmianie)
            Render danych w UI
```

`useLiveQuery` z Dexie reaguje na każdą mutację w obserwowanej tabeli — nie wymaga manualnego odświeżania.

### 5.2 Zapis — optymistyczny

```
User action → wywołanie operacji DB (addEntity / updateEntity)
                  ↓
            IndexedDB zapisuje
                  ↓
            useLiveQuery wykrywa zmianę → re-render
```

Brak pośredniego stanu "loading" przy zapisie lokalnym — operacja jest natychmiastowa (<1ms).

> **Multi-tab**: IndexedDB jest współdzielone między zakładkami przeglądarki. `useLiveQuery` z Dexie reaguje na zmiany z innych tabów automatycznie. Nie jest wymagana dodatkowa synchronizacja.

### 5.3 Stan UI (Zustand)

Zustand przechowuje **wyłącznie** efemeryczny stan UI:

```
Zustand store per moduł
├── filtry (tag, sortowanie, widok grid/list)
├── zaznaczenie (selected entity IDs)
├── stan formularza (isEditing, draft)
└── UI flags (isSidebarOpen, activeTab)
```

Stan trwały (encje, relacje) → **zawsze w Dexie**.

### 5.4 Autosave

Pola rich-text (Tiptap) w `SessionLive.tsx` i formularzach encji używają `useAutosave`:

```typescript
// shared/hooks/useAutosave.ts
useAutosave(entityId, content, {
  debounceMs: 1000,   // zapis po 1s bezczynności
  saveOnBlur: true,   // natychmiastowy zapis przy utracie focusu
});
```

**Strategia**: debounce 1000ms od ostatniej zmiany + natychmiastowy zapis na `blur`. Komponent wyświetla wskaźnik stanu: `Saving...` / `Saved`. Zapis wywołuje `updateEntity()` — `useLiveQuery` propaguje zmianę do pozostałych komponentów.

---

## 6. Komunikacja między modułami

Moduły **nie importują się nawzajem**. Komunikacja odbywa się pośrednio:

```
┌──────────┐                          ┌──────────┐
│  Fronts  │                          │  Clocks  │
│  module  │                          │  module  │
└────┬─────┘                          └────┬─────┘
     │ zapisuje Threat                     │ odczytuje Clock
     │ + relacje belongs_to / tracks       │ przez relację tracks
     ▼                                     ▼
┌──────────────────────────────────────────────────┐
│                    Dexie (IndexedDB)              │
│  entities: [...threats, ...clocks, ...]          │
│  relations: [threat→front, threat→clock, ...]    │
└──────────────────────────────────────────────────┘
```

> **Wielokampanijność (Faza 16)**: singleton `db` zastąpiony przez `CampaignContext` — każda kampania to osobna instancja Dexie (`mg-helper-{campaignId}`). Hooki pobierają `const { db } = useCampaign()`. Szczegóły: ADR-005 w `decisions.md`.

### Dozwolone zależności

```
modules/*  → shared/*     ✅  (moduł używa shared hooków, komponentów, typów)
shared/*   → shared/*     ✅  (wewnętrzne zależności shared)
modules/A  → modules/B    ❌  (zakazane — izolacja modułów)
app/*      → modules/*    ✅  (router importuje lazy components)
app/*      → shared/*     ✅
```

---

## 7. Wzorce komponentów

### 7.1 Moduł Pattern (na przykładzie NPC)

```
NpcList          → useNpcs() → useLiveQuery: entities.where('type').equals('npc')
  └── NpcCard    → EntityCard (shared) + pola specyficzne (instinct, motivation)

NpcDetail        → useNpcById(id) → useLiveQuery: entities.get(id)
  ├── NpcForm    → EntityForm (shared) + pola specyficzne
  ├── RelationList → useRelations(id) → dwukierunkowe relacje
  └── ClockWidget  → inline zegar jeśli NPC powiązany z Clock
```

### 7.2 Bazowe komponenty (shared)

| Komponent | Odpowiedzialność |
|---|---|
| `EntityCard` | Karta z name, tags, type badge, description preview. Moduł przekazuje dodatkowe pola przez `children` lub `renderExtra` prop |
| `EntityForm` | Formularz oparty na `react-hook-form` + `@hookform/resolvers/zod`. Pola: name, description (Tiptap), tags. Moduł rozszerza przez `additionalFields` prop |
| `RelationPicker` | Modal/dropdown do wyboru encji docelowej + typu relacji |
| `ClockWidget` | SVG z segmentami, obsługuje click-to-tick |
| `RichTextEditor` | Tiptap z toolbar (bold, italic, headings, lists, links) |

---

## 8. System relacji — szczegóły

### 8.1 Typy relacji

| Typ | Source | Target | Semantyka |
|---|---|---|---|
| `contains` | Location, Session | Location, NPC, Item, Threat | Hierarchia lokacji + pinowanie encji do sesji |
| `belongs_to` | Threat, NPC, Location | Front, Faction | Przynależność strukturalna |
| `tracks` | Threat | Clock | Zegar postępu zagrożenia |
| `appears_in` | NPC, Location, Item, Thread | Session | Encja wystąpiła w sesji |
| `owns` | NPC | Item | Posiadanie przedmiotu |
| `related_to` | dowolna | dowolna | Generyczna; opcjonalny `label` |
| `clues_for` | Clue | Threat, Front | Wskazówka prowadzi do zagrożenia/frontu |
| `derives_from` | Thread | Thread | Wątek pochodny — hierarchia narracyjna |

### 8.2 Dwukierunkowe query

`useRelations(entityId)` zwraca relacje, w których encja jest **source LUB target**, z załadowanymi danymi drugiej strony:

```typescript
// shared/hooks/useRelations.ts
const relations = useLiveQuery(() => {
  return db.relations
    .where('sourceId').equals(entityId)
    .or('targetId').equals(entityId)
    .toArray();
}, [entityId]);
```

### 8.3 Kaskadowe usuwanie

Usunięcie encji automatycznie usuwa wszystkie jej relacje (transakcja w `deleteEntity`). Relacja `contains` nie kaskaduje na dzieci — dzieci stają się "wolne" (osierocone), nie są usuwane.

### 8.4 Walidacja relacji

`addRelation()` wymusza matrycę dozwolonych kombinacji (source type → target type → relation type). Niepoprawne pary (np. `contains` między dwoma NPC) są odrzucane z komunikatem o błędzie. Konfiguracja matrycy w `shared/db/relationRules.ts`.

### 8.5 Brak bezpośrednich FK

Powiązania strukturalne (Threat → Front, Threat → Clock, Location → parent Location) modelowane wyłącznie przez tabelę `relations` (typy `belongs_to`, `tracks`, `contains`). Jedno źródło prawdy dla wszystkich powiązań między encjami.

---

## 9. Wyszukiwanie fulltext

```
SearchBar (TopBar)
  └── useSearch(query)
        └── db.entities
              .filter(entity =>
                entity.name.toLowerCase().includes(q) ||
                entity.tags.some(t => t.includes(q)) ||
                stripHtml(entity.description).includes(q)
              )
              .toArray()
```

Wyszukiwanie klienckie — przeszukuje `name`, `tags`, `description` (po strippowaniu HTML). Przy <10 000 encji wystarczająco szybkie. Debounce 300ms na input.

---

## 10. Eksport / Import

### JSON (pełna baza)

```
Export: db.entities.toArray() + db.relations.toArray() → JSON → Blob → download
Import: JSON → walidacja struktury → db.transaction: clear + bulkAdd
```

Walidacja sprawdza obecność wymaganych pól i poprawność typów encji. Import **nadpisuje** całą bazę (po potwierdzeniu).

### Markdown (pojedyncza encja)

```
Entity → template Markdown z name, type, tags, description (HTML→MD), relacje
```

---

## 11. Error handling

| Warstwa | Strategia |
|---|---|
| Komponent | `ErrorBoundary` per moduł — awaria NPC nie łamie Clocks |
| DB | Dexie rzuca wyjątki — catchowane w hookach, wyświetlane jako toast (`sonner`) |
| Routing | Fallback route → 404 page |
| Import | Walidacja JSON przed zapisem — błędy wyświetlane listą |

---

## 12. Wydajność

| Technika | Cel |
|---|---|
| Lazy loading routes | Mniejszy initial bundle |
| `useLiveQuery` | Reaktywność bez manualnego re-fetchu |
| Indeksy Dexie (`type`, `*tags`, `sourceId`, `targetId`) | Szybkie filtrowanie |
| `React.memo` na kartach encji | Unikanie zbędnych re-renderów list |
| Debounce na wyszukiwaniu | Ograniczenie query podczas pisania |
| Virtualizacja listy (jeśli >100 elementów) | Renderowanie tylko widocznych wierszy |

---

## 13. Testowanie

| Poziom | Narzędzie | Co testujemy |
|---|---|---|
| Unit | Vitest | Hooki, utils, operacje DB (fake-indexeddb) |
| Component | Testing Library + Vitest | Renderowanie, interakcje, formularze |
| Integration | Testing Library | Przepływ: dodaj encję → pojawia się na liście → usuń → znika |

### Testowa baza danych

Testy używają `fake-indexeddb` — in-memory implementacja IndexedDB. Każdy test dostaje czystą bazę (beforeEach: clear tables).

```typescript
// tests/setup.ts
import 'fake-indexeddb/auto';
```

---

## 14. Aliasy ścieżek

```typescript
// vite.config.ts
resolve: {
  alias: {
    '@app':     '/src/app',
    '@modules': '/src/modules',
    '@shared':  '/src/shared',
  }
}
```

Import w kodzie: `import { EntityCard } from '@shared/components/EntityCard'`


---

## 16. Drag & Drop (Faza F.3)

Implementacja oparta na bibliotece **@dnd-kit/core** + **@dnd-kit/sortable**.

### 16.1 Sortowanie encji

Sesje (`/sessions`) i wątki (`/threads`) można ręcznie porządkować przeciągając.
Kolejność persystowana w `data.sortOrder: number` — pole JSONB, dodane bez migracji Dexie.

```typescript
// shared/db/operations.ts
updateSortOrders(ids: string[]) {
  return db.transaction("rw", db.entities, async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.entities.update(ids[i], { data: { sortOrder: i } });
    }
  });
}
```

### 16.2 Drag NPC między lokacjami

W `SessionLive.tsx` → `NpcContextPanel`: NPC można przeciągnąć z jednej lokacji do drugiej.
Operacja: usuń stary `contains` → dodaj nowy `contains` do wybranej lokacji (transakcja).

### 16.3 Drop NPC/item do sesji

Upuszczenie NPC lub itemu na área sesji tworzy (idempotentnie) relację `appears_in → session`.

### 16.4 Komponenty DnD

| Komponent | Użycie |
|---|---|
| `DraggableNpcItem` | NPC w panelu lokacji (SessionLive) |
| `DroppableLocation` | Strefa upuszczania lokacji |
| `SortableSessionItem` | Wiersz sesji z uchwytem drag |
| `SortableThreadItem` | Wiersz wątku z uchwytem drag |
---

## 15. Diagram zależności modułów

```
                    ┌────────────┐
                    │  app/      │
                    │  (router)  │
                    └─────┬──────┘
                          │ lazy import
        ┌────────┬────────┼────────┬────────┬────────┐
        ▼        ▼        ▼        ▼        ▼        ▼
   ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
   │dashboard││  npcs  ││ locs   ││ fronts ││clocks  ││ graph  │ ...
   └───┬────┘└───┬────┘└───┬────┘└───┬────┘└───┬────┘└───┬────┘
       │         │         │         │         │         │
       └─────────┴─────────┴────┬────┴─────────┴─────────┘
                                │
                                ▼
                       ┌──────────────┐
                       │   shared/    │
                       │ components   │
                       │ hooks        │
                       │ db           │
                       │ types        │
                       │ utils        │
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  Dexie.js    │
                       │  (IndexedDB) │
                       └──────────────┘
```
