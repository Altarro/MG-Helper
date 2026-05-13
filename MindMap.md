# Mapa myśli — plan backstage

Robocza lista zadań dla funkcji **Za kulisami -> Mapa myśli**. Na start to osobny eksperymentalny pakiet w backstage, inspirowany płynnością aplikacji SimpleMind, ale bez kopiowania jej interfejsu jeden do jednego. Zakres jest celowo ograniczony do encji, które już istnieją w systemie, i do logiki relacji obecnej w aplikacji.

Legenda: `[ ]` do zrobienia, `[~]` w trakcie, `[x]` ukończone.

## Stan pierwszego prototypu

- [x] Dodano zakładkę **Mapa myśli** w widoku **Za kulisami**.
- [x] Dodano lokalny szkic mapy bez zapisu encji.
- [x] Dodano kontrakt dozwolonych dzieci dla typów mapy.
- [x] Dodano wizualny canvas z gałęziami, plusami, przesuwaniem węzłów oraz przybliżaniem i oddalaniem.
- [x] Dodano panel właściwości zaznaczonego węzła.
- [x] Dodano podsumowanie szkicu.
- [x] Dodano testy kontraktu i podstawowego UI mapy.

## Decyzje bazowe

- [x] Mapa startuje jako osobny widok w module Za kulisami, nie jako ścieżka dodawania frontu.
- [x] Nie ruszamy działającego przepływu `Nowy front`.
- [x] Na starcie to eksperymentalny bajerek do planowania, a nie obowiązkowy element tworzenia frontów.
- [x] Edycja jest robocza: szkic mapy nie dotyka istniejących encji, dopóki świadomie nie podepniemy generowania.
- [x] Centralny węzeł jest zawsze typu `front`.
- [x] Plus przy węźle pokazuje wyłącznie dozwolone typy dzieci dla danego typu encji.
- [x] Nie dodajemy dowolnego grafu „wszystko ze wszystkim” w MVP.
- [x] Używamy istniejących typów encji: Front, Zagrożenie, Wątek, Wskazówka, Postać, Lokacja, Frakcja, Przedmiot.
- [x] Technicznie „Postać” mapuje się na istniejący typ `npc`.
- [x] Generowanie encji traktujemy jako kolejny etap po sprawdzeniu, czy mapa jest wygodna.

## Kierunek wizualny

- [x] Inspirować się feelingiem SimpleMind: lekki canvas, szybkie dodawanie gałęzi, płynne przechodzenie między myśleniem a porządkowaniem.
- [ ] Nie kopiować brandingu, ikon, dokładnego układu ani konkretnych rozwiązań UI SimpleMind.
- [ ] Węzły mają wyglądać jak tematy mapy myśli, nie jak ciężkie karty panelu.
- [ ] Gałęzie powinny być miękkie i czytelne: zakrzywione połączenia, jasna hierarchia, brak efektu korporacyjnego diagramu.
- [ ] Centralny front powinien być mocniejszym wizualnie węzłem startowym.
- [ ] Typy encji odróżniać subtelnie: kolor, ikona i etykieta, ale bez przeładowania.
- [ ] Plus przy węźle ma być naturalnym punktem rozwijania gałęzi, najlepiej blisko końca tematu.
- [ ] Priorytetem jest szybki flow: dodaj, nazwij, rozwiń, przesuń, zwiń.
- [ ] Zachować estetykę MG Helper i polskie etykiety UI.

## Miejsce w aplikacji

- [x] Funkcja ma żyć w module backstage jako **Mapa myśli**.
- [x] Dodać wejście w nawigacji/obszarze Za kulisami bez zmieniania obecnej listy frontów.
- [x] Ustalić docelowe miejsce: zakładka w istniejącym widoku backstage.
- [ ] Nie dodawać opcji `Mapa frontu` do przycisku `Nowy front` w MVP.
- [ ] Widok ma być możliwy do wyłączenia albo łatwego usunięcia, jeśli eksperyment się nie obroni.
- [ ] W pierwszym etapie szkic może działać lokalnie w stanie widoku; zapis i generowanie dopiero po decyzji.

## Kontrakt typów dzieci

- [x] Przyjąć roboczy kontrakt:

```ts
const allowedChildrenByEntityType = {
  front: ["threat", "clue"],
  threat: ["thread", "clue"],
  thread: ["clue", "npc", "location", "faction", "item"],
  faction: ["npc", "location", "item"],
  location: ["npc", "item"],
  npc: ["item"],
  clue: [],
  item: [],
} as const;
```

