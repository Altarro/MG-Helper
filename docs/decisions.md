# MG Helper — Decyzje projektowe (ADR)

Rejestr kluczowych decyzji architektonicznych i projektowych.  
Format: kontekst → decyzja → konsekwencje → alternatywy odrzucone.

> **Kiedy aktualizować**: przy każdej decyzji projektowej, która może być kwestionowana w przyszłości lub której uzasadnienie nie jest oczywiste z kodu.

---

## ADR-001 — Brak backendu, 100% offline (IndexedDB)

**Data:** 2026 (Faza 1)  
**Status:** Aktywna

### Kontekst
Aplikacja dla jednego użytkownika (GM). Dane są prywatne, nie wymagają synchronizacji między urządzeniami ani współdzielenia w czasie rzeczywistym.

### Decyzja
Brak serwera. Wszystkie dane persystowane lokalnie w IndexedDB przez Dexie.js. Eksport/import przez JSON.

### Konsekwencje
- ✅ Zero kosztów hostingu, zero latencji sieciowej
- ✅ Działa po zamknięciu laptopa, bez internetu
- ✅ Dane GM-a nigdy nie opuszczają urządzenia (prywatność)
- ⚠️ Brak synchronizacji między urządzeniami (akceptowalne — jedna maszyna per GM)
- ⚠️ Dane istnieją tylko w jednej przeglądarce — wymaga ręcznego eksportu jako backup

### Alternatywy odrzucone
- **Supabase / Firebase**: zbędna zależność od zewnętrznej usługi, kwestie prywatności danych kampanii
- **localStorage**: brak indeksowania, limit ~5 MB, brak transakcji
- **SQLite via WASM**: dobry wybór, ale Dexie+IDB ma lepsze wsparcie ekosystemu React

---

## ADR-002 — Jedna polimorficzna tabela `entities` (JSONB pattern)

**Data:** 2026 (Faza 2)  
**Status:** Aktywna

### Kontekst
Projekt ma 10 typów encji (npc, location, front, threat, clock, session, faction, item, clue, thread), każdy z unikalnymi polami domenowymi. Dexie nie obsługuje ALTER TABLE — każda zmiana schematu wymaga bumpu wersji i funkcji `upgrade()`.

### Decyzja
Jedna tabela `entities` z dyskryminatorem `type`. Pola wspólne (`id`, `name`, `description`, `tags`, `createdAt`, `updatedAt`) w korzeniu obiektu. Pola domenowe w `data: Record<string, unknown>` — przechowywane jako JSONB w IndexedDB.

```typescript
// Schemat Dexie — nigdy nie zmienia się przy dodawaniu nowych pól
db.version(1).stores({
  entities: 'id, type, name, *tags, createdAt, updatedAt',
  relations: 'id, sourceId, targetId, type',
});
```

### Konsekwencje
- ✅ Nowe pola per EntityType (np. `tickLabels`, `isPC`, `sortOrder`) nie wymagają migracji Dexie
- ✅ Jeden hook `useEntitiesByType(type)` obsługuje wszystkie moduły
- ✅ Eksport/import JSON jest trywialny — jedna `toArray()` na każdą tabelę
- ⚠️ Brak type-safety na poziomie DB — wymuszana przez TypeScript i Zod (walidacja przy zapisie/imporcie)
- ⚠️ Brak indeksów na polach domenowych (np. nie można efektywnie zapytać "wszystkie zagrożenia z `impulse = X`") — akceptowalne przy <10 000 encji

### Alternatywy odrzucone
- **Osobna tabela per EntityType**: N tabel × M migracji = eksplozja złożoności; relacje między typami stają się trudne
- **Normalizacja pól domenowych jako osobne kolumny**: wymaga migracji przy każdym nowym polu

---

## ADR-003 — `createdAt` / `updatedAt` jako string ISO 8601 (nie number)

**Data:** 2026 (Faza 2)  
**Status:** Aktywna

### Kontekst
Przy projektowaniu schematu bazy i typów TypeScript pojawiło się pytanie: Unix timestamp (`number`) czy string ISO 8601 (`string`)?

### Decyzja
```typescript
createdAt: string  // "2026-04-09T20:15:00.000Z"
updatedAt: string  // ISO 8601, zawsze UTC
```

