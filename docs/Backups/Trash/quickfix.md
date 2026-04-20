# MG Helper - Quick Fix Plan

## Cel dokumentu

Ten dokument opisuje plan naprawczy i przygotowanie projektu `MG Helper` do bezpiecznego wdrozenia.
Zakres nie ogranicza sie do pojedynczych bugow. Plan obejmuje:

1. ustabilizowanie bazowej jakosci projektu,
2. ujednolicenie modelu danych i kontraktow aplikacji,
3. uszczelnienie integralnosci relacji oraz importu/eksportu,
4. przygotowanie warstwy zapytan i UI na duze kampanie,
5. domkniecie obszarow release readiness, CI i dokumentacji.

Dokument jest przygotowany tak, aby mogl byc uzyty jako plan wykonawczy dla zespolu produktowo-technicznego przed wdrozeniem produkcyjnym.

## Zasady prowadzenia prac

1. Najpierw stabilizacja i kontrakty danych, dopiero potem optymalizacje i polish.
2. Kazda wieksza grupa zmian musi konczyc sie przechodzacym `typecheck`, `lint`, `test` i `build`.
3. Nie wolno laczyc zmian modelu danych z duzym refaktorem UI w jednym kroku.
4. Kazda zmiana kontraktu import/export musi miec plan kompatybilnosci wstecznej.
5. Wszystkie zmiany powinny byc domykane testami regresyjnymi i kryteriami odbioru.

## Kolejnosc realizacji

### Faza 0 - Stabilizacja wejscia

Cel:
Przywrocic projekt do stanu, w ktorym wszystkie bramki jakosci sa zielone i mozna bezpiecznie rozpoczac wieksze zmiany.

Kroki:

- [x] Naprawic aktualne bledy lintu.
- [x] Zamknac warningi, ktore wskazuja na realne ryzyka utrzymaniowe.
- [x] Uporzadkowac testy tak, aby nie emitowaly ostrzezen `act(...)`.
- [x] Potwierdzic finalnie:
  `pnpm typecheck`
  `pnpm lint`
  `pnpm test`
  `pnpm build`

Pliki do pierwszego przegladu:

- `src/modules/sessions/components/SessionHudTray.tsx`
- `src/shared/hooks/useAutosave.ts`
- `tests/shared/components/components.test.tsx`
- `tests/modules/sessions/spotlightTracker.test.tsx`
- `tests/shared/db/campaignIsolation.test.ts`
- `tests/shared/db/migrateLegacyDb.test.ts`

Definition of Done:

- CI przechodzi lokalnie i na GitHub Actions.
- Repo nie ma znanych warningow, ktore ukrywaja realne problemy.
- Zespol moze zaczac dalsze refaktory bez walki z niestabilnym baseline.

---

## Grupa 1 - Ujednolicenie modelu danych i typowania domenowego

### Problem

Projekt ma dzisiaj kilka warstw, ktore opisuja te same dane w rozny sposob:

- typy runtime per modul,
- schemy walidacji formularzy i importu,
- dane seed,
- dane zapisane w `entity.data`,
- pomocnicze casty w komponentach.

To powoduje:

- rozjazdy miedzy walidacja a runtime,
- koniecznosc czestego uzywania `as unknown as`,
- ukryte pola w `data`,
- wyzsze ryzyko cichych regresji przy importach i refaktorach.

### Cel

Zbudowac jeden, spojny kontrakt danych dla wszystkich typow encji.

### Plan krok po kroku

- [x] Zrobic audyt wszystkich encji i ich pol domenowych.
  Zakres:
  - `npc`
  - `location`
  - `front`
  - `threat`
  - `clock`
  - `session`
  - `faction`
  - `item`
  - `clue`
  - `thread`
  - `note`
  - `event`

- [x] Dla kazdego typu encji spisac docelowy kontrakt `data`.
  Przyklad:
  - `FactionData.resources` ma byc tablica stringow lub pojedynczym stringiem, ale decyzja musi byc jedna.
  - `ItemData.properties` ma byc tablica stringow lub pojedynczym stringiem, ale decyzja musi byc jedna.
  - `SessionData.sortOrder` musi byc albo oficjalna czescia kontraktu, albo zostac wyjete z `data`.
  - `LocationData.parentId` musi byc albo wspierane, albo usuniete jako duplikat relacji `contains`.

- [x] Wybrac docelowy model techniczny.
  Rekomendacja:
  - pozostawic `Entity` jako typ bazowy,
  - dodac silnie typowane helpery/selectory per `EntityType`,
  - zbudowac mapowanie `EntityType -> DataSchema`,
  - ograniczyc casty bez prob przepisywania calej aplikacji na raz.

- [x] Ujednolicic warstwe typow.
  Pliki kluczowe:
  - `src/shared/types/entity.ts`
  - `src/modules/*/types.ts`
  - `src/shared/utils/validation.ts`

- [x] Ujednolicic walidacje formularzy i importu.
  Kazdy schemat Zod musi odpowiadac runtime type.

- [x] Usunac pola "poloficjalne".
  Szczegolnie:
  - `sortOrder`
  - `parentId`
  - pola tymczasowe i draftowe

- [x] Wprowadzic helpery domenowe zamiast castow w komponentach.
  Przyklady:
  - `getThreadData(entity)`
  - `getClockData(entity)`
  - `getSessionSortOrder(entity)`
  - `isDraftLocation(entity)`

- [x] Zastapic miejsca, gdzie dzis jest `as unknown as` lub `as never`.
  To powinno byc mierzalne i mozliwe do sledzenia grepem.

### Kolejnosc wykonania wewnatrz grupy

- [x] Najpierw typy i schemy.
- [x] Potem helpery dostepu do danych.
- [x] Potem wymiana castow w najwazniejszych modulach:
  - sessions
  - locations
  - fronts/clocks
  - items/factions
- [x] Na koncu seed i import/export.

### Ryzyka

- Za szeroki refaktor moze rozbic wiele modulow naraz.
- Zmiana kontraktow bez migracji moze popsuc stare backupy.

### Mitigacja

- Robic to warstwowo.
- Najpierw dodawac kompatybilnosc, potem usuwac stary wariant.
- Wprowadzic testy kontraktowe dla kazdego typu encji.

### Definition of Done

- `validation.ts`, typy modulowe i seed sa zgodne.
- Liczba `as unknown as` w kodzie spada do minimum uzasadnionego architektonicznie.
- Nie ma juz ukrytych pol, ktore istnieja tylko "bo sa uzywane w kilku miejscach".

---

## Grupa 2 - Integralnosc relacji i twarde kontrakty import/export

### Problem

Relacje sa sercem aplikacji, ale dzisiaj system nie zabezpiecza ich wystarczajaco mocno.
Aktualne ryzyka:

- mozliwosc duplikowania relacji,
- brak pelnej walidacji importowanych relacji wzgledem `relationRules`,
- brak wersjonowania formatu backupu,
- import nadpisuje dane, ale nie daje mozliwosci bezpiecznej ewolucji formatu.

### Cel

Zrobic z relacji i backupow warstwe, ktora jest przewidywalna, migracyjna i odporna na uszkodzenia danych.

### Plan krok po kroku

- [x] Zdefiniowac polityke integralnosci relacji.
  Odpowiedziec jawnie na pytania:
  - czy relacja `(sourceId, targetId, type, label)` moze wystapic wielokrotnie?
  - czy `related_to` ma byc symetryczne logicznie, czy tylko dwukierunkowo odczytywane?
  - czy `contains` moze miec wielu rodzicow?
  - czy `appears_in` moze sie duplikowac?

- [x] Dodac zabezpieczenie przed duplikatami relacji.
  Opcje:
  - indeks logiczny w kodzie,
  - unikalny klucz pochodny,
  - twardy check przed `db.relations.add`.

- [x] Rozszerzyc importer o walidacje relacji wzgledem `relationRules`.
  Import nie moze przyjac danych, ktorych UI i runtime nie umieja potem poprawnie obsluzyc.

- [x] Dodac wersjonowanie backupu.
  Docelowy payload powinien zawierac:
  - `formatVersion`
  - `appVersion`
  - `exportedAt`
  - `campaignMeta`
  - `entities`
  - `relations`

- [x] Dodac warstwe migracji backupow.
  Minimalny plan:
  - `v1 -> v2`
  - adaptery w importerze
  - czytelne komunikaty bledu dla nieobslugiwanych wersji

- [x] Rozdzielic import "replace all" od przyszlego importu "merge".
  Na teraz wdrozyc tylko twardo bezpieczny `replace all`, ale przygotowac kontrakt pod `merge`.

- [x] Dodac testy kontraktowe import/export.
  Zakres:
  - roundtrip
  - nieistniejace referencje
  - niedozwolone relacje
  - stara wersja backupu
  - przyszla wersja backupu
  - duplikaty relacji

### Pliki do objecia pracami

- `src/shared/db/relationRules.ts`
- `src/shared/db/operations.ts`
- `src/shared/db/schema.ts`
- `src/shared/utils/importJson.ts`
- `src/shared/utils/exportJson.ts`
- `tests/modules/settings/import-export.test.ts`

### Definition of Done

- Backup ma wersje formatu.
- Import odrzuca dane niespojne logicznie.
- System nie dopuszcza do prostych duplikatow relacji.
- Backup staje sie bezpiecznym kontraktem produktu, a nie tylko zrzutem stanu IndexedDB.

---

## Grupa 3 - Jedno zrodlo prawdy dla hierarchii i sortowania

### Problem

