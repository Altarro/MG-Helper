# MG Helper — Wymagania techniczne

## 1. Opis projektu

Aplikacja webowa do zarządzania notatkami i zasobami dla Mistrza Gry (GM). Inspirowana mechanikami PbtA (Powered by the Apocalypse) — fronty, zagrożenia, zegary. System-agnostic, modularna architektura.

---

## 2. Stack technologiczny

### Frontend

| Technologia | Wersja | Rola |
|---|---|---|
| **React** | 19.x | UI framework |
| **TypeScript** | 5.x | Typowanie statyczne |
| **Vite** | 6.x | Bundler, dev server, HMR |
| **React Router** | 7.x | Routing między modułami |
| **Zustand** | 5.x | State management (osobny store per moduł) |
| **TailwindCSS** | 4.x | Utility-first styling |
| **Tiptap** | 2.x | Rich-text editor w notatkach (bazowany na ProseMirror) |
| **react-force-graph-2d** | 1.x | Wizualizacja grafów relacji |
| **nanoid** | 5.x | Generowanie ID encji |
| **date-fns** | 4.x | Formatowanie dat |
| **lucide-react** | latest | Ikony |
| **@dnd-kit/core** | 6.x | Drag & drop (sortowanie, przenoszenie encji) |
| **zod** | 3.x | Walidacja danych (formularze, import JSON) |
| **react-hook-form** | 7.x | Zarządzanie formularzami (walidacja, dirty tracking, performance) |
| **@hookform/resolvers** | 3.x | Integracja react-hook-form z Zod |
| **dompurify** | 3.x | Sanityzacja HTML (ochrona XSS przy imporcie i wyświetlaniu) |
| **sonner** | 2.x | Toast notifications (potwierdzenia CRUD, błędy) |

### Persystencja danych

| Technologia | Rola |
|---|---|
| **Dexie.js** 4.x | Wrapper na IndexedDB — offline-first, reaktywne queries (useLiveQuery) |

Brak backendu — dane przechowywane lokalnie w przeglądarce. Eksport/import przez JSON.

### Tooling / Dev

| Narzędzie | Rola |
|---|---|
| **ESLint** 9.x (flat config) | Linting |
| **Prettier** 3.x | Formatowanie kodu |
| **Vitest** 3.x | Testy jednostkowe i integracyjne |
| **Testing Library** (@testing-library/react) | Testy komponentów |
| **pnpm** | Package manager |

---

## 3. Architektura aplikacji

### 3.1 Struktura katalogów