### Uzasadnienie
- **Czytelność eksportu JSON**: plik eksportu jest czytelny dla człowieka bez konwersji
- **Kompatybilność**: ISO 8601 jest standardem wymiany danych — import do innych narzędzi (Obsidian, Notion) nie wymaga transformacji
- **Indeks Dexie**: Dexie indeksuje stringi leksykograficznie — sortowanie po `createdAt: string` działa poprawnie dla ISO 8601 (format `YYYY-MM-DDTHH:mm:ss.sssZ` jest leksykograficznie posortowany chronologicznie)
- **date-fns**: biblioteka używana w projekcie operuje natywnie na `string` i `Date`, konwersja jest trywialna

### Alternatywy odrzucone
- **Unix timestamp (`number`)**: wymaga formatowania przy każdym wyświetleniu, nieczytelny w JSON eksporcie

---

## ADR-004 — Relacje jako osobna tabela (nie embedded w encji)

**Data:** 2026 (Faza 2)  
**Status:** Aktywna

### Kontekst
Powiązania między encjami można modelować jako pole w encji (np. `npc.locationId`) lub jako osobną tabelę `relations`.

### Decyzja
Osobna tabela `relations` z typowanymi relacjami i matrycą dozwolonych kombinacji (`relationRules.ts`).

```typescript
interface Relation {
  id: string
  sourceId: string
  targetId: string
  type: RelationType  // 'contains' | 'belongs_to' | 'tracks' | ...
  label?: string
  createdAt: string
}
```

### Konsekwencje
- ✅ Jedno źródło prawdy dla wszystkich powiązań — graf relacji z jednego query
- ✅ Nowe typy relacji bez migracji schematu (addytywne w `RelationType`)
- ✅ Kaskadowe usuwanie encji → usunięcie wszystkich jej relacji w jednej transakcji
- ✅ `react-force-graph-2d` dostaje `{ nodes, links }` bezpośrednio z dwóch `toArray()`
- ⚠️ Dwukierunkowe query (`sourceId = X OR targetId = X`) — dwa indeksy, `useLiveQuery` z `.or()`

### Alternatywy odrzucone
- **Embedded FKs w encji** (`npc.factionId`, `threat.frontId`): nie obsługuje wielu relacji tego samego typu, relacje n:m wymagają tablicy ID, brak jednolitego grafu

---

## ADR-005 — Singleton `db` (Fazy 1–15) → `CampaignContext` (Faza 16)

**Data:** 2026 (Faza 2 / Faza 16)  
**Status:** Aktywna (migracja ukończona w Fazie 16)

### Kontekst — stan obecny (Fazy 1–15)
Instancja Dexie eksportowana jako singleton z `shared/db/database.ts`. Wszystkie hooki importują ją bezpośrednio.

### Dlaczego singleton był właściwy na początek
- Zero konfiguracji, zero boilerplate
- Rozwiązania z kontekstem React dla jednej bazy to over-engineering
- Priorytetem było dostarczenie funkcjonalności, nie elastyczności

### Decyzja na Fazę 16
Zastąpienie singletona przez `CampaignContext` — każda kampania to osobna instancja Dexie (`mg-helper-{campaignId}`). Hooki pobierają `db` przez `useCampaign()` zamiast importu bezpośredniego.

### Dlaczego nie wcześniej
Refaktor ~30 hooków i ~6 komponentów wymaga czasu. Wartość funkcjonalna (wielokampanijność) nie istniała przed Fazą 16 — wprowadzanie złożoności bez value byłoby przedwczesną optymalizacją.

### Wynik migracji
- `openCampaignDb(campaignId)` — fabryka instancji Dexie: `mg-helper-{campaignId}`
- `deleteCampaignDb(campaignId)` — `Dexie.delete('mg-helper-{campaignId}')`
- `CampaignProvider` w `App.tsx` (wewnątrz `RouterProvider`) — inicjalizuje DB przy zmiane kampanii
- Singleton `db` usunięty z `database.ts`; wszystkie hooki korzystają z `const { db } = useCampaign()`
- `migrateLegacyDb.ts` — jednorazowa migracja istniejącej bazy `mg-helper` → kampania `'legacy'`
- `RequireCampaign.tsx` — guard: `<Navigate to="/campaigns">` gdy brak aktywnej kampanii

---