W kilku miejscach aplikacja przechowuje ten sam sens biznesowy na dwa sposoby.
Najwazniejsze przypadki:

- hierarchia lokacji przez `contains` oraz przez `data.parentId`,
- kolejnosc sesji przez `data.sortOrder`, ale bez pelnego kontraktu typu,
- elementy "draft" i pomocnicze stany zapisane czesciowo jako dane domenowe, czesciowo jako logika UI.

### Cel

Usunac duplikaty semantyczne i zostawic jedna, oficjalna reprezentacje dla kazdej reguly domenowej.

### Plan krok po kroku

- [x] Podjac decyzje architektoniczna:
  - hierarchia lokacji jest oparta tylko o relacje `contains`, albo
  - jest oparta o `parentId`, a relacje sa tylko pochodne.

- [x] Rekomendacja dla tego projektu:
  - zrodlem prawdy zostaja relacje `contains`,
  - `parentId` jest usuwane z kontraktu lub traktowane jako pole wyliczalne tylko migracyjnie.

- [x] Uporzadkowac wszystkie miejsca tworzenia lokacji i podlokacji.
  Nowa lokacja ma byc tworzona zgodnie z jedna zasada w:
  - listach,
  - detailach,
  - seedzie,
  - imporcie.

- [x] Wydzielic oficjalna polityke sortowania sesji i watkow.
  Trzeba zdecydowac:
  - czy `sortOrder` jest polem domenowym,
  - czy jest technicznym metadata polem wspoldzielonym przez wiele typow encji.

- [x] Jesli `sortOrder` zostaje:
  - wpisac go jawnie do kontraktow,
  - pokryc walidacja,
  - dodac helpery odczytu i zapisu.

- [x] Dodac testy regresyjne:
  - tworzenie podlokacji,
  - przemieszczanie NPC miedzy lokacjami,
  - sortowanie sesji po dnd,
  - roundtrip backupu z zachowaniem kolejnosci.

### Definition of Done

- Dla hierarchii i sortowania nie ma dwoch rownoleglych reprezentacji o tej samej roli.
- Seed, UI i runtime zapisuje dane w ten sam sposob.
- Kazdy nowy deweloper umie odpowiedziec w 30 sekund: "gdzie jest zrodlo prawdy dla hierarchii i kolejnosci?".

---

## Grupa 4 - Refaktor warstwy zapytan i przygotowanie na duze kampanie

### Problem

Aktualna aplikacja jest funkcjonalna, ale wiele ekranow pobiera cala tabele encji lub relacji i filtruje dane po stronie UI.
To jest akceptowalne na malej bazie, ale slabe przed wdrozeniem na bardziej rozbudowane kampanie.

Najbardziej narazone obszary:

- wyszukiwarka,
- graf relacji,
- dashboard,
- Session Live,
- panele w sesji i cleanup/report.

### Cel

Przeniesc projekt z poziomu "dziala dobrze na alpha danych" na poziom "skaluje sie rozsadnie dla duzej kampanii".

### Plan krok po kroku

1. Zrobic audyt zapytan Dexie.
   Oznaczyc:
   - pelne skany `toArray()`,
   - kosztowne `filter(...)` po stronie JS,
   - wielokrotne zapytania o te same relacje w tym samym komponencie.

2. Wydzielic selector/query layer dla najwazniejszych domen.
   Przyklad:
   - `getSessionThreads(sessionId)`
   - `getSessionNpcs(sessionId)`
   - `getContainedEntities(locationId, type?)`
   - `getGraphData(filters)`
   - `searchEntities(query, options)`

3. Zmienic komponenty, aby korzystaly z wyspecjalizowanych hookow zamiast skladac zapytania ad hoc.
   Dotyczy szczegolnie modulu sessions.

4. Zweryfikowac indeksy IndexedDB.
   Obecne indeksy sa poprawne dla MVP, ale trzeba sprawdzic czy wystarcza dla:
   - szybkiego odczytu po `type`,
   - `updatedAt`,
   - relacji po `sourceId`, `targetId`, `type`,
   - potencjalnych lookupow kompozytowych.

5. Zoptymalizowac wyszukiwarke.
   Kratka droga:
   - pozostawic lokalna wyszukiwarke,
   - uniknac pelnego skanu przy kazdym znaku,
   - rozwazyc prosty indeks pomocniczy lub cache tekstowy.

6. Zoptymalizowac graf.
   Plan minimalny:
   - lazy load danych,
   - twardsze filtrowanie przed zbudowaniem grafu,
   - opcjonalny limit poczatkowego zestawu wezlow,
   - progresywne dosylanie lub przebudowa po filtrach.

7. Ograniczyc redundancje zapytan w Session Live.
   To jest najciezszy modul i powinien miec:
   - wspolne hooki danych sesyjnych,
   - mniej logiki DB bezposrednio w komponentach,
   - czytelniejszy podzial: query -> transform -> render.

8. Dodac wydajnosciowe testy smoke.
   Nie microbenchmarki, tylko praktyczne kontrole:
   - seed 1000+ encji,
   - search response,
   - otwarcie grafu,
   - Session Live bez "freeze".

### Definition of Done

- Najciezsze ekrany nie opieraja sie na pelnych skanach przy kazdej reaktywnej zmianie.
- Session Live ma mniej lokalnych zapytan i czytelniejsza architekture danych.
- Projekt ma jasna liste query hot spots oraz ich rozwiazania.

---

## Grupa 5 - Uporzadkowanie Session Live jako krytycznego modulu produktu

### Problem

Modul Session Live jest produkcyjnie najbardziej wartosciowy, ale tez najbardziej zlozony.
To tutaj najszybciej pojawia sie:

- duza ilosc logiki UI i logiki danych w jednym miejscu,
- ryzyko regresji przy rozbudowie,
- ryzyko spadkow wydajnosci,
- niespojnosci overlayow, modali i paneli.

### Cel

Uczynic Session Live stabilnym, przewidywalnym i latwym do rozwijania bez rozsadzania calego modulu.

### Plan krok po kroku

1. Rozdzielic Session Live na trzy warstwy:
   - warstwa danych i selectorow,
   - warstwa orchestracji interakcji,
   - warstwa czysto prezentacyjna.

2. Wydzielic query hooki dla:
   - aktualnej lokacji,
   - NPC w sesji,
   - watkow sesji,
   - zagrozen i zegarow,
   - draft scene.

3. Wydzielic command layer dla akcji mutujacych:
   - dodaj do sesji,
   - usun z sesji,
   - przenies NPC do lokacji,
   - zakoncz sesje,
   - ustaw aktywna lokacje,
   - zmien status watku.

4. Przepisac najbardziej "geste" komponenty tak, aby nie zawieraly jednoczesnie:
   - pobierania danych,
   - transformacji,
   - side effectow,
   - rozbudowanego renderu.

5. Ujednolicic stan sesji live.
   Rozdzielic:
   - co jest stanem trwalym per sesja,
   - co jest stanem tymczasowym per przegladarka,
   - co jest stanem globalnym produktu.

6. Doprecyzowac kontrakt `mg-live-session`.
   Marker localStorage powinien byc jawnie opisany i zgodny z polityka wielokampanijnosci.

7. Dodac testy scenariuszowe modulu live.
   Minimalny zestaw:
   - rozpoczecie sesji live,
   - przenoszenie NPC,
   - zamkniecie sesji,
   - odtworzenie stanu po refreshu,
   - zachowanie przy brakujacych lub uszkodzonych danych w sessionStorage.

### Definition of Done

- Session Live ma mniejsza zlozonosc lokalna.
- Dane i mutacje sa wydzielone z renderu.
- Modul nadaje sie do dalszej rozbudowy bez "kolejnej warstwy ifow".

---

## Grupa 6 - Warstwa prezentacji i poprawki GUI

Tag roboczy:
- standaryzacja UI
- overlaye i dostepnosc
- poprawki GUI i polish warstwy prezentacji

### Problem

Projekt ma juz kilka dobrych prymitywow UI, ale obok nich nadal istnieja recznie skladane overlaye i rozne zachowania focus/close/backdrop.

To prowadzi do:

- niespójnego UX,
- roznego zachowania ESC i backdrop close,
- slabszej dostepnosci,
- dublowania kodu.

### Cel

Zamknac UI w kilku przewidywalnych prymitywach i przy okazji poprawic dostepnosc aplikacji.

### Plan krok po kroku

1. Spisac wszystkie obecne rodzaje overlayow:
   - modal,
   - confirm dialog,
   - anchored panel,
   - picker overlay,
   - onboarding,
   - custom danger zone dialog,
   - podglady NPC/lokacji/zagrozen.

2. Wybrac docelowy zestaw prymitywow:
   - `Modal`
   - `ConfirmDialog`
   - `AnchoredPanel`
   - ewentualnie `Drawer` / `HudOverlay`

3. Wyeliminowac recznie implementowane overlaye tam, gdzie nie ma uzasadnienia.

4. Dodac minimalny standard dostepnosci:
   - focus management,
   - aria labels,
   - ESC close,
   - trap focus dla modali,
   - przywracanie focusu po zamknieciu.

5. Ujednolicic badge, etykiety typow encji i meta kolorystyczne.
   Cel:
   - brak duplikatow labeli typow encji,
   - jedno miejsce dla kolorow i nazw.

6. Ujednolicic reakcje na stany specjalne:
   - loading,
   - empty,
   - not found,
   - soft error,
   - hard error.

7. Zrewidowac search UX.
   Szczegolnie:
   - czy wyszukiwarka ma byc controlled,
   - czy `Ctrl+K` zawsze dziala poprawnie,
   - czy strona wynikow i topbar sa spoleczne wobec siebie.

