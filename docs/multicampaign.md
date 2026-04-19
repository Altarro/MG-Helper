# MG Helper — Architektura wielokampanijności (Faza 16)

## Zasada ogólna
Każda kampania to **osobna baza Dexie** (`mg-helper-{campaignId}`). Metadane kampanii trzymane w `localStorage`. Aktywna baza dostarczana przez React Context — żaden komponent ani hook NIE importuje singletona `db` bezpośrednio.

## Kluczowe pliki

| Plik | Rola |
|---|---|
| `src/shared/types/campaign.ts` | `CampaignMeta { id, name, description, createdAt }` |
| `src/shared/db/campaignStore.ts` | Helpery localStorage: `listCampaigns`, `saveCampaign`, `deleteCampaignMeta`, `getActiveCampaignId`, `setActiveCampaignId` — klucze: `mg-campaigns`, `mg-active-campaign` |
| `src/shared/db/database.ts` | `openCampaignDb(id, customName?)` — fabryka z cache (`Map`); db name = `mg-helper-${id}`; `deleteCampaignDb(id)`; singleton `db = openCampaignDb('__legacy__', 'mg-helper')` — TYLKO do testów/seed, deprecated |
| `src/shared/db/CampaignContext.tsx` | `CampaignProvider` + `useCampaign()` — dostarcza `{ db, campaignId, campaignName, setActiveCampaign }` |
| `src/shared/db/migrateLegacyDb.ts` | `migrateLegacyDb(): Promise<bool>` — one-shot: jeśli istnieje `mg-helper` i brak kampanii w localStorage → tworzy `CampaignMeta { id: 'legacy' }`, reuse tej samej bazy przez `openCampaignDb('legacy', 'mg-helper')` |
| `src/app/RequireCampaign.tsx` | Guard: jeśli brak ważnej aktywnej kampanii → redirect `/campaigns` |
| `src/modules/campaigns/` | `CampaignCard`, `CampaignForm`, `CampaignList` (strona `/campaigns`), `CampaignSwitcher` (w TopBar) |

## Wzorzec użycia w komponentach i hookach

```ts
// Hook / komponent używający DB:
const { db } = useCampaign();
const items = useLiveQuery(() => db.entities.where('type').equals('npc').toArray(), [db]);

// Operacje CRUD — db jako PIERWSZY parametr:
await addEntity(db, { type: 'npc', name: '...', ... });
await updateEntity(db, id, patch);
await deleteEntity(db, id);
await addRelation(db, { sourceId, targetId, type });
```

## CampaignProvider — inicjalizacja

- Stan `campaignId` i `db` inicjowany **synchronicznie** z localStorage przy mountowaniu (lazy `useState`)
- `useEffect` uruchamia `migrateLegacyDb()` asynchronicznie; jeśli migracja → toast + update state
- **NIE ma** `if (!ready) return null` — dzieci renderują się natychmiast z właściwym db

## Routing

```
/campaigns          → CampaignList (niezabezpieczone)
/*                  → <RequireCampaign> wraps all other routes
```

## Testy — wzorzec

```ts
// Każdy test-file używający hooków/komponentów z useCampaign:
const TEST_ID = '__my-module-test__';
const db = openCampaignDb(TEST_ID);           // ta sama instancja co provider
setActiveCampaignId(TEST_ID);
saveCampaign({ id: TEST_ID, name: 'Test', description: '', createdAt: new Date().toISOString() });

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CampaignProvider, null, children);
}

// renderHook z wrapper:
const { result } = renderHook(() => useMyHook(), { wrapper });

// render z wrapper:
renderWithProviders(<MyComponent />);  // wrapper jest w renderWithProviders.tsx
```

`renderWithProviders` (`tests/helpers/renderWithProviders.tsx`) zawiera już `CampaignProvider` z kampanią `'__legacy__'`.

## Izolacja danych

`openCampaignDb('a')` i `openCampaignDb('b')` to dwie osobne instancje Dexie z osobnymi IndexedDB — dane kampanii A nigdy nie są widoczne w kampanii B.

## Migracja danych legacy

Użytkownicy z danymi sprzed Fazy 16 (baza `mg-helper` bez suffixu):

1. `migrateLegacyDb()` wykrywa bazę, tworzy kampanię `id='legacy'`
2. `openCampaignDb('legacy', 'mg-helper')` — `customName` wymusza reuse tej samej bazy
3. Dane NIE są kopiowane — baza jest reużywana przez alias campaign id