## ADR-006 — `@dnd-kit` zamiast innych bibliotek drag & drop

**Data:** 2026 (Faza F.3)  
**Status:** Aktywna

### Kontekst
Potrzeba drag & drop do sortowania sesji/wątków i przenoszenia NPC między lokacjami. Dostępne alternatywy: `react-beautiful-dnd`, `dnd-kit`, `pragmatic-drag-and-drop` (Atlassian), natywny HTML5 DnD API.

### Decyzja
`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`

### Uzasadnienie
- **Aktywne wsparcie**: `react-beautiful-dnd` jest porzucony przez Atlassian (deprecated 2023)
- **React 19 compatible**: `@dnd-kit` testowane z React 18/19, bez legacy context API
- **Modularność**: `core` + `sortable` osobno — nie płacimy za to czego nie używamy
- **Dostępność**: wbudowane wsparcie dla nawigacji klawiaturą i screen readerów
- **TypeScript**: natywne typy, bez `@types/...`

### Alternatywy odrzucone
- **`react-beautiful-dnd`**: deprecated, problemy z React 18 Strict Mode
- **HTML5 DnD API**: brak wsparcia dla touch, brak `DragOverlay`, trudne do dostępności
- **`pragmatic-drag-and-drop`**: frameworkowo-agnostyczny, nadmiarowy dla tego projektu

---

## ADR-007 — Feature-based struktura katalogów (`src/modules/*`)

**Data:** 2026 (Faza 1)  
**Status:** Aktywna

### Kontekst
Dwa popularne podejścia do struktury frontendu: **per-typ** (`components/`, `hooks/`, `pages/`) vs **per-ficzer** (`modules/npcs/`, `modules/locations/`).

### Decyzja
Struktura per-ficzer: każdy moduł domenowy w `src/modules/{type}/` z własnymi `components/`, `hooks/`, `types.ts`, `index.ts`.

### Konsekwencje
- ✅ Moduł można usunąć przez usunięcie jednego folderu bez efektów ubocznych
- ✅ Wszystko co związane z NPC jest w `modules/npcs/` — kontekst beż skanowania drzewa
- ✅ Naturalny boundary dla `ErrorBoundary` per moduł
- ⚠️ Wspólne komponenty muszą być w `shared/` — wymaga świadomej decyzji przy każdym nowym komponencie: moduł czy shared?

### Zasada kwalifikacji do `shared/`
Komponent/hook trafia do `shared/` jeśli używany jest przez **co najmniej dwa różne moduły**. W przeciwnym razie zostaje w module.

### Alternatywy odrzucone
- **Per-typ**: przy 16 modułach i ~10 typach artefaktów (`NpcCard`, `LocationForm`, `FrontDetail`, ...) folder `components/` miałby 80+ plików bez kontekstu

---

## ADR-008 — Tiptap (ProseMirror) jako rich-text editor

**Data:** 2026 (Faza 2)  
**Status:** Aktywna

### Kontekst
Opisy encji wymagają formatowania (bold, italic, nagłówki, listy). Dane muszą być składowane jako HTML (sanityzowany przez DOMPurify) i możliwe do wyeksportowania do Markdown.

### Decyzja
Tiptap 2 z rozszerzeniami `StarterKit` + `Link`. Output: sanityzowany HTML.

### Uzasadnienie
- **Kontrola schematu**: ProseMirror pozwala precyzyjnie ograniczyć dozwolone elementy
- **Headless**: brak narzuconych stylów CSS — integracja z TailwindCSS
- **Ekosystem**: `@tiptap/extension-*` pokrywa 100% potrzeb (link, listy, nagłówki)
- **DOMPurify**: dedykowana sanityzacja HTML przed zapisem do IndexedDB i przy imporcie

### Konwencja zapisu
HTML z Tiptap jest sanityzowany przez `DOMPurify.sanitize()` przed każdym `addEntity`/`updateEntity`. Import JSON sanityzuje pola `description` identycznie — ochrona przed XSS.

### Alternatywy odrzucone
- **Markdown editor (CodeMirror)**: wymagałby parsowania MD → HTML przy wyświetleniu; trudniejszy DnD dla list
- **Quill**: przestarzały API, problemy z React 18+
- **Slate**: zbyt niskopoziomowy, duży boilerplate dla standardowych funkcji