### Definition of Done

- Overlaye maja wspolny standard.
- A11y nie jest "przy okazji", tylko jest cecha systemu UI.
- Komponenty wygladaja jak czesci jednego produktu, nie kilku etapow ewolucji.

---

## Grupa 7 - Release readiness, dokumentacja i gotowosc wdrozeniowa

### Problem

Projekt jest blisko wdrozenia funkcjonalnie, ale potrzebuje jeszcze domkniecia warstwy "operacyjnej":

- dokumentacja obiecuje wiecej niz kod w obszarze PWA,
- backup nie jest wersjonowany,
- nie ma checklisty release,
- nie ma planu migracyjnego dla przyszlych danych.

### Cel

Przygotowac projekt do wdrozenia tak, aby nie byl "dzialajaca alpha", tylko przewidywalnym produktem.

### Plan krok po kroku

1. Urealnic dokumentacje.
   Trzeba zrownac:
   - `docs/README.md`
   - `docs/architecture.md`
   - `docs/requirements.md`
   - `docs/tasks.md`
   z faktycznym stanem aplikacji.

2. Rozdzielic "offline-first" od "PWA".
   Dzis projekt jest offline-first przez IndexedDB, ale nie jest PWA.
   To musi byc komunikowane precyzyjnie.

3. Dodac release checklist.
   Powinna obejmowac:
   - typecheck
   - lint
   - test
   - build
   - smoke test import/export
   - smoke test multi-campaign
   - smoke test Session Live
   - test seed demo

4. Dodac plan wersjonowania aplikacji i backupow.

5. Dodac changelog techniczny i decyzje architektoniczne dla zmian quickfix.

6. Okreslic, co jest wymagane przed produkcja v1:
   - must have
   - should have
   - nice to have

7. Jesli PWA ma wejsc do pierwszego wdrozenia:
   - dodac `manifest.json`,
   - dodac service worker,
   - dodac polityke cache,
   - dodac testy aktualizacji i offline startup.
   Jesli nie:
   - usunac PWA z obietnic release notes i architektury.

### Definition of Done

- Dokumentacja odzwierciedla rzeczywisty stan produktu.
- Zespol ma checklisty, kontrakty i polityke wersjonowania.
- Wdrozenie nie opiera sie na "pamietamy co sprawdzic", tylko na procesie.

---

## Grupa 8 - Test strategy po quick fixach

### Cel

Po zakonczeniu refaktorow projekt ma byc nie tylko poprawiony, ale tez zabezpieczony przed nawrotem tych samych problemow.

### Plan testowy

1. Testy kontraktowe modelu danych.
   Dla kazdego `EntityType`:
   - poprawny payload,
   - niepoprawny payload,
   - roundtrip przez import/export.

2. Testy integralnosci relacji.
   - niedozwolone relacje,
   - duplikaty,
   - edge case z usuwaniem encji,
   - hierarchia lokacji,
   - derives_from i appears_in.

3. Testy scenariuszowe Session Live.

4. Testy regresyjne dla seedu demo.
   Minimalnie:
   - seed tworzy oczekiwana liczbe sesji,
   - istnieja kluczowe relacje,
   - seed daje sie wyeksportowac i zaimportowac.

5. Testy smoke dla multi-campaign.
   - izolacja danych,
   - przechodzenie miedzy kampaniami,
   - onboarding per nowa kampania.

6. Testy UI bazowych prymitywow.
   - modal,
   - confirm dialog,
   - picker,
   - focus/escape/backdrop.

### Wymagany wynik

- zero failing tests,
- zero lint errors,
- zero ostrzezen testowych, ktore maskuja niestabilnosc,
- wszystkie nowe klasy problemow maja swoje testy regresyjne.

---

## Proponowany harmonogram wdrozenia

### Etap 1 - Stabilizacja bazowa

Zakres:
- Faza 0
- poczatek Grupy 1

Wynik:
- zielone CI
- gotowosc do bezpiecznych refaktorow

### Etap 2 - Kontrakty danych i relacji

Status:
- [x] Zakonczony

Zakres:
- Grupa 1
- Grupa 2
- Grupa 3

Wynik:
- spojny model danych
- bezpieczny import/export
- uszczelnione relacje

### Etap 3 - Skalowalnosc i Session Live

Status:
- [x] Zakonczony

Zakres:
- Grupa 4
- Grupa 5

Wynik:
- lepsza wydajnosc
- prostsza architektura najwazniejszego modulu

Zrealizowane:
- [x] Wydzielono wspolna warstwe query dla Session Live i ograniczono ad hoc zapytania w kluczowych komponentach.
- [x] Wydzielono command layer dla najwazniejszych mutacji live: dodawanie do sesji, przenoszenie NPC, status watkow, nazywanie sceny.
- [x] Uszczelniono kontrakt stanu live w storage oraz regresje dla uszkodzonych danych przegladarki.
- [x] Zachowano obecna logike UI Session Live bez zmiany kontraktow domenowych.
- [x] Dodano placeholder `ostatnio widziany w` na detalu NPC z komentarzem do dalszego doprogramowania historii.

### Etap 4 - UI standard i release readiness

Status:
- [x] Zakonczony

Zakres:
- Grupa 6
- Grupa 7
- Grupa 8

Wynik:
- spojnosc UX
- dokumentacja wdrozeniowa
- gotowosc produktu do wydania

Zrealizowane:
- [x] Dopracowano wspolny prymityw `Modal` o initial focus, trap focus i restore focus po zamknieciu.
- [x] Uspojniono krytyczne sciezki fokusowania i zamykania w dialogach opartych o `Modal`, w tym `ConfirmDialog` i kluczowe pickery Session Live.
- [x] Uporzadkowano Search UX pod `Ctrl+K` i kontrolowany stan inputu.
- [x] Dodano regresje testowe dla modal focus management oraz dla wyszukiwarki.
- [x] Urealniono dokumentacje release readiness i jawnie rozdzielono offline-first od PWA.
- [x] Dodano checklisty oraz notatki techniczne dla wydan i dalszych quick fixow.

---

## Co robic najpierw, a czego nie ruszac za wczesnie

Najpierw:

1. lint i warningi,
2. kontrakty danych,
3. relacje i import/export,
4. zrodla prawdy dla hierarchii/sortowania.

Dopiero potem:

1. optymalizacja zapytan,
2. porzadkowanie Session Live,
3. standaryzacja UI,
4. PWA i dalszy polish.

Nie robic na start:

1. duzego redesignu wizualnego,
2. nowych funkcji produktowych,
3. rozbudowy PWA przed domknieciem kontraktow danych,
4. refaktoru wszystkich modulow naraz bez fazowania.

---

## Finalne kryteria gotowosci do wdrozenia

Projekt mozna uznac za gotowy do wdrozenia, gdy spelnia wszystkie warunki:

1. `pnpm typecheck` przechodzi bez bledu.
2. `pnpm lint` przechodzi bez bledu.
3. `pnpm test` przechodzi bez bledu i bez istotnych warningow.
4. `pnpm build` przechodzi i daje powtarzalny wynik.
5. Import/export ma wersjonowany kontrakt.
6. Relacje sa integralne i odporne na duplikaty.
7. Model danych jest spojny miedzy typami, walidacja, seedem i runtime.
8. Session Live jest technicznie uporzadkowany i testowalny.
9. Dokumentacja nie rozjezdza sie z rzeczywistoscia.
10. Zespol ma checklisty release i jasno opisany proces aktualizacji.

## Rekomendacja koncowa

Najwiekszy zwrot da podejscie warstwowe:

1. najpierw domknac kontrakty i integralnosc,
2. potem odchudzic hot spoty wydajnosciowe,
3. na koncu dopieszczac UX i release polish.

To nie jest projekt, ktory wymaga przepisywania od zera.
To jest projekt, ktory wymaga uszczelnienia fundamentow przed wdrozeniem.

---

## Modul dodatkowy - Historia "ostatnio widziany w" dla NPC

Status:
- [x] Zakonczony

### Problem

Obecnie `contains` dobrze opisuje jedna aktualna lokacje kampanijna NPC.
`appears_in` dobrze opisuje obecnosc NPC w sesjach.
Brakuje natomiast lekkiej, jawnej historii pozwalajacej pokazac:

- ostatnie 3 miejsca, w ktorych NPC byl widziany,
- kontekst sesji, w ktorej to nastapilo,
- rozdzielenie "gdzie jest teraz" od "gdzie byl wczesniej".

### Decyzja projektowa

Nie zmieniac znaczenia obecnych relacji:

- `contains` = jedna aktualna lokacja kampanijna albo brak lokacji,
- `appears_in` = obecny w danej sesji / wystapil w sesji,
- historia "ostatnio widziany w" = osobny log zdarzen, nie wyliczany wstecz z samych relacji.

To podejscie nie rozkurwia obecnej logiki i nie dubluje zrodla prawdy.
Aktualny stan nadal pozostaje prosty i jednoznaczny, a historia jest tylko warstwa audytowa.

### Proponowany model techniczny

Dodac nowy, lekki typ encji historii, np. `event` rozszerzony o wariant domenowy dla widocznosci NPC albo nowy typ `npc_presence_log`.

Rekomendacja dla tego projektu:

- nie dodawac nowej tabeli,
- wykorzystac istniejacy model encji i relacji,
- zapis historii trzymac jako encje logu powiazane z:
  - NPC,
  - lokacja,
  - opcjonalnie sesja.

Minimalny payload logu:

- `npcId`
- `locationId`
- `sessionId?`
- `recordedAt`
- `kind: 'current_location_set' | 'seen_in_session'`

Relacje pomocnicze:

- log `related_to` -> NPC
- log `related_to` -> Location
- log `appears_in` -> Session lub dodatkowe `related_to` -> Session

### Kiedy zapisujemy historie

Historia powinna byc dopisywana tylko w miejscach, gdzie faktycznie zmienia sie stan lub kontekst NPC:

1. zmiana aktualnej lokacji NPC z detailu,
2. przeniesienie NPC miedzy lokacjami w Session Live,
3. opcjonalnie wejscie NPC do sesji, jesli chcemy logowac "widziany podczas sesji" nawet bez zmiany lokacji.

Nie trzeba backfillowac historii z istniejacych relacji.
Mozna zaczac od historii liczonej od momentu wdrozenia funkcji.

### Zakres MVP

1. Zapis logu przy kazdej zmianie `contains` dla NPC.
2. Odczyt ostatnich 3 wpisow na detalu NPC.
3. Pokazanie:
   - nazwy lokacji,
   - daty/czasu,
   - jesli jest `sessionId`, to tez sesji.
4. Przycisk `Cala historia` otwiera prosty modal z pelna lista wpisow bez dodatkowej filtracji.

### Zakres pozniej

1. Historia "widziany w sesji" niezalezna od samej zmiany lokacji.
2. Pelny modal historii.
3. Raportowanie po sesji z lista ruchow NPC.
4. Ewentualne agregacje typu "najczesciej widziany w".

### Kolejnosc wykonania

- [x] Dodac kontrakt danych logu historii i helpery odczytu/zapisu.
- [x] Wpiac zapis historii do wszystkich mutacji zmieniajacych aktualna lokacje NPC.
- [x] Dodac query/hook zwracajacy ostatnie wpisy historii NPC.
- [x] Podmienic placeholder `ostatnio widziany w` na realny widok ostatnich 3 wpisow.
- [x] Dodac modal z pelna historia lokacji NPC.
- [x] Dodac testy regresyjne dla:
  - zmiany lokacji z detalu NPC,
  - przenoszenia NPC w Session Live,
  - braku duplikacji wpisow przy braku realnej zmiany lokacji,
  - poprawnego renderu sekcji historii i modala.

### Definition of Done

- Zmiana aktualnej lokacji NPC zapisuje aktualny stan oraz dopisuje wpis historii.
- Detail NPC pokazuje ostatnie 3 wpisy bez mieszania ich z `appears_in`.
- `contains` pozostaje jedynym zrodlem prawdy dla aktualnej lokacji.
- Funkcja nie zmienia semantyki obecnych relacji i nie psuje Session Live.

---

## Modul dodatkowy - Architektura fabuly: Fronty, Zagrozenia, Watki i Wskazowki

Status:
- [x] Zakonczona
- [ ] Zakonczony

### Cel

Uporzadkowac model fabularny aplikacji tak, aby `front`, `threat`, `thread` i `clue`
przestaly funkcjonowac jako osobne jezyki domenowe, a zaczely tworzyc jedna, spojna
strukture opowiesci wspierajaca granie przy stole.

Docelowa logika:

- `front` = kontener strategiczny kampanii,
- `threat` = aktywna sila nacisku, moze nalezec do frontu albo byc wolna,
- `thread` = quest / sprawa / trop, czyli byt grywalny najblizej stolu,
- `clue` = nosnik informacji, ktory moze byc wolny albo wskazywac na obiekt fabularny.

### Uzgodnione zalozenia

- `front` pozostaje duzym kontenerem i porusza sie najwolniej.
- `threat` moze nalezec do `front`, ale moze tez byc wolnym zagrozeniem.
- `thread` jest bytem grywalnym: questem, sprawa, tropem, z ktorym realnie obcuje stol.
- `thread` moze byc wolny i moze byc powiazany z wieloma `threat`.
- `thread -> thread` pozostaje wspierane jako questline / odnogi / nastepstwa / alternatywy.
- `clue` moze byc wolna.
- `clue` moze wskazywac na `thread`, `threat` i wyjatkowo na `front`.
- relacja `thread <-> threat` nie powinna opierac sie docelowo o samo `related_to`.
- robocza semantyka tej relacji: `affects`.
- `Session Live` pokazuje tylko watki powiazane z dana sesja.
- w `Session Live` watki sa warstwa wsparcia dla sceny, nie glownym centrum ekranu.
- preferowana kolejnosc kontekstu podczas gry:
  `Lokacja -> NPC -> Watek`.

### Kierunek architektoniczny

Docelowy model fabularny:

- `Front -> Threat`
- `Threat <-> Thread`
- `Thread -> Clue`

Z wyjatkami:

- `Threat` moze byc wolny,
- `Thread` moze byc wolny,
- `Clue` moze byc wolna,
- `Clue` moze tez prowadzic bezposrednio do `Threat`,
- `Clue` moze wyjatkowo prowadzic bezposrednio do `Front`.

### Proponowany rozwoj modelu danych

`Threat`:

- pozostaje bytem nacisku fabularnego,
- dostaje pole tekstowe `trigger` / `tickTrigger`, opisujace kiedy zagrozenie tyka.

`Thread`:

- pozostaje kompatybilny z obecnym `status`,
- dostaje bezpieczny szkielet modelu biznesowego, np.:
  - `kind`: `main | side | personal`,
  - miejsce na dalsze rozszerzenia,
- zachowuje mozliwosc budowania questline przez `derives_from`,
- w przyszlosci powinien rozrozniac typ pochodzenia relacji:
  - `nastepstwo`,
  - `alternatywa`,
  - `odnoga`,
  - `konsekwencja`.

`Clue`:

- pozostaje atomem informacji,
- moze prowadzic do wielu bytow jednoczesnie,
- moze byc mocniej zakotwiczona w `thread`, ale bez blokowania powiazan z `threat` i `front`.

### Przygotowanie

Status:
- [x] Zakonczone

Zakres:
- [x] Dodano oficjalny dokument kontraktu domenowego fabuly: `docs/story-domain-contract.md`.
- [x] Doprecyzowano semantyke `front`, `threat`, `thread` i `clue` w komentarzach typow domenowych.
- [x] Dodano bezpieczna warstwe przygotowawcza pod dalsze fazy: `src/shared/domain/storyContracts.ts`.
- [x] Oznaczono w kontrakcie relacji, ze `related_to` nie jest docelowym zrodlem prawdy dla `thread <-> threat`.

### Faza 1 - Ustalenie kontraktow domenowych

Status:
- [x] Zakonczone

Zakres:
- [x] Spisac oficjalna semantyke `front`, `threat`, `thread`, `clue`.
- [x] Potwierdzic kardynalnosc:
  - `front -> threat`
  - `thread <-> threat`
  - `thread -> thread`
  - `clue -> thread | threat | front`
- [x] Uzgodnic, czy nowa relacja domenowa dla `thread <-> threat` nazywa sie finalnie `affects`.
- [x] Spisac role wolnych bytow:
  - wolne `threat`
  - wolne `thread`
  - wolne `clue`

Wynik:
- [x] Jeden opis domeny, bez rozjazdu miedzy UX, danymi i relacjami.

Zrealizowane:
- [x] Spisano oficjalny kontrakt domenowy fabuly w `docs/story-domain-contract.md`.
- [x] Ustalono, ze `thread` jest questem / sprawa / tropem, a nie ogolna notatka.
- [x] Ustalono, ze `threat` moze byc wolny albo nalezec do `front`.
- [x] Ustalono, ze `thread` moze byc wolny oraz moze wplywac na wiele `threat`.
- [x] Ustalono, ze `clue` moze byc wolna oraz wskazywac na `thread`, `threat` i wyjatkowo `front`.
- [x] Ustalono, ze `Session Live` ma traktowac watki jako warstwe wsparcia dla sceny.

### Faza 2 - Rozszerzenie modelu relacji i typow

Status:
- [x] Zakonczone

Zakres:
- [x] Dodac nowa relacje domenowa dla powiazan `thread <-> threat`.
- [x] Rozszerzyc `clues_for`, albo dodac rownolegly kontrakt tak, aby `clue` mogla wskazywac na `thread`.
- [x] Dodac szkic modelu biznesowego `thread.kind`.
- [x] Dodac `trigger` / `tickTrigger` do `threat`.
- [x] Zachowac kompatybilnosc istniejacych danych i import/export.

Wynik:
- [x] Model danych zaczyna odzwierciedlac realna strukture fabularna.

Zrealizowane:
- [x] Dodano oficjalna relacje `affects` dla kontraktu `thread <-> threat` i podpieto ja do walidacji relacji, importu oraz eksportu.
- [x] Rozszerzono `clues_for`, aby wskazowka mogla prowadzic rowniez do `thread`, bez usuwania wsparcia dla `threat` i `front`.
- [x] Dodano bezpieczny szkielet `thread.kind` (`main | side | personal`) w typach, formularzach i nowych zapisach watkow.
- [x] Dodano pole `trigger` do `threat` w kontraktach danych, formularzach i detailu zagrozenia.
- [x] Zachowano kompatybilnosc danych historycznych oraz backupow przez opcjonalne pola runtime i regresje import/export.

### Faza 3 - Widoki detali i nawigacja fabularna

Status:
- [x] Zakonczone

Zakres:
- [x] Rozbudowac `ThreadDetail`, aby jasno pokazywal:
  - powiazane `threat`,
  - questline / watki pochodne,
  - wskazowki powiazane z watkiem,
  - sesje, w ktorych wystapil.
