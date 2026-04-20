# Changelog

Wszystkie istotne zmiany w projekcie. Format oparty na [Keep a Changelog](https://keepachangelog.com/).  
Wersjonowanie: [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`.

> **Konwencja wpisów:**  
> `Added` — nowa funkcjonalność  
> `Changed` — zmiana istniejącej funkcjonalności  
> `Fixed` — naprawa błędu  
> `Removed` — usunięta funkcjonalność  
> `Refactored` — zmiana wewnętrzna bez wpływu na zachowanie  
> `Deps` — aktualizacja zależności

---

## [Unreleased]

### Planned
- Faza 20: Alpha 1.0 — seed finalny, README, tag `v0.1.0-alpha`

### Added
- Workflow `.github/workflows/deploy-pages.yml` do automatycznego deploymentu na GitHub Pages po pushu do `main`
- Zestaw testów regresyjnych QoL dla paneli live sesji: `tests/modules/sessions/livePanels.qol.test.tsx` (SessionNpcPanel, SessionHudTray, SessionSearchPanel) z pokryciem akcji `dodaj / usuń / przypnij / odepnij`, statusów wątków i szybkiego podglądu

### Changed
- Routing aplikacji zmieniony z `BrowserRouter` na `HashRouter` dla zgodnosci z GitHub Pages
- Konfiguracja Vite otrzymala `base: '/MG-Helper/'` dla poprawnego ladowania assetow z Project Pages
- Domknięto pakiet QOL.1-5: ujednolicone słownictwo akcji sesja/scena, pełniejsze etykiety a11y (`title`, `aria-label`), poprawione mikrocopy empty state oraz spójność akcji w panelach live
- Potwierdzono finalny odbiór QoL kompletem bramek jakości: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`
- Uporządkowano dokumentację techniczną: usunięto duplikację treści z `requirements.md`, zdefiniowano pojedyncze źródła prawdy w `docs/README.md` i oznaczono `quickfix-technical-notes.md` jako archiwum historyczne

### Fixed
- Naprawiono konfigurację TypeScript dla bramki typecheck (`ignoreDeprecations: "5.0"`)
- Ustabilizowano asercję testu obcięcia opisu w `EntityCard`, aby poprawnie obsługiwała format wielokropka

---

## [0.2.0-dev] — 2026-04-10

Fazy 16–19 + Prerelease (SessionLive Command Center + Canvas Redesign) + System Overlayów.

### Added — Prerelease II: SessionLive Canvas Redesign

- `FloatingCard.tsx` — pływająca karta `position: fixed`; drag przez `setPointerCapture`; pozycja persystowana w `sessionStorage['fcard-pos-{id}']`; globalny `_zTop` counter dla z-index; header z `<GripVertical>`, linkiem zewnętrznym i X
- Refaktor `SceneCards.tsx` — `NpcSceneCard`, `ThreatSceneCard`, `LocationSceneCard` opakowują treść w `<FloatingCard>`; usunięto `SceneCardShell`; dodano `initialX?`, `initialY?`
- `SessionHudTray.tsx` — dolny HUD; pasek statusu (`h-9`, zawsze widoczny) + wysuwany tray (`max-h-[340px]`); 5 zakładek: Spotlight / Zagrożenia / Notatki / Oś czasu / Mapa NPC; stan persystowany w `sessionStorage['hud-tray-{sessionId}']`
- `SceneCenter.tsx` — przebudowany na puste płótno; pływające karty renderowane poza canvas divem; usunięto `ActiveThreatsPanel` i `QuickNotePanel` ze środka
- `SessionLive.tsx` — nowy layout `flex-col`: `SceneCenter` + `SessionHudTray`; usunięto trójkolumnowy layout z lewym `SessionTimeline` i prawym `SpotlightTracker`
- `SessionTimeline.tsx` — retheme z ciemnego navy (`navy-800/700`) na jasny surface (`surface-50/100`); kompatybilny z białym tray
- `useLiveSessionState.ts` — `MAX_OPEN_CARDS` zmieniony z 4 na 8; komentarz LRU zaktualizowany

### Added — Prerelease: SessionLive Command Center

- `SessionTimeline.tsx` — Discord-style oś czasu z wpisami `HH:mm + tekst`; autoscroll z freeze gdy scroll do góry; Enter=submit, Shift+Enter=nowa linia; edycja inline; `ConfirmDialog` przy usunięciu
- `LocationBreadcrumb.tsx` — wyświetla aktywną lokację (`📍 [nazwa]`); otwiera `LocationTreePopover` (AnchoredPanel)
- `ScenePillsRow.tsx` — chipy NPC, zagrożeń i wątków aktywnych w sesji; toggle kart przy kliknięciu; `+ Dodaj z kampanii` z wyszukiwarką; `+ Postać` quick-add inline
- `SceneCards.tsx` — `NpcSceneCard` (instinct/motivation/playStyle), `ThreatSceneCard` (zegar+TickProgress+ClueSection), `LocationSceneCard` (senses, DraggableNpcChip)
- `SpotlightTracker.tsx` — pełny rewrite; `waitTimer` + `totalActiveTimer` per gracz; MG i gracze wzajemnie się wykluczają; `setInterval(100ms)`; pauza (F5 recovery) przez `elapsed + (now - startedAt)`
- `SessionCleanup.tsx` — route `/sessions/:id/cleanup`; sekcje nieprzypisanych encji (Postacie bez lokacji, Lokacje bez rodzica, Wątki wiszące); akcje Przypisz/Otwórz/Usuń
- `SessionReport.tsx` — route `/sessions/:id/report`; layout A4-like; agregacja: postacie, lokacje, wątki, wskazówki odkryte, notatki; `@media print` CSS
- `useLiveSessionState.ts` — hook sessionStorage: `currentLocationId`, `openCardIds` (LRU), `spotlightState`
- `useSessionEvents.ts` — events (`EntityType: 'event'`) przez `appears_in → session`, sort po `data.timestamp`
- `LiveSessionIndicator.tsx` (shared) — pulsujący wskaźnik aktywnej sesji w `TopBar`; `localStorage['mg-live-session']`; klik nazwy = navigate; klik `⏸/▶` = toggle pauzy
- `NpcPreviewModal.tsx`, `LocationPreviewModal.tsx`, `ThreatPreviewModal.tsx` — read-only podglądy przez `Modal`
- `EntityType` rozszerzony o `'event'`
- Routing: `/sessions/:id/cleanup`, `/sessions/:id/report`, `RequireCampaign` wrapper

### Added — Faza OV: System Overlayów

- `Backdrop.tsx` (shared) — `fixed inset-0 z-40 bg-black/40`; portal przez `ReactDOM.createPortal`; `onClick → onClose`
- `Modal.tsx` (shared) — wycentrowany dialog nad Backdrop; focus trap (pierwszy focusable element); ESC = zamknij; size variants: sm (`w-80`), md (`w-[480px]`), lg (`w-[640px]`)
- `AnchoredPanel.tsx` (shared) — panel przy triggerze przez `getBoundingClientRect()`; placement: `bottom-start/end`, `top-start/end`; fallback viewport; portal
- `ConfirmDialog.tsx` zrefaktorowany do `<Modal size="sm">`
- `LocationBreadcrumb` i `ScenePillsRow` migrowały popovers do `AnchoredPanel`

### Added — Faza 19: Session Report & Print

- `SessionReport.tsx` — widok `/sessions/:id/report`; maks. `max-w-[800px]` białe tło niezależnie od dark mode; sekcje: postacie, lokacje, wątki, wskazówki odkryte, zegary, notatki
- Print CSS — `@media print` w `index.css`: ukrycie sidebar/topbar/przycisków, marginesy, page-break przed sekcjami; przycisk "Drukuj" (`window.print()`)
- `exportSessionMarkdown()` w `data-io/` — eksport raportu sesji jako `.md` z nagłówkami sekcji i listami
- Link "Raport" w `SessionDetail.tsx`; routing lazy `/sessions/:id/report`; `TopBar` ROUTE_LABELS

### Added — Faza 18: Żetonowe Notatki Sesji

- `EntityType: 'note'`; `RelationType: 'related_to'` (note → npc/location/thread/item/front/threat/faction/clue/session)
- `NoteData { content: string; sessionId: string; createdAt: string }` — addytywne w `data`, brak migracji Dexie
- `QuickNotePanel.tsx` — textarea (max 500 zn.) + chipy kontekstu nad inputem; multi-relacje `related_to` przy zapisie; live preview ostatnich 5 notatek
- `NoteCard.tsx`, `NoteList.tsx`/`NotesList.tsx`, `NoteDetail.tsx` — pełny moduł; lazy routes `/notes`, `/notes/:id`; sidebar ikona `StickyNote`
- `useNotes`, `useNotesBySession`, `useNotesFor` — hooki reaktywne
- Integracja `NotesList` w: `NpcDetail`, `LocationDetail`, `ThreadDetail`, `FrontDetail`, `FactionDetail`, `ItemDetail`; `SessionDetail` agreguje notatki z sesji
- `NpcContextPanel`, `ThreadTreePanel` — eksponują `selectedNpcIds`/`selectedThreadIds` przez `onSelectionChange` dla kontekstu notatki

### Added — Faza 17: Stabilizacja i UX Audit

- Audyt i uzupełnienie `EmptyState` we wszystkich listach z dedykowanymi komunikatami i CTA
- `ErrorBoundary` per route — osobne boundary dla każdego modułu; fallback z nazwą modułu i przyciskiem "Odśwież"
- Toast coverage — każdy CRUD w każdym module potwierdzony toastem (audyt brakujących wywołań)
- Focus management — `ConfirmDialog` i `RelationPicker` zwracają focus do triggera; formularze inline focusują pierwszy input po otwarciu
- Responsywność `SessionLive` — sidebar zwijany na `md:` breakpoint; główna kolumna pełnoekranowa na mobile

### Added — Faza 16: Wielokampanijność

- Izolowane bazy Dexie per kampania — `openCampaignDb(campaignId)` tworzy `mg-helper-{campaignId}`; `deleteCampaignDb` przez `Dexie.delete()`
- `CampaignContext.tsx` — `CampaignProvider` + `useCampaign()` hook; kontekst `{ db, campaignId, campaignName, setActiveCampaign }`; mounted w `App.tsx` wewnątrz `RouterProvider`
- `campaignStore.ts` — helpery localStorage: `listCampaigns`, `saveCampaign`, `deleteCampaignMeta`, `getActiveCampaignId`, `setActiveCampaignId`
- `migrateLegacyDb.ts` — jednorazowa auto-migracja istniejącej bazy `mg-helper` do kampanii "Moja kampania"; toast.info po migracji
- `CampaignList.tsx`, `CampaignCard.tsx`, `CampaignForm.tsx` — CRUD kampanii w `/campaigns`
- `CampaignSwitcher.tsx` — dropdown w `TopBar`; aktywna kampania + lista pozostałych + "Zarządzaj kampaniami"
- `RequireCampaign.tsx` — guard komponent: `Navigate to="/campaigns"` gdy brak aktywnej kampanii
- Refaktor ~30 hooków shared + modułowych — `const { db } = useCampaign()` zamiast singletona; usunięto eksport singletona
- Routing: `/campaigns` (lazy `CampaignList`); `RequireCampaign` wrapping wszystkich pozostałych routes

---

## [0.1.0-dev] — 2026-04-09

Wersja deweloperska po ukończeniu Faz 1–15 + F.3. Wszystkie 106 testów zielone, TypeScript clean.

### Added — Faza F.3: Drag & Drop
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` jako nowe zależności
- `DragHandle.tsx` (shared) — uchwyt przeciągania z ikoną `GripVertical`
- `SortableSessionCard.tsx` — sortowalna karta sesji z `useSortable`
- `SortableThreadCard.tsx` — sortowalna karta wątku
- `DraggableNpcChip.tsx` (shared) — przeciągalny chip NPC z `useDraggable`
- `DroppableLocationZone.tsx` (shared) — strefa upuszczania dla lokacji
- `DroppableSessionZone.tsx` (shared) — strefa upuszczania dla sesji
- Sortowanie listy sesji i wątków z persystencją `data.sortOrder` w JSONB
- Drag NPC między lokacjami — swap relacji `contains` w transakcji
- Drop NPC/item do aktywnej sesji — idempotentny `appears_in`
- `updateSortOrders(db, ids)` w `operations.ts` — atomowy zapis kolejności
- `reorderEntities` helper w `shared/utils/dnd.ts`

### Added — Faza 15: SessionLive Command Center
- `CollapsiblePanel.tsx` (shared) — panel zwijany z persystencją stanu w `localStorage`
- `LocationTreePanel.tsx` — rekurencyjne drzewo lokacji sesji z inline dodawaniem podlokacji
- `NpcContextPanel.tsx` — sekcje "W lokacji" i "W sesji" z przyciskami szybkiego dodawania
- `ThreadTreePanel.tsx` — drzewo wątków z hierarchią `derives_from`
- Przebudowa `SessionLive.tsx` — architektura sidebar z `CollapsiblePanel` stack
- Rozbudowa `SessionDetail.tsx` — 5-kolumnowy grid, wątki z kolorowymi kropkami, wskazówki
- Relacja `derives_from` (thread → thread) — nowy `RelationType`, reguły, etykiety
- CI pipeline — `.github/workflows/ci.yml` (typecheck + lint + test + build)

### Added — Faza 14: Timeline (oś czasu)
- `TimelinePage.tsx` — widok Gantt: sesje (X) × wątki (Y), czyste CSS grid
- `useTimeline()` — hook agregujący sesje + mapę `threadId → Set<sessionId>`
- Routing `/timeline`, wpis "Oś czasu" w Sidebar (ikona `CalendarDays`)

### Added — Faza 13: Moduł Wątki (Plot Threads)
- `ThreadData` — `color: string`, `status: 'active'|'completed'`; nowy `EntityType: 'thread'`
- Paleta 8 kolorów presetowych
- `ThreadForm`, `ThreadCard`, `ThreadList`, `ThreadDetail`
- Relacja `appears_in` rozszerzona o `'thread'` w `sourceTypes`
- Routing `/threads`, `/threads/:id`, wpis "Wątki" w Sidebar (ikona `Milestone`)

### Added — Faza 12: Moduł Wskazówki (Three Clue Rule)
- `ClueData` — `clueType`, `hint`, `discovered`; nowy `EntityType: 'clue'`
- Relacja `clues_for` — nowy `RelationType`, reguły `clue → threat|front`
- `ClueForm`, `ClueCard`, `ClueList`, `ClueDetail`
- `ClueSection.tsx` (shared) — reużywalny panel wskazówek z quick-add
- Integracja w `ThreatDetailPanel`, `FrontDetail`, `ActiveThreatsPanel` (SessionLive)
- Routing `/clues`, `/clues/:id`, wpis "Wskazówki" w Sidebar

### Added — Faza 11: Rozbudowa funkcjonalna
- `tickLabels?: string[]` i `isActive?: boolean` w `ClockData` — opisy tyknięć, zegar martwy
- `TickProgress.tsx` (shared) — aktualny + następny opis tick
- `ActiveThreatsPanel.tsx` — centrum zagrożeń z zegarami i wskazówkami w SessionLive
- `SpotlightTracker.tsx` — timer per gracz z kolorami 0–5–10–15 min
- `isPC?: boolean`, `playerName?: string` w `NpcData` — flaga postaci gracza
- `NpcList` zakładki: Wszyscy / Gracze / Postacie niezależne
- `playStyle: string` w `NpcData` — styl odgrywania postaci
- `goal: string` w `FrontData` — nadrzędny cel frontu
- Relacja `belongs_to` rozszerzona o `'location'` w `sourceTypes` (siedziby frakcji)

### Added — Fazy 7+–10: Dashboard, Graph, Import/Export, Polish
- `Dashboard.tsx` — ActiveFronts, RunningClocks, RecentChanges
- `GraphView.tsx` — react-force-graph-2d z filtrami i tooltipem
- Export/import pełnej bazy JSON (walidacja Zod, sanityzacja DOMPurify)
- `MarkdownExportButton.tsx` — eksport encji do pliku .md
- `SettingsPage.tsx` — `/settings` z import/export i danymi demo
- `OnboardingDialog.tsx` — dialog pierwszego uruchomienia z opcją załadowania seed
- Dark mode — `useDarkMode()` + przełącznik w Sidebar + localStorage
- Keyboard shortcut `Ctrl+K` — globalna wyszukiwarka (`useKeyboardShortcut`)
- Responsywny sidebar — hamburger menu na mobile (`lg:` breakpoint)
- Toast notifications (sonner) przy wszystkich operacjach CRUD

### Added — Fazy 1–7: Fundament i moduły domenowe
- Scaffold: Vite + React 19 + TypeScript 5 + TailwindCSS 4 + Dexie 4 + React Router 7
- Warstwa DB: `entities` + `relations`, `relationRules.ts`, generyczne CRUD z kaskadowym usuwaniem
- Shared hooks: `useEntityById`, `useEntitiesByType`, `useRelations`, `useContained`, `useAncestors`, `useSearch`, `useAutosave`
- Shared komponenty: `EntityCard`, `EntityForm`, `TagInput`, `RichTextEditor`, `RelationPicker`, `RelationList`, `ConfirmDialog`, `EmptyState`, `ErrorBoundary`
- Moduły: Clocks (SVG, tick/reset), NPC, Locations (hierarchia), Fronts, Threats, Sessions (Live), Factions, Items
- Vitest + fake-indexeddb + Testing Library — 106 testów