```
src/
├── app/
│   ├── App.tsx                 # Root component, providers, router
│   ├── router.tsx              # Lazy-loaded routes per moduł
│   └── layout/
│       ├── AppShell.tsx        # Główny layout (sidebar + content)
│       ├── Sidebar.tsx         # Nawigacja modułowa + dark mode
│       └── TopBar.tsx          # Breadcrumbs + wyszukiwarka (Ctrl+K)
│
├── modules/
│   ├── npcs/          # Postacie (NPC i gracze PC)
│   ├── locations/     # Lokacje z hierarchią (contains)
│   ├── fronts/        # Fronty kampanijne/przygodowe
│   ├── threats/       # Zagrożenia PbtA
│   ├── clocks/        # Zegary wizualne (4–12 segmentów)
│   ├── sessions/      # Sesje + widok live (SessionLive)
│   ├── factions/      # Frakcje
│   ├── items/         # Przedmioty i artefakty
│   ├── clues/         # Wskazówki (Three Clue Rule)
│   ├── threads/       # Wątki fabularne (Plot Threads)
│   ├── timeline/      # Oś czasu Gantt (sesje × wątki)
│   ├── graph/         # Mapa relacji (react-force-graph-2d)
│   ├── dashboard/     # Strona główna — agregacja kluczowych danych
│   ├── search/        # SearchResultsPage (/search?q=)
│   ├── settings/      # SettingsPage (import/export, dane demo)
│   └── data-io/       # Export/import JSON + Markdown
│
├── shared/
│   ├── components/
│   │   ├── EntityCard.tsx        # Bazowy komponent karty encji
│   │   ├── EntityForm.tsx        # Bazowy formularz (react-hook-form + Zod)
│   │   ├── TagInput.tsx          # Tagi z autocomplete
│   │   ├── RelationPicker.tsx    # Wybór powiązanej encji (modal)
│   │   ├── RelationList.tsx      # Lista relacji z akcjami
│   │   ├── SearchBar.tsx         # Globalne wyszukiwanie
│   │   ├── ClockWidget.tsx       # Wizualny zegar inline (klikowalny)
│   │   ├── RichTextEditor.tsx    # Wrapper na Tiptap
│   │   ├── ConfirmDialog.tsx     # Dialog potwierdzenia usuwania
│   │   ├── EmptyState.tsx        # Placeholder gdy brak danych
│   │   ├── ErrorBoundary.tsx     # Error boundary per moduł
│   │   ├── LoadingSpinner.tsx    # Suspense fallback
│   │   ├── Toaster.tsx           # Toast notifications (sonner)
│   │   ├── OnboardingDialog.tsx  # Dialog pierwszego uruchomienia
│   │   ├── MarkdownExportButton.tsx  # Eksport encji do .md
│   │   └── CollapsiblePanel.tsx  # Panel zwijany z persistą stanu
│   ├── db/
│   │   ├── database.ts       # Fabryka baz: openCampaignDb(id), deleteCampaignDb(id)
│   │   ├── schema.ts         # Definicja tabel i indeksów
│   │   ├── operations.ts     # CRUD generyczne + updateSortOrders (db jako pierwszy param)
│   │   ├── CampaignContext.tsx # CampaignProvider + useCampaign() hook
│   │   ├── campaignStore.ts  # localStorage: listCampaigns, saveCampaign, setActiveCampaignId
│   │   ├── migrateLegacyDb.ts # Migracja mg-helper → kampania 'legacy'
│   │   ├── relationRules.ts  # Matryca dozwolonych relacji
│   │   └── seed.ts           # Dane demo
│   ├── hooks/
│   │   ├── useEntityById.ts      # Generyczny: encja po ID
│   │   ├── useEntitiesByType.ts  # Generyczny: lista po typie
│   │   ├── useRelations.ts       # Dwukierunkowe query relacji
│   │   ├── useContained.ts       # Encje zawarte (contains)
│   │   ├── useAncestors.ts       # Przodkowie przez contains
│   │   ├── useSearch.ts          # Fulltext search
│   │   ├── useTags.ts            # Unikalne tagi
│   │   ├── useDebounce.ts        # Debounce inputów
│   │   ├── useAutosave.ts        # Debounced autosave
│   │   ├── useDarkMode.ts        # Dark mode + localStorage
│   │   └── useKeyboardShortcut.ts  # Ctrl+K i inne skróty
│   └── types/
│       ├── entity.ts             # Entity, EntityType, NewEntity
│       └── relation.ts           # Relation, RelationType, NewRelation
│
└── main.tsx
```

### 3.2 Moduły

Każdy moduł jest **samodzielny** — posiada własne komponenty, hooki i typy. Komunikacja między modułami odbywa się wyłącznie przez:

- **Warstwę bazy danych** (Dexie) — wspólna instancja DB
- **System relacji** — tabela `relations` w DB
- **Shared hooks** — `useRelations()`, `useContained()`

Awaria jednego modułu nie wpływa na pozostałe.

### 3.3 Model danych

#### Encja bazowa

```typescript
interface Entity {
  id: string              // nanoid
  type: EntityType
  name: string
  description: string     // sanitized HTML z Tiptap (DOMPurify)
  tags: string[]
  createdAt: string       // ISO 8601
  updatedAt: string       // ISO 8601
  data: Record<string, unknown>  // pola specyficzne per EntityType (JSONB pattern)
}

type EntityType =
  | 'npc'      // Postacie (NPC i gracze PC)
  | 'location' // Lokacje z hierarchią
  | 'front'    // Fronty PbtA
  | 'threat'   // Zagrożenia PbtA
  | 'clock'    // Zegary postępu
  | 'session'  // Sesje
  | 'faction'  // Frakcje
  | 'item'     // Przedmioty
  | 'clue'     // Wskazówki (Three Clue Rule)
  | 'thread'   // Wątki fabularne
  | 'event'    // Zdarzenia sesji (SessionTimeline)
  | 'note'     // Notatki sesji (żetonowe)
```

#### Relacje

```typescript
interface Relation {
  id: string
  sourceId: string
  targetId: string
  type: RelationType
  label?: string      // opcjonalny opis ("handluje z", "strzeże")
  createdAt: string   // ISO 8601
}

type RelationType =
  | 'contains'     // lokacja/sesja → lokacja, npc, item, threat
  | 'belongs_to'   // threat/npc/lokacja → front/frakcja
  | 'tracks'       // threat → clock
  | 'appears_in'   // npc/lokacja/item/thread → session
  | 'owns'         // npc → item
  | 'related_to'   // note → encja (npc|location|thread|item|front|threat|faction|clue|session)
  | 'clues_for'    // clue → threat|front
  | 'derives_from' // thread → thread (hierarchia wątków)
```