- [x] Rozbudowac `ThreatDetail`, aby pokazywal:
  - powiazane watki,
  - wskazowki,
  - trigger tykania.
- [x] Uspojnic nawigacje miedzy `front`, `threat`, `thread`, `clue`.
- [x] Ograniczyc uzywanie `related_to` jako zrodla prawdy dla fabuly.

Wynik:
- [x] Uzytkownik widzi jedna drabinke fabularna zamiast osobnych bytow.

Zrealizowane:
- [x] Rozbudowano `ThreadDetail` o sekcje domenowe dla `affects`, `derives_from`, `clues_for` i sesji, bez opierania glownego widoku na surowym `RelationList`.
- [x] Rozbudowano detail zagrozenia o jawny front nadrzedny, powiazane watki i trigger tykania, zachowujac obecna logike panelu we froncie.
- [x] Rozbudowano `ClueDetail` o sekcje `Prowadzi do`, oparta o `clues_for` dla `thread`, `threat` i `front`.
- [x] Dodano spojna nawigacje do zagrozen przez deep link `fronts/:id?threat=:threatId`, dzieki czemu `thread` i `clue` moga otwierac konkretny panel zagrozenia.
- [x] Zdegradowano ogolne `related_to` do roli powiazan dodatkowych, a nie glownego kontraktu fabularnego na detalach.

### Faza 4 - Session Live i obsluga przy stole

Status:
- [x] Zakonczone

Zakres:
- [x] Przebudowac prezentacje watkow w `Session Live` zgodnie z kolejnoscia:
  `Lokacja -> NPC -> Watek`.
- [x] Pokazywac tylko watki przypiete do sesji.
- [x] Grupowac watki wedlug powiazanych zagrozen oraz osobno pokazywac wolne watki.
- [x] Dodac bezpieczny workflow po sesji:
  - powiazanie watku z zagrozeniem,
  - zalozenie nowego zagrozenia na podstawie watku,
  - pozostawienie watku jako wolnego.
- [x] Nie rozwalic obecnej logiki scen, NPC i drag/drop.

Wynik:
- [x] Watki wspieraja scene i decyzje MG zamiast konkurowac z glownym widokiem.

Zrealizowane:
- [x] Dodano query layer grupujacy watki sesji wedlug relacji `affects` do zagrozen oraz wydzielajacy wolne watki.
- [x] Przebudowano panel watkow w `Session Live`, aby osadzal watki w kontekscie sceny: `Lokacja -> NPC -> Watek`.
- [x] Zachowano zakres tylko do watkow przypietych do sesji, bez zmiany logiki scen, NPC i drag/drop.
- [x] Dodano dedykowany workflow cleanupu dla wiszacych watkow: podepnij do zagrozenia, utworz nowe zagrozenie, albo zostaw jako wolny watek.
- [x] Dodano regresje dla grupowania watkow sesyjnych i odrozniania wolnych watkow od tych powiazanych z zagrozeniami.

### Faza 5 - Questline, sila relacji i dalszy rozwoj

Status:
- [x] Zakonczona

Zakres:
- [x] Faza 5a - Kontrakt questline i semantyka `derives_from`
- [x] Faza 5b - Runtime i UI dla typow relacji miedzy watkami
- [x] Faza 5c - Sila / waga relacji fabularnych dla wskazowek
- [x] Faza 5d - Rozszerzenie modelu biznesowego `thread`
- [x] Faza 5d.a - Rozszerzenie modelu biznesowego `threat`
- [x] Faza 5e - Testy scenariuszowe i domkniecie przeplywu fabularnego

Wynik:
- [x] System wspiera nie tylko notowanie fabuly, ale tez prowadzenie questline i konsekwencji decyzji.

#### Faza 5a - Kontrakt questline i semantyka `derives_from`

Status:
- [x] Zakonczone

Cel:
- Ustalic oficjalne znaczenie relacji miedzy watkami, zanim zaczniemy zmieniac runtime i UI.

Zakres:
- [x] Rozpisac docelowe typy powiazan `thread -> thread`:
  - nastepstwo
  - alternatywa
  - odnoga
  - konsekwencja
- [x] Okreslic, czy typ relacji ma byc trzymany jako nowy kontrakt relacji, metadata relacji, czy bezpieczny enum pomocniczy.
- [x] Spisac zasady kompatybilnosci wstecznej dla istniejacego `derives_from`.
- [x] Ustalic, jak te typy maja byc czytane w UX: kierunek, nazwa, odwrotny opis relacji.

Wynik:
- [x] Jeden jawny kontrakt questline, bez zgadywania semantyki po samym `derives_from`.

Zrealizowane:
- [x] Ustalono, ze `derives_from` pozostaje jednym typem relacji `thread -> thread`, a przyszly podtyp questline bedzie trzymany jako metadata relacji, nie jako nowe `RelationType`.
- [x] Ustalono oficjalne typy questline: `followup` / nastepstwo, `alternative` / alternatywa, `branch` / odnoga, `consequence` / konsekwencja.
- [x] Ustalono kanoniczny kierunek zapisu: `source` = watek pochodny, `target` = watek rodzic / zrodlo.
- [x] Ustalono plan odczytu UX dla obu kierunkow relacji, aby 5b mogla wdrozyc spojne detail i pickery.
- [x] Ustalono kompatybilnosc wsteczna: stare `derives_from` bez podtypu pozostaje poprawnym linkiem legacy bez wymuszonej migracji.
- [x] Dopisano kontrakt do `docs/story-domain-contract.md` oraz do warstwy przygotowawczej `src/shared/domain/storyContracts.ts`.

#### Faza 5b - Runtime i UI dla typow relacji miedzy watkami

Status:
- [x] Zakonczone

Cel:
- Wprowadzic uzgodnione typy relacji miedzy watkami do danych, detali i pickerow.

Zakres:
- [x] Wdrozyc wybrany kontrakt dla typow relacji `thread -> thread`.
- [x] Rozbudowac picker relacji i widoki detali, aby pokazywaly typ powiazania, a nie tylko surowe `derives_from`.
- [x] Uporzadkowac prezentacje questline na detalu watku:
  - rodzic
  - odnogi
  - alternatywy
  - konsekwencje
- [x] Zachowac bezpieczny odczyt starych danych bez typu relacji.

Wynik:
- [x] Uzytkownik widzi, czy dany watek jest kontynuacja, rozgalezieniem czy konsekwencja innego watku.

Zrealizowane:
- [x] Rozszerzono runtime relacji o bezpieczne metadata `threadDerivationKind` dla `derives_from`, bez zmiany bazowego `RelationType`.
- [x] Rozbudowano `RelationPicker`, `RelationList` i detail watku o czytelne etykiety questline oraz fallback legacy dla starych relacji bez typu.
- [x] Uspojniono quickadd dla watkow w `Session Live` i drzewie watkow, tak aby poza kolorem pozwalal wybrac tez sensowne opcje domenowe, przede wszystkim `thread.kind`, a dla relacji pochodnych takze typ questline.
- [x] Domknieto GUI questline na detalu watku: dodawanie rodzica, podepinanie istniejacych watkow pochodnych per typ oraz czytelne grupowanie odnog, alternatyw, nastepstw i konsekwencji.
- [x] Dopracowano eksport Markdown i regresje import/export tak, aby nowe metadata relacji byly widoczne i zachowywaly sie poprawnie po roundtripie.

#### Faza 5c - Sila / waga relacji fabularnych dla wskazowek

Status:
- [x] Zakonczone

Cel:
- Dodac lekka, kontrolowana informacje o sile wskazowki bez rozwalania obecnego modelu clue.

Zakres:
- [x] Rozwazyc i wybrac bezpieczny model wagi relacji `clue -> thread | threat | front`.
- [x] Jesli decyzja bedzie na tak, dodac minimalny kontrakt, np.:
  - `weak`
  - `standard`
  - `strong`
- [x] Pokazac wage tylko tam, gdzie realnie pomaga MG przy czytaniu fabuly.
- [x] Nie wymuszac wagi dla wszystkich istniejacych wskazowek.

Wynik:
- [x] Wskazowki moga odrozniać luźny trop od mocnego prowadzenia do obiektu fabularnego.

Zrealizowane:
- [x] Dodano opcjonalne metadata `clueStrength` do relacji `clues_for`, bez wprowadzania nowego `RelationType` i bez wymuszania migracji starych danych.
- [x] Rozbudowano `RelationPicker`, `ClueSection`, `ClueDetail` i listy relacji tak, aby MG mogl ustawic oraz odczytac wage wskazowki tam, gdzie faktycznie pomaga to w czytaniu fabuly.
- [x] Domknieto GUI na detalu wskazowki: szybkie akcje dodawania celu (`watek`, `zagrozenie`, `front`) oraz czytelny podglad rozkladu sily tropow.
- [x] Zachowano lekki model: waga jest opcjonalna, a brak wartosci nadal oznacza poprawna, legacy-kompatybilna relacje.
- [x] Dopracowano walidacje import/export, eksport Markdown i regresje testowe dla roundtripu metadata wskazowek.

#### Faza 5d - Rozszerzenie modelu biznesowego `thread`

Status:
- [x] Zakonczone

Cel:
- Dodac bezpieczne pola rozwojowe dla watku jako questa / sprawy dla stolu.

Zakres:
- [x] Rozwazyc i opisac pola rozwojowe `thread`, przede wszystkim:
  - `priority`
  - `resolution`
  - inne lekkie metadata przydatne MG