- [ ] Umieścić kontrakt w jednym współdzielonym miejscu domenowym, żeby korzystały z niego UI, walidacja i generator.
- [ ] Dodać etykiety PL i ikony dla typów mapy bez dublowania istniejących metadanych encji.
- [ ] Ustalić, czy kontrakt powinien być eksportowany jako część `shared/domain`, czy jako wewnętrzny kontrakt modułu backstage.

## Relacje generowane z mapy

- [ ] Zweryfikować aktualne relacje w kodzie i potwierdzić mapowanie przed implementacją.
- [ ] Zaplanować mapowanie domyślne:
  - [ ] `front -> threat`: utworzyć `belongs_to` jako `threat -> front`.
  - [ ] `front -> clue`: utworzyć `clues_for` jako `clue -> front`.
  - [ ] `threat -> thread`: utworzyć `affects` jako `thread -> threat`.
  - [ ] `threat -> clue`: utworzyć `clues_for` jako `clue -> threat`.
  - [ ] `thread -> clue`: utworzyć `clues_for` jako `clue -> thread`, jeśli obecna logika nadal to wspiera.
  - [ ] `faction -> npc`: utworzyć `belongs_to` jako `npc -> faction`.
  - [ ] `location -> npc`: utworzyć `contains` jako `location -> npc`.
  - [ ] `location -> item`: utworzyć `contains` jako `location -> item`.
  - [ ] `npc -> item`: utworzyć `owns` jako `npc -> item`.
  - [ ] `faction -> location`, `faction -> item`, `thread -> npc/location/faction/item`: potwierdzić, czy używamy `related_to`, `belongs_to`, czy istniejącego lokalnego wzorca.
- [ ] Dodać testy kontraktu relacji, żeby przyszłe zmiany modelu nie rozjechały mapy.

## Model roboczej mapy

- [ ] Zdefiniować typ `MindMapDraftNode`.
- [ ] Przechowywać minimalne pola:
  - [ ] `id`
  - [ ] `parentId`
  - [ ] `type`
  - [ ] `name`
  - [ ] `description`
  - [ ] `position`
  - [ ] `collapsed`
  - [ ] `order`
- [ ] Rozdzielić stan roboczy od encji Dexie aż do zatwierdzenia.
- [ ] Dodać walidację roboczą:
  - [ ] front ma nazwę;
  - [ ] każdy generowany węzeł ma nazwę;
  - [ ] typ dziecka jest dozwolony przez kontrakt;
  - [ ] brak cykli;
  - [ ] brak osieroconych węzłów poza korzeniem.
- [ ] Dodać funkcję podsumowania: ile encji i relacji powstanie po zatwierdzeniu.

## UX kreatora

- [x] Dodać wejście z modułu Za kulisami: `Mapa myśli`.
- [x] Ustalić, czy ekran ma być osobnym widokiem backstage, czy zakładką w istniejącym panelu.
- [ ] Zaprojektować canvas mapy:
  - [ ] pan;
  - [ ] zoom;
  - [ ] przeciąganie węzłów;
  - [ ] dodawanie dziecka z plusa;
  - [ ] szybka edycja nazwy węzła;
  - [ ] usuwanie węzła roboczego;
  - [ ] zwijanie gałęzi.
- [ ] Plus przy węźle pokazuje tylko typy z `allowedChildrenByEntityType`.
- [ ] Węzły liści (`clue`, `item`) nie pokazują plusa.
- [ ] Dodać boczny panel właściwości dla zaznaczonego węzła.
- [ ] Dodać panel podsumowania szkicu.
- [ ] W MVP przycisk generowania może być nieobecny albo oznaczony jako etap późniejszy.
- [ ] Jeśli dodamy zatwierdzanie, ma jasno komunikować: „Powstanie X encji i Y relacji”.
- [ ] Anulowanie lub wyjście usuwa tylko szkic, nie dotyka istniejących danych.

## Technologia renderowania

- [ ] Ocenić, czy wystarczy własny SVG/HTML layout, czy warto dodać bibliotekę grafową.
- [ ] Preferować brak nowej zależności w MVP, jeśli prosty renderer da radę.
- [ ] Jeżeli będzie potrzebna nowa biblioteka, sprawdzić licencję i koszt przed dodaniem.
- [ ] Kandydaci techniczni:
  - [ ] własny renderer SVG/HTML dla prostego drzewa;
  - [ ] React Flow / XYFlow, jeśli potrzebne są gotowe pan/zoom/drag/minimap;
  - [ ] canvas dopiero przy dużych mapach lub problemach wydajnościowych.