#### Matryca dozwolonych relacji

Konfiguracja w `shared/db/relationRules.ts`. `addRelation()` odrzuca pary niezgodne z tabelą.

| Typ relacji | Source | Target | Uwagi |
|---|---|---|---|
| `contains` | Location, Session | Location, NPC, Item, Threat | Hierarchia lokacji; pinowanie NPC do lokacji |
| `belongs_to` | Threat, NPC, Location | Front, Faction | Przynależność strukturalna |
| `tracks` | Threat | Clock | Zegar postępu zagrożenia |
| `appears_in` | NPC, Location, Item, Thread | Session | Encja wystąpiła w sesji |
| `owns` | NPC | Item | Posiadanie przedmiotu |
| `related_to` | dowolna | dowolna | Generyczna; opcjonalny `label` |
| `clues_for` | Clue | Threat, Front | Wskazówka prowadzi do zagrożenia/frontu |
| `derives_from` | Thread | Thread | Wątek pochodny (poddrzewo narracyjne) |

#### Pola specyficzne per EntityType (`data: {}`)

Wszystkie pola domenowe przechowywane w polu `data: Record<string, unknown>` — addytywne, bez migracji Dexie.

```typescript
// NPC / Postać gracza
type NpcData = {
  instinct: string        // PbtA: co postać robi domyślnie
  motivation: string
  appearance: string
  playStyle: string       // wskazówki odgrywania dla GM
  isPC?: boolean          // true = postać gracza
  playerName?: string     // imię gracza (gdy isPC)
}

// Lokacja
type LocationData = {
  locationType: 'city' | 'region' | 'building' | 'ruins' | 'dungeon' | 'wilderness' | 'custom'
  danger: number          // 0–5
  senses: { see: string; hear: string; smell: string; feel: string }
  parentId: string | null // ID lokacji nadrzędnej (hierarchia przez contains)
}

// Front PbtA
type FrontData = {
  category: 'campaign' | 'adventure'
  goal: string            // nadrzędny cel frontu
  stakes: string[]        // pytania stawki
}

// Zagrożenie PbtA
type ThreatData = {
  threatType: string
  impulse: string
  moves: string[]
}

// Zegar postępu
type ClockData = {
  segments: 4 | 6 | 8 | 10 | 12
  filled: number
  tickLabels?: string[]   // opis każdego tyknięcia
  isActive?: boolean      // false = zegar martwy (gray-out)
}

// Sesja
type SessionData = {
  number: number
  date: string
  summary: string
  sortOrder?: number      // kolejność drag & drop
}

// Frakcja
type FactionData = {
  goals: string[]
  resources: string[]
}

// Przedmiot
type ItemData = {
  itemType?: string
  properties?: string[]
}

// Wskazówka (Three Clue Rule)
type ClueData = {
  clueType: 'character' | 'location' | 'event'
  hint: string
  discovered: boolean
}

// Wątek fabularny
type ThreadData = {
  color: string           // jeden z 8 presetów (#ef4444, #f97316, …)
  status: 'active' | 'completed'
  sortOrder?: number      // kolejność drag & drop
}
```

### 3.4 Schemat bazy danych (Dexie)

```typescript
db.version(1).stores({
  entities: 'id, type, name, *tags, createdAt, updatedAt',
  relations: 'id, sourceId, targetId, type',
})
```

Indeksy na `type`, `*tags` (multi-entry), `sourceId`, `targetId` zapewniają O(log n) filtrowanie.

**Konwencja migracji**: pole `data` jest JSONB — nowe pola encji nie wymagają zmiany schematu Dexie. Nowa wersja Dexie potrzebna tylko przy zmianie indeksów (dodanie/usunięcie indeksowanego pola).

---

## 4. Kluczowe widoki