- [x] Wybrac tylko te pola, ktore daja realna wartosc przy stole i nie dubluja notatek.
- [x] Wpiac nowe pola do typow, formularzy i detailu watku bez psucia danych historycznych.
- [x] Zachowac prostote UI i nie zamieniac watku w przeprojektowany mini-system taskow.

Wynik:
- [x] `Thread` dostaje bezpieczny szkielet rozwojowy wspierajacy prowadzenie spraw i konsekwencji.

Zrealizowane:
- [x] Dodano lekkie pola biznesowe `thread.priority` i `thread.resolution` do kontraktu danych, walidacji i bezpiecznych wartosci domyslnych.
- [x] Rozszerzono GUI watku: formularz, detail, listy i quick-add w Session Live pokazuja priorytet oraz rozwiazanie bez zamiany watku w ciezki task tracker.
- [x] Zachowano kompatybilnosc historycznych danych przez opcjonalne pola runtime i brak wymuszania migracji starych wpisow.

#### Faza 5d.a - Rozszerzenie modelu biznesowego `threat`

Status:
- [x] Zakonczone

Cel:
- Dodac bezpieczne pola rozwojowe dla zagrozenia.

Zakres:
- [x] Rozwazyc i opisac pola rozwojowe `threat`, przede wszystkim:
  - `reasonOfDead`
  - `forkThreat`
  - inne lekkie metadata przydatne MG
- [x] Ustalic czy pola maja byc czescia stalego kontraktu `threat`, czy bezpiecznym szkieletem pod workflow po sesji.
- [x] Wpiac te pola do workflow sprzatania po sesji tam, gdzie realnie wspieraja decyzje MG.
- [x] Zachowac kompatybilnosc historycznych danych i nie wymuszac uzupelniania nowych pol dla istniejacych zagrozen.
- [x] Nie przeprojektowac zagrozenia w ciezki system stanowy; zostawic lekki model operacyjny.

Wynik:
- [x] `Threat` dostaje bezpieczny szkielet rozwojowy wspierajacy prowadzenie spraw i konsekwencji.

Zrealizowane:
- [x] Dodano pola `threat.reasonOfDead` oraz `threat.forkThreatId` jako lekki szkielet operacyjny do prowadzenia konsekwencji i odgalezien zagrozen.
- [x] Rozszerzono GUI zagrozen: formularz, detail i karty potrafia pokazac pochodzenie zagrozenia oraz opcjonalny powod jego wygaszenia.
- [x] W workflow sprzatania po sesji przy tworzeniu zagrozenia z watku mozna od razu ustawic pochodzenie (`fork threat`) i powod wygaszenia, jesli MG tego potrzebuje.
- [x] Zachowano kompatybilnosc runtime, import/export i istniejacych danych bez wymuszania uzupelniania nowych pol.

#### Faza 5e - Testy scenariuszowe i domkniecie przeplywu fabularnego

Status:
- [x] Zakonczone

Cel:
- Spiac wszystkie zmiany fazy 5 w jeden przewidywalny przeplyw domenowy.

Zakres:
- [x] Dodac testy scenariuszowe dla:
  - questline `thread -> thread`
  - wskazowki prowadzace do `thread | threat | front`
  - wolnych i powiazanych watkow
  - konsekwencji decyzji w widokach detali
- [x] Zweryfikowac import/export dla nowych kontraktow fazy 5.
- [x] Zrobic koncowy przeglad UX detaili `thread`, `threat` i `clue`.
- [x] Potwierdzic przejscie:
  `pnpm typecheck`
  `pnpm lint`
  `pnpm test`
  `pnpm build`

Wynik:
- [x] Faza 5 jest domknieta technicznie i fabularnie, a nie tylko czesciowo wdrozona.

Zrealizowane:
- [x] Dodano scenariuszowy test `ThreadDetail`, ktory spina questline, zagrozenia, wskazowki i sesje oraz pilnuje blokady juz podpietych watkow w pickerze questline.
- [x] Dodano scenariuszowy test `ClueDetail`, ktory potwierdza obsluge wskazowek prowadzacych do `thread`, `threat` i `front`.
- [x] Domknieto UX dla duplikatow questline: juz podpiete watki sa blokowane w dedykowanym pickerze, a uzytkownik dostaje jasny komunikat o koniecznosci usuniecia starej relacji przed zmiana typu.
- [x] Potwierdzono zgodnosc import/export i eksportu Markdown dla metadata fazy 5 oraz przejscie bramek `typecheck`, `lint`, `test` i `build`.

### Definition of Done

- `Thread` jest formalnie traktowany jako quest / sprawa / trop, a nie ogolna notatka.
- `Threat` moze byc wolny albo nalezec do `Front`.
- `Thread` moze byc wolny albo wplywac na wiele `Threat`.
- `Clue` moze wskazywac na `Thread`, `Threat` i wyjatkowo na `Front`.
- `Session Live` pokazuje watki jako warstwe wsparcia sceny.
- Model fabularny jest spojny miedzy danymi, relacjami, detailami i workflow po sesji.

---

## Faza 6 - Warstwa prezentacji, nawigacji i klikalnosci domeny

Status:
- [x] Zakonczona

Cel:
- Uporzadkowac aplikacje na poziomie UX i architektury nawigacji tak, aby model domenowy byl czytelny juz z samego ukladu menu, ekranow i akcji klikalnych.

Kierunek:
- blok fabularny:
  - `Fronty`
  - `Zagrozenia`
  - `Watki`
  - `Wskazowki`
- swiat gry:
  - `Lokacje`
  - `Postacie`
  - `Przedmioty`
  - `Frakcje` jako byt swiata i organizacji, blizej warstwy fizyczno-spolecznej niz czysto fabularnej
- Prowadzenie:
  - `Sesje`
  - `Zegary`
  - `Os czasu`
  - `Notatki`
- narzedziowy:
  - `Graf`
  - `Wyszukiwanie`
  - `Ustawienia`

Wynik:
- [x] Nawigacja i GUI wspieraja workflow MG rownie mocno, jak model danych wspiera logike domeny.

### Faza 6a - Architektura menu i grupowanie domen

Status:
- [x] Zakonczone

Cel:
- Ustalic finalny porzadek i grupowanie sekcji w aplikacji, tak aby ukladal sie w naturalny workflow MG.

Zakres:
- [x] Rozpisac i wdrozyc grupy nawigacyjne zamiast jednej plaskiej listy linkow.
- [x] Potwierdzic finalny blok fabularny:
  - `Fronty`
  - `Zagrozenia`
  - `Watki`
  - `Wskazowki`
- [x] Potwierdzic finalny blok fizyczny / swiat gry:
  - `Lokacje`
  - `Postacie`
  - `Przedmioty`
  - `Frakcje`
- [x] Rozwazyc dodatkowe podzialy pomocnicze:
  - blok operacyjny MG
  - blok analityczny / przeglad kampanii
  - blok techniczny / narzedziowy
- [x] Ujednolicic nazewnictwo sekcji miedzy sidebar, breadcrumb, naglowkami i kartami na poziomie glownej nawigacji.

Zrealizowane:
- [x] Sidebar dostal grupy `Fabula`, `Swiat gry`, `Prowadzenie` i `Narzedzia` zamiast jednej plaskiej listy.
- [x] `Dashboard` zostal wydzielony jako osobny punkt startowy nad blokami domenowymi.
- [x] `Ustawienia` i przelacznik motywu pozostaly w stopce sidebaru jako warstwa narzedziowa aplikacji.
- [x] Kolejnosc fabularna zostala utrzymana jako `Fronty -> Zagrozenia -> Watki -> Wskazowki`, aby workflow byl czytelny juz z menu.
- [x] Breadcrumb i glowna belka nawigacyjna zostaly przepiete na spojne nazwy domenowe dla kluczowych tras.

Wynik:
- [x] Uzytkownik rozumie strukture produktu po samym sidebarze, bez tlumaczenia modelu danych.

### Faza 6b - Klkalnosc i deep linkowanie calej domeny

Status:
- [x] Zakonczone

Cel:
- Sprawic, aby wszystko co logicznie jest bytem lub przejsciem w domenie, dawalo sie otworzyc jednym kliknieciem.

Zakres:
- [x] Zrobic audyt elementow, ktore powinny byc klikalne, a jeszcze nie sa.
- [x] Ujednolicic klikalnosc dla:
  - kart encji
  - badge typow
  - nazw encji w sekcjach relacji
  - etykiet front / zagrozenie / watek / wskazowka
  - lokacji nadrzednej i podlokacji
  - aktualnej lokacji NPC i historii lokacji
  - parent / fork / source / derived links
  - sesji, w ktorych encja `appears_in`
  - zegarow przypietych do zagrozen
- [x] Dodac lub ujednolicic deep linki kontekstowe:
  - z watku do zagrozenia
  - z zagrozenia do frontu
  - ze wskazowki do celu
  - z sesji do encji obecnych w sesji
- [x] Dopilnowac, aby klik nie otwieral "prawie tego samego", tylko zawsze docelowy detail bytu.

Zrealizowane:
- [x] Ujednolicono wyznaczanie detail path przez wspolny helper dla kart, wyszukiwarki, dashboardu i relacji.
- [x] Naprawiono regresje po wydzieleniu `Threat`, tak aby klik w zagrozenie prowadzil do `/threats/:id`, a nie do starego detailu frontu.
- [x] Badge typow dostaly bezpieczna, opcjonalna klikalnosc i moga otwierac docelowy detail encji.
- [x] `RelationList` przestala miec martwe kliki i potrafi samodzielnie otwierac detail bytu nawet bez lokalnego handlera.
- [x] Powiazane zegary na detailach `Front` i `Threat` otwieraja detail zegara bez obchodzenia przez inny ekran.
- [x] Dodano regresje testowe dla klikalnego badge oraz deeplinku zagrozenia w dashboardzie.