- [ ] Nie dodawać płatnych ani freemium narzędzi bez osobnej akceptacji.

## Generator encji

- [ ] Traktować generator jako etap po prototypie wizualnym, nie jako warunek pierwszego wdrożenia.
- [ ] Dodać funkcję generującą `NewEntity[]` i `NewRelation[]` z draftu.
- [ ] Generator ma być czystą funkcją możliwą do testowania bez UI.
- [ ] Uzupełniać bezpieczne domyślne `data` dla każdego typu:
  - [ ] `front`
  - [ ] `threat`
  - [ ] `thread`
  - [ ] `clue`
  - [ ] `npc`
  - [ ] `location`
  - [ ] `faction`
  - [ ] `item`
- [ ] Przy zapisie używać istniejących operacji DB (`addEntity`, `addRelation`) zamiast nowych wejść infrastrukturalnych.
- [ ] Zapis wykonywać w transakcji, jeśli obecne API DB na to pozwala.
- [ ] Po późniejszym podpięciu generowania przejść do szczegółów nowo utworzonego frontu.

## Testy

- [ ] Test kontraktu `allowedChildrenByEntityType`.
- [ ] Test walidacji niedozwolonego dziecka.
- [ ] Test generowania frontu z zagrożeniem i wskazówką.
- [ ] Test generowania zagrożenia z wątkiem i wskazówką.
- [ ] Test generowania wątku z postacią, lokacją, frakcją i przedmiotem.
- [ ] Test generowania frakcji z postacią, lokacją i przedmiotem.
- [ ] Test generowania lokacji z postacią i przedmiotem.
- [ ] Test generowania postaci z przedmiotem.
- [ ] Test UI: plus pokazuje tylko dozwolone typy dzieci.
- [ ] Test UI: zatwierdzenie tworzy encje i relacje.
- [ ] Test UI: anulowanie nie tworzy encji.

## Etapy wdrożenia

- [x] Faza 1 — wejście **Za kulisami -> Mapa myśli** i lokalny szkic bez zapisu encji.
- [x] Faza 2 — wizualna mapa inspirowana flow SimpleMind: plusy, szybka edycja, pan, zoom i podstawowy layout.
- [ ] Faza 3 — kontrakt typów dzieci i walidacja szkicu.
- [ ] Faza 4 — panel podsumowania oraz testy UI dla samego bajerka.
- [ ] Faza 5 — czysty generator encji i relacji, nadal bez podpinania pod `Nowy front`.
- [ ] Faza 6 — dopiero po sprawdzeniu: jawne podpięcie generowania i przejście do frontu.
- [ ] Faza 7 — dopracowanie ergonomii: klawiatura, auto-layout, zwijanie gałęzi.

## Pytania otwarte

- [ ] Czy szkice map mają być zapisywane między sesjami, czy w MVP wystarczy stan jednorazowy?
- [x] Czy kreator mapy ma żyć pod `fronts`, czy w module backstage? Decyzja: backstage.
- [x] Czy widok ma być osobną trasą backstage, czy sekcją w obecnym widoku Za kulisami? Decyzja: zakładka w obecnym widoku.
- [ ] Czy `thread -> clue` jest oficjalnie wspieraną relacją, czy tylko działa w testach i UI?
- [ ] Jaką relacją spinać `thread -> npc/location/faction/item`?
- [ ] Jaką relacją spinać `faction -> location` i `faction -> item`?
- [ ] Czy przy generowaniu wszystkie encje dostają tag frontu/kampanii, czy tylko relacje wystarczą?
- [ ] Czy po zatwierdzeniu zachowujemy layout mapy jako metadane frontu na późniejszą edycję wizualną?

## Poza zakresem MVP

- [ ] Globalna mapa całej kampanii.
- [ ] AI generujące gałęzie.
- [ ] Import/eksport OPML.
- [ ] Integracja z przyciskiem `Nowy front`.
- [ ] Edycja istniejących frontów jako pełna dwukierunkowa synchronizacja mapy i encji.
- [ ] Dowolne linki między każdym typem encji.
- [ ] Współpraca wieloosobowa w czasie rzeczywistym.