| Widok | Trasa | Opis |
|---|---|---|
| Dashboard | `/` | Aktywne fronty, zegary w ruchu, ostatnie zmiany |
| Lista NPC | `/npcs` | Lista postaci z filtrami Wszyscy/Gracze/NPC |
| Szczegóły NPC | `/npcs/:id` | Dane postaci, relacje, wskazówki |
| Lista lokacji | `/locations` | Lista lokacji z filtrem |
| Szczegóły lokacji | `/locations/:id` | Hierarchia lokacji + zawarte NPC/itemy |
| Fronty | `/fronts`, `/fronts/:id` | Front z zagrożeniami, zegarami, wskazówkami |
| Zegary | `/clocks`, `/clocks/:id` | Zegary z filtrami aktywne/martwe |
| Sesje | `/sessions`, `/sessions/:id` | Dziennik sesji |
| Sesja na żywo | `/sessions/:id/live` | Centrum dowodzenia: panele, tracker, notatki |
| Frakcje | `/factions`, `/factions/:id` | Frakcje z siedzibami |
| Przedmioty | `/items`, `/items/:id` | Przedmioty z właściwościami |
| Wskazówki | `/clues`, `/clues/:id` | Three Clue Rule |
| Wątki | `/threads`, `/threads/:id` | Narracyjne wątki fabularne |
| Oś czasu | `/timeline` | Gantt: sesje (X) × wątki (Y) |
| Mapa relacji | `/graph` | Interaktywny graf powiązań |
| Wyszukiwarka | `/search?q=...` | Fulltext po wszystkich encjach |
| Ustawienia | `/settings` | Import/export JSON, dane demo |

---

## 5. Funkcjonalności

### 5.1 Core

- [x] CRUD encji (tworzenie, edycja, usuwanie, lista) dla wszystkich typów
- [x] System tagów z autocomplete
- [x] Relacje typowane między encjami z matrycą dozwolonych kombinacji (`relationRules.ts`)
- [x] Relacja `contains` — hierarchia lokacji, pinowanie NPC/item do lokacji
- [x] Rich-text edytor (Tiptap) w opisach + autosave (debounce 1s + blur)
- [x] Globalne wyszukiwanie fulltext (Ctrl+K) z debounce 300ms
- [x] Breadcrumbs z kontekstem hierarchii (`useAncestors`)
- [x] Walidacja danych (Zod) — formularze i import JSON
- [x] Ochrona przed utratą zmian (`useUnsavedChanges` + `beforeunload`)
- [x] Dark mode z przełącznikiem (localStorage persistence)
- [x] Responsywny sidebar (hamburger menu na mobile)
- [x] Toast notifications (sonner) przy wszystkich operacjach CRUD
- [x] Error boundary per moduł

### 5.2 PbtA Mechaniki

- [x] Fronty (kampanijne + przygodowe) z polem celu i pytaniami stawki
- [x] Zagrożenia z typem, impulsem, ruchami GM i opisami tick
- [x] Zegary wizualne (4/6/8/10/12 segmentów) z tick/reset, `tickLabels`, `isActive`
- [x] Powiązanie zagrożenie → zegar → front
- [x] `TickProgress` — aktualny + następny opis tick w panelu zagrożeń
- [x] Wskazówki (Three Clue Rule) — `clueType`, `hint`, `discovered`, `clues_for`
- [x] Wątki fabularne — kolor, status, hierarchia `derives_from`
- [x] Oś czasu Gantt (sesje × wątki) z `appears_in`

### 5.3 Postacie i kontekst

- [x] Flaga PC (`isPC`, `playerName`) — filtry Wszyscy/Gracze/NPC
- [x] Widok lokacji pokazuje NPCe, itemy, zagrożenia przypisane przez `contains`
- [x] Widok NPC pokazuje lokację, frakcję, sesje, wskazówki
- [x] Quick-add z kontekstem (nowy NPC w lokacji → auto `contains`)
- [x] Widok sesji agreguje lokacje, NPCe, wątki, wskazówki
- [x] Frakcje powiązane z lokacjami (siedziby) przez `belongs_to`

### 5.4 SessionLive — centrum dowodzenia

- [x] `SessionLive.tsx` — canvas layout na żywo (desktop-only):
  - [x] `SceneCenter.tsx` — puste płótno + pływające karty (`FloatingCard`, sessionStorage)
  - [x] `SessionHudTray.tsx` — dolny HUD: 5 zakładek Spotlight/Zagrożenia/Notatki/Oś czasu/Mapa NPC
  - [x] `SpotlightTracker` — timer per gracz (waitTimer + totalActiveTimer); pauza + F5 recovery
  - [x] `SessionTimeline.tsx` — Discord-style oś czasu; autoscroll z freeze; Enter=submit
  - [x] `SessionCleanup.tsx` — `/cleanup`: nieprzypisane encje po sesji
  - [x] `SessionReport.tsx` — `/report`: raport agregowany + print CSS + eksport .md
  - [x] `LocationTreePanel`, `NpcContextPanel`, `ThreadTreePanel` — w HUD tray (Mapa NPC)
  - [x] `ActiveThreatsPanel` — zagrożenia z zegarami + TickProgress + ClueSection (w HUD tray)
  - [x] Drag & drop: NPC między lokacjami; drop NPC/item do sesji