Wynik:
- [x] Klikalnosc przestaje byc przypadkowa i staje sie jawna cecha calego produktu.

### Faza 6c - Widoki list i czytelnosc przegladania

Status:
- [x] Zakonczone

Cel:
- Uspojnic listy i ekrany przegladowe tak, aby kazda domena miala podobny rytm czytania i filtrowania.

Zakres:
- [x] Ujednolicic naglowki list:
  - tytul
  - krotki opis
  - akcja `Nowy ...`
  - podstawowe filtry / wyszukiwanie
- [x] Dopracowac karty i listy dla domen fabularnych tak, aby widac bylo:
  - typ
  - status
  - nadrzedny kontekst
  - najwazniejsze relacje
- [x] Wprowadzic wzorzec `kontener + wolne byty` dla domen fabularnych tam, gdzie to pomaga czytaniu kampanii:
  - `Front -> Zagrozenia` + sekcja `Wolne zagrozenia`
  - `Zagrozenie -> Watki` + sekcja `Wolne watki`
  - `Thread / Threat / Front -> Wskazowki` + sekcja `Wolne wskazowki`
- [x] Rozwazyc, czy na listach `Watkow` i `Wskazowek` domyslnym widokiem nie powinno byc grupowanie kontenerowe, a nie tylko plaska siatka kart.
- [x] Dopilnowac, aby grupowanie kontenerowe nie ukrywalo wolnych bytow, tylko wzmacnialo ich czytelnosc jako osobnej kategorii.
- [x] Dopracowac listy domen fizycznych, aby byly bardziej "swatowe" i mniej surowe technicznie.
- [x] Rozwazyc stale mini-meta bloki na listach, np.:
  - `Front nadrzedny`
  - `Aktualna lokacja`
  - `Powiazane zagrozenia`
  - `Ostatnia sesja`
- [x] Ograniczyc miejsca, w ktorych lista robi za przypadkowy detail.

Wynik:
- [x] Listy sa skanowalne i przewidywalne, a nie skladane kazda po swojemu.
- [x] Domeny fabularne dostaja czytelny uklad `kontenery + wolne byty`, ktory wspiera szybkie czytanie kampanii.

Zrealizowane:
- [x] Ujednolicono naglowki list fabularnych: `Fronty`, `Zagrozenia`, `Watki` i `Wskazowki` dostaly spojny rytm `tytul -> opis -> akcja -> filtry / wyszukiwanie`.
- [x] Lista `Frontow` zostala pogrupowana kategoriami, zamiast zostawac plaska siatka bez kontekstu nadrzednego.
- [x] Lista `Zagrozen` dostala docelowy uklad `Front -> Zagrozenia` oraz osobna sekcje `Wolne zagrozenia`.
- [x] Lista `Watkow` domyslnie pokazuje uklad `Zagrozenie -> Watki` oraz `Wolne watki`, z zachowaniem alternatywnej siatki dla przegladania i kolejnosci.
- [x] Lista `Wskazowek` domyslnie grupuje tropy wedlug celu fabularnego (`Front`, `Zagrozenie`, `Watek`) i wydziela `Wolne wskazowki`.
- [x] Zachowano obecne workflow tworzenia encji, filtrowania i nawigacji do detaili bez psucia kontraktow domenowych.

### Faza 6d - Widoki detali i relacje miedzy ekranami

Status:
- [x] Zakonczone

Cel:
- Zamienic detale encji w spojny system nawigacji miedzy bytami domenowymi.

Zakres:
- [x] Ujednolicic uklad detaili:
  - naglowek
  - najwazniejszy kontekst
  - relacje glowne
  - relacje dodatkowe
  - notatki / historia / sesje
- [x] Ustalic, ktore sekcje sa zawsze "glowne" dla danej encji.
- [x] Wprowadzic czytelna hierarchie relacji na detalach:
  - nadrzedne
  - rownolegle
  - pochodne
  - historyczne
- [x] Rozdzielic mocniej:
  - relacje fabularne
  - relacje swiatowe
  - relacje sesyjne / operacyjne
- [x] Dopracowac przejscia pomiedzy detailami, aby nie bylo martwych koncowek.

Wynik:
- [x] Detail staje sie centrum pracy na encji, a nie tylko formularzem z relacjami obok.

Zrealizowane:
- [x] Ujednolicono rytm detaili `Front`, `Threat`, `Thread` i `Clue`: naglowek, kontekst glowny, relacje glowne, relacje dodatkowe swiata oraz notatki MG.
- [x] Dodano wspolny prymityw `DetailSection`, dzieki czemu sekcje detaili sa czytelne i przewidywalne miedzy ekranami.
- [x] Rozdzielono mocniej relacje fabularne od relacji dodatkowych: glowne kontrakty (`belongs_to`, `affects`, `derives_from`, `clues_for`) pozostaja w sekcjach domenowych, a poboczne linki trafiaja do osobnych blokow `Powiazania swiata`.
- [x] Rozszerzono `RelationList` o filtrowanie typow relacji i czytelne empty state, aby detail nie mieszal wszystkiego w jednym worku.
- [x] Dodano osobne sekcje `Notatki MG` na detalach fabularnych, z pustymi stanami zamiast znikajacego obszaru.
- [x] Zachowano bezpieczne przejscia miedzy ekranami przez dodatkowe pickery relacji na detalach `Front` i `Threat`, bez zmiany kontraktow danych.

### Faza 6e - Stany specjalne, komunikaty i affordance UI

Status:
- [x] Zakonczone

Cel:
- Uspojnic zachowanie aplikacji w stanach granicznych i poprawic czytelnosc komunikatow.

Zakres:
- [x] Ujednolicic empty states dla list i sekcji relacji.
- [x] Ujednolicic komunikaty bledow i sukcesow dla:
  - duplikatow relacji
  - niedozwolonych relacji
  - brakujacych encji
  - pustych list i pustych wynikow wyszukiwania
- [x] Dopracowac wizualne affordance:
  - co jest klikalne
  - co otwiera modal
  - co prowadzi do detailu
  - co jest tylko informacja
- [x] Ujednolicic:
  - hover
  - focus
  - active
  - disabled
- [x] Dodac brakujace ikonografie lub mikroetykiety tam, gdzie pomoga w orientacji.

Wynik:
- [x] UI staje sie bardziej "samotlumaczace" i mniej wymaga zgadywania.

Zrealizowane:
- [x] Wprowadzono wspolny `InlineEmptyState` i uzyto go w kluczowych sekcjach relacji, notatek i powiazan fabularnych zamiast surowych pustych paragrafow.
- [x] `RelationList`, sekcje linkow narracyjnych i listy notatek dostaly czytelniejsze affordance: mocniejsze focus states, mikroetykiety `Detail` oraz bardziej jednoznaczne elementy klikalne.
- [x] Uspojniono zachowanie topbara i wyszukiwarki: czytelniejszy przycisk startowy `Dashboard`, lepsze focus/hover dla breadcrumbow i akcji czyszczenia wyszukiwania.
- [x] Zachowano bezpieczny zakres zmian: polish warstwy prezentacji bez ruszania kontraktow domenowych i logiki danych.

### Faza 6f - Polish nawigacji MG i odbior koncowy

Status:
- [x] Zakonczone

Cel:
- Zrobic finalny polish interfejsu z perspektywy realnego workflow prowadzenia przy stole.

Zakres:
- [x] Przejsc scenariusze MG:
  - od lokacji do NPC
  - od NPC do watku
  - od watku do zagrozenia
  - od zagrozenia do frontu
  - od wskazowki do celu
- [x] Sprawdzic, czy mozna przejsc przez te sciezki bez "martwych klikow".
- [x] Dopracowac breadcrumb, przyciski powrotu i linki kontekstowe.
- [x] Rozwazyc sekcje "zobacz tez" / "powiazane obiekty" na detalach tam, gdzie bardzo pomagaja MG.
- [x] Dodac finalny przeglad UX i testy regresyjne dla nawigacji i klikalnosci.

Wynik:
- [x] Produkt daje sie prowadzic intuicyjnie przy stole, a nie tylko poprawnie technicznie.

Zrealizowane:
- [x] Domknieto breadcrumb i nazewnictwo detaili tak, aby na trasach domenowych pojawialy sie nazwy encji zamiast surowych identyfikatorow oraz jawny punkt startowy `Dashboard`.
- [x] Spiete zostaly przejscia `lista -> detail -> powiazana encja` w glownych obszarach MG, z ograniczeniem martwych klikow i niejednoznacznych przejsc.
- [x] Potwierdzono odbior techniczny fazy 6 przez komplet bramek: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

### Definition of Done

- Sidebar pokazuje jasny podzial na bloki domenowe.
- `Front`, `Threat`, `Thread` i `Clue` sa czytelne jako jeden ciag fabularny, ale kazdy ma osobny byt w nawigacji.
- Encje fizyczne i swiatowe sa odroznione od warstwy fabularnej i operacyjnej.
- Wszystkie kluczowe byty i relacje, ktore logicznie powinny byc otwieralne, sa klikalne.
- Detail, lista i breadcrumb mowia tym samym jezykiem domenowym.
- Aplikacja nie ma juz przypadkowych martwych koncowek w nawigacji MG.

---