### 5.5 Drag & Drop (F.3)

- [x] `@dnd-kit/core` + `@dnd-kit/sortable` — sortowanie sesji i wątków
- [x] Persistencja kolejności w `data.sortOrder` (JSONB, addytywne)
- [x] Drag NPC między lokacjami (swap relacji `contains`)
- [x] Drop NPC/item do aktywnej sesji (idempotentne `appears_in`)

### 5.6 Import / Export

- [x] Export/import pełnej bazy do JSON (walidacja Zod, sanityzacja HTML)
- [x] Export pojedynczej encji do Markdown
- [x] Raport sesji — widów `/sessions/:id/report` z print CSS + eksport .md
- [ ] (backlog) Synchronizacja przez folder `.md` + Git

---

## 6. Wymagania niefunkcjonalne

| Aspekt | Wymaganie |
|---|---|
| **Offline** | Aplikacja działa w 100% offline po pierwszym załadowaniu |
| **Wydajność** | < 100ms na operacje CRUD, płynne filtrowanie do 10 000 encji |
| **Responsywność** | Desktop-first, ale użyteczna na tablecie (min. 768px) |
| **Przeglądarka** | Chrome/Edge 120+, Firefox 120+, Safari 17+ |
| **Persystencja** | Dane w IndexedDB, przeżywają zamknięcie przeglądarki |
| **Backup** | Użytkownik może w każdej chwili wyeksportować dane do JSON |
| **Rozmiar bundle** | < 500KB gzipped (initial load) |
| **Dostępność** | Nawigacja klawiaturą, ARIA labels na interaktywnych elementach |

---

## 7. Fazy implementacji

| Faza | Moduły / zadania | Status |
|---|---|---|
| **1. Scaffold** | Vite + TS + Tailwind + Dexie + Router + Vitest | ✅ Ukończona |
| **2. Core** | CRUD, relacje, layout, routing, wyszukiwanie, Zod | ✅ Ukończona |
| **3. Clocks** | SVG zegary, tick/reset | ✅ Ukończona |
| **4. NPC + Locations** | NPC, lokacje zagnieżdżone, `contains` | ✅ Ukończona |
| **5. Fronts + Threats** | Fronty, zagrożenia, zegary | ✅ Ukończona |
| **6. Sessions** | Dziennik sesji, quick-add, live | ✅ Ukończona |
| **7. Factions + Items** | Frakcje, przedmioty | ✅ Ukończona |
| **7+. Dashboard** | Agregacja: fronty, zegary, ostatnie zmiany | ✅ Ukończona |
| **8. Graph** | react-force-graph-2d, filtry, tooltip | ✅ Ukończona |
| **9. Import/Export** | JSON roundtrip, Markdown eksport | ✅ Ukończona |
| **10. Polish** | Animacje, onboarding, dane demo, dark mode | ✅ Ukończona |
| **11. Rozbudowa** | tickLabels, cel frontu, PC flag, playStyle, SpotlightTracker | ✅ Ukończona |
| **12. Clues** | Wskazówki, Three Clue Rule, `clues_for` | ✅ Ukończona |
| **13. Threads** | Wątki fabularne, kolory, `appears_in → session` | ✅ Ukończona |
| **14. Timeline** | Gantt: sesje × wątki | ✅ Ukończona |
| **15. SessionLive v2** | CollapsiblePanel, LocationTree, NpcContext, CI | ✅ Ukończona |
| **F.3. Drag & Drop** | @dnd-kit, sortowanie sesji/wątków, drag NPC | ✅ Ukończona |
| **16. Wielokampanijność** | Izolowane bazy per kampania, CampaignContext | ✅ Ukończona |
| **17. Stabilizacja** | Empty states, focus mgmt, responsywność | ✅ Ukończona |
| **18. Notatki sesji** | Żetonowe notatki z auto-kontekstem, widok historii | ✅ Ukończona |
| **19. Session Report** | Raport po sesji + print CSS + eksport .md | ✅ Ukończona |
| **OV. Overlays** | Modal, AnchoredPanel, Backdrop | ✅ Ukończona |
| **PR. SessionLive** | Command Center — pełny rewrite (timeline, karty, cleanup) | ✅ Ukończona |
| **PR.II. Canvas** | Pływające karty + HUD tray | ✅ Ukończona |
| **20. Alpha 1.0** | Seed finalny, README, tag wersji | 🔲 Zaplanowana |