## Aneks aktywny - QoL plan od 2026-04-20

Status:
- [x] Aktywny

Wazne:
- [x] Data startu tego aneksu: `2026-04-20`.
- [x] Wszystko powyzej tej sekcji traktujemy jako archiwum i material referencyjny.
- [ ] Zadania ponizej sa aktualnym planem wykonawczym QoL.

### QOL.1 - Sesje: symetria akcji `Dodaj` / `Odepnij`

Status:
 - [x] Wykonane

Zakres:
 - [x] QOL.1a Dodac szybkie `Usun z sesji` na ekranie detail sesji dla wszystkich kolumn encji:
   - [x] Postacie
   - [x] Lokacje
   - [x] Przedmioty
   - [x] Watki
   - [x] Wskazowki
   - [x] Zagrozenia
 - [x] QOL.1b Podpiac akcje usuwania pod wspolna komende `removeEntityFromSession`, aby nie dublowac logiki.
 - [x] QOL.1c Ujednolicic komunikaty sukcesu/bledow przy dodawaniu i odpinaniu encji z sesji.
 - [x] QOL.1d Potwierdzic spojne zachowanie miedzy:
   - [x] `SessionDetail`
   - [x] `SessionNpcPanel`
   - [x] `SessionHudTray`

Wynik:
 - [x] W kazdym glownym wejsciu do sesji da sie encje i szybko dodac, i szybko odpiac.

### QOL.2 - Standaryzacja formatek i formularzy

Status:
- [x] Wykonane

Zakres:
  - [x] QOL.2a Spisac jeden kontrakt UI formularzy (spacing, label, helper/error, focus, przyciski, stany zapisu).

#### Kontrakt UI formularzy (QOL.2a)

- Pola tekstowe: `app-input` (input, textarea), shell: `app-input-shell` (np. TagInput, RichTextEditor)
- Przycisk główny: `app-button-primary`, przycisk anuluj: `app-button-secondary`
- Label: `text-sm font-medium text-surface-700` lub `text-surface-800`
- Helper/error: `text-xs text-red-600` pod polem, aria-describedby
- Focus: `focus:border-primary-500 focus:ring-primary-500/20` (inputy), `focus:outline-none`
- Spacing: `flex flex-col gap-1.5` dla pól, `gap-4` dla sekcji
- Stany zapisu: disabled + `disabled:opacity-50`, tekst „Zapisywanie…”
- Wszystkie formularze mają `noValidate` i obsługę błędów przez aria-invalid/aria-describedby
- Przycisk submit zawsze po prawej, anuluj po lewej, w jednym rzędzie
- Komponenty złożone (TagInput, RichTextEditor) mają shell i focus ring

Wzorzec referencyjny: `src/shared/components/EntityForm.tsx`
- [x] QOL.2b Ujednolicic formularze encji wokol wspolnych prymitywow (`app-input`, `app-input-shell`, `app-button-primary`, `app-button-secondary`).
- [x] QOL.2c Przejsc moduly formularz po formularzu:
  - [x] `NpcForm`
  - [x] `LocationForm`
  - [x] `SessionForm`
  - [x] `ThreadForm`
  - [x] `ClueForm`
  - [x] `ItemForm`
  - [x] `FactionForm`
 - [x] QOL.2d Zostawic lokalne odstepstwa tylko tam, gdzie sa uzasadnione domenowo i opisane komentarzem.

#### Odstępstwa lokalne (QOL.2d)

NpcForm: brak odstępstw – całość zgodna z kontraktem UI.
LocationForm: brak odstępstw – całość zgodna z kontraktem UI.
SessionForm: brak odstępstw – całość zgodna z kontraktem UI.
ThreadForm: lokalne odstępstwo domenowe – selektory statusu/typu/priorytetu oraz paleta kolorów pozostają jako przyciski typu "chip", bo dają szybszą zmianę stanu niż select.
ClueForm: lokalne odstępstwo domenowe – przełącznik "Odkryta przez graczy" pozostaje jako switch (rola `switch`) dla czytelnej binarnej akcji przy stole.
ItemForm: lokalne odstępstwo domenowe – dynamiczna lista właściwości używa kompaktowych przycisków dodaj/usuń w wierszu dla szybkiej edycji wielu elementów.
FactionForm: lokalne odstępstwo domenowe – dynamiczne listy celów i zasobów używają kompaktowych przycisków dodaj/usuń dla szybkiej pracy na listach.

Wynik:
- [x] Formatki przestaja wygladac jak osobne epoki projektu i dzialaja wg jednego wzorca.

### QOL.3 - Ergonomia i semantyka akcji

Status:
- [x] Zrobione

Cel:
- [x] Użytkownik ma wszędzie ten sam język i ten sam model akcji: `Dodaj do sesji`, `Usuń z sesji`, `Przypnij do sceny`, `Odepnij ze sceny`.

Zakres:
- [x] QOL.3a Ujednolicono akcje destrukcyjne i edycyjne w detailach (`Edytuj` / `Usuń`) oraz wspólny styl `app-button-danger`.
- [x] QOL.3b Ujednolicono słownictwo akcji w panelach live (`SessionDetail`, `SessionNpcPanel`, `SessionHudTray`, `SessionSearchPanel`, `ThreadTreePanel`):
  - [x] jedna semantyka dla sesji: `Dodaj do sesji` / `Usuń z sesji`
  - [x] jedna semantyka dla sceny: `Przypnij do sceny` / `Odepnij ze sceny`
- [x] QOL.3c Domknięto affordance akcji kontekstowych:
  - [x] kompletne `title` i `aria-label` dla akcji ikonowych
  - [x] spójna mapa ikon: `Plus`, `X`, `Trash2`, `MapPin`, `MapPinOff`
- [x] QOL.3d Dopracowano empty state i mikrocopy paneli sesji:
  - [x] każdy pusty stan mówi, co zrobić jako następny krok
  - [x] brak technicznych i niejednoznacznych komunikatów
- [x] QOL.3e Wykonano audyt martwych klików i elementów pozornie klikalnych.

Kryteria odbioru:
- [x] Każda akcja live ma jednoznaczną etykietę i przewidywalny efekt.
- [x] Akcje ikonowe mają `title` i `aria-label`.
- [x] Użytkownik nie musi zgadywać różnicy między operacją „na sesji” i „na scenie”.

Wynik:
- [x] Obsługa sesji jest intuicyjna przy stole i odporna na pomyłki operatora.

### QOL.4 - Regresje testowe dla QoL

Status:
- [x] Zrobione

Zakres:
- [x] QOL.4a Dodano testy scenariuszowe dla `dodaj -> odpinaj` na detailu sesji:
  - [x] warstwa komend (`liveSessionCommands`)
  - [x] warstwa UI (`SessionDetail`)
- [x] QOL.4b Dodano testy regresyjne dla paneli live:
  - [x] `SessionNpcPanel` (dodaj / usuń / przypnij / odepnij)
  - [x] `SessionHudTray` (dodaj / usuń / zmiana statusu wątku)
  - [x] `SessionSearchPanel` (pin/unpin + szybki podgląd)
- [x] QOL.4c Dodano testy dostępnościowe dla nowych akcji:
  - [x] `aria-label` dla przycisków ikonowych
  - [x] focus i klawiatura (`Tab`, `Enter`, `Escape` gdzie dotyczy)
- [x] QOL.4d Potwierdzono brak regresji poza modułem sesji:
  - [x] istnieje pokrycie import/export
  - [x] istnieje pokrycie wielokampanijności
  - [x] spięto testy w finalny run odbiorowy QoL i zapisano wynik

Kryteria odbioru:
- [x] Testy QoL przechodzą lokalnie i w CI bez flakiness.
- [x] Każdy błąd regresyjny QoL jest odtwarzalny testem automatycznym.

Wynik:
- [x] Usprawnienia QoL są zabezpieczone testami przed nawrotem problemów.

### QOL.5 - Odbiór, bramki i wdrożenie

Status:
- [x] Zrobione

Zakres:
- [x] QOL.5a Przejść komplet bramek jakości w jednym finalnym przebiegu:
  - [x] `pnpm typecheck`
  - [x] `pnpm lint`
  - [x] `pnpm test`
  - [x] `pnpm build`
- [x] QOL.5b Wykonać smoke test UX sesji (scenariuszowy):
  - [x] dodanie encji do sesji
  - [x] usunięcie encji z sesji
  - [x] przypięcie i odpięcie encji ze sceny
  - [x] przejścia między detailami bez martwych klików
- [x] QOL.5c Domknąć dokumentację odbiorową:
  - [x] dopisać wynik do `docs/CHANGELOG.md`
  - [x] dodać końcową notę „QoL gotowe do release” w tym aneksie

Wynik:
- [x] QoL jest gotowy do release bez regresji funkcjonalnych i UX.

Końcowa nota odbiorowa:
- [x] QoL gotowe do release (`2026-04-20`).

### Definition of Done (Aneks QoL)

- [x] Słownictwo akcji jest spójne między `SessionDetail`, `SessionNpcPanel`, `SessionHudTray`, `SessionSearchPanel` i `ThreadTreePanel`.
- [x] Użytkownik wykonuje scenariusz `dodaj -> przypnij -> odepnij -> usuń z sesji` bez zgadywania intencji UI.
- [x] Pokrycie testowe z QOL.4 przechodzi stabilnie.
- [x] Import/export i wielokampanijność nie regresują po zmianach QoL.
- [x] Wszystkie bramki jakości są zielone.
- [x] Changelog i aneks QoL zawierają końcowy zapis odbioru.
