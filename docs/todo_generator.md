# TODO: Generator Inspiracji (propozycja wdrozenia)

Cel: dodac modul generatora tresci fabularnych zasilany slownikami i tabelami losowymi, z dostepem z `Sesja live` (panel `Inspiracje`) oraz konfiguracja w `Ustawienia -> Ustawienia generatora`.

## Etap 1: Fundament produktu i danych

### Sekcja 1.1: Zakres funkcjonalny i UX (MVP)
- [x] Zdefiniowac finalny zakres MVP: postac, lokacja, event table, tabele uzytkownika.
- [x] Uzgodnic jak ma dzialac losowanie pojedyncze vs seryjne (1 wynik, 5 wynikow, N wynikow).
- [x] Uzgodnic format wyniku dla postaci: `imie + przydomek + nazwisko`.
- [x] Uzgodnic format wyniku dla lokacji: `typ + nazwa`.
- [x] Uzgodnic czy event table zwraca tylko 1 wpis czy moze lancuch zdarzen.
- [x] Uzgodnic zachowanie dla brakow danych (np. brak nazwisk): fallback i komunikaty.
- [x] Rozpisac flow panelu `Inspiracje` w live (wybor typu, losuj, kopiuj, dodaj do notatki).
- [x] Uzgodnic miejsca zapisu historii losowan (sesja, globalnie, oba).
- [x] Uzgodnic jezyk i tone generated output (neutralny, dark fantasy, heroic, custom).
- [x] Zatwierdzic makiete UI dla `Ustawienia generatora`.

### Sekcja 1.2: Model danych generatora
- [x] Zaprojektowac encje `generatorPack` (zestaw danych).
- [x] Zaprojektowac encje `generatorTable` (nazwa, typ, wpisy, wagi).
- [x] Zaprojektowac encje `generatorEntry` lub strukture wpisow osadzonych.
- [x] Dodac typy tabel systemowych: `firstName`, `lastName`, `nickname`, `locationType`, `locationName`, `event`.
- [x] Dodac typy tabel custom uzytkownika (np. `custom:rumors`, `custom:loot`).
- [x] Zaprojektowac metadane wag i prawdopodobienstwa.
- [x] Zaprojektowac flage aktywnosci zestawu (aktywny/archiwalny).
- [x] Zaprojektowac relacje kampania -> zestawy generatora.
- [x] Zaprojektowac model historii losowan (`generatorRollLog`).
- [x] Przygotowac kontrakty TypeScript dla calego modulu.

### Sekcja 1.3: Import i walidacja danych
- [x] Zdefiniowac format importu CSV dla prostych list (jedna kolumna, opcjonalnie waga).
- [x] Zdefiniowac format importu JSON dla zlozonych tabel i zestawow.
- [x] Zdefiniowac schemat zapytań i generacji dla czatów AI - wykonanych przez użytkownika. Model zapytania. Tak by czat odpowiedział odpowienio sformatowanym słownikiem. (Może być jako opcja "Od AI?")
- [x] Dodac walidacje schematu importu (wymagane pola, typy, duplikaty).
- [x] Dodac walidacje limitow (np. max wpisow w tabeli, max znakow).
- [x] Dodac normalizacje danych (trim, unicode, puste rekordy).
- [x] Dodac raport bledow importu z numerami wierszy.
- [x] Dodac tryb "dry-run" importu bez zapisu.
- [x] Dodac merge strategy: dopisz, nadpisz, zastap tabele.
- [x] Dodac eksport tabel do CSV/JSON.
- [x] Przygotowac testowe paczki danych demo (PL i EN).

### Sekcja 1.4: Architektura i plan techniczny
- [x] Rozpisac architekture modulu generatora w `docs/architecture`.
- [x] Zdefiniowac warstwe serwisowa: `generatorService` + API losowania.
- [x] Zdefiniowac adapter persistence dla Dexie.
- [x] Zdefiniowac granice miedzy ustawieniami systemowymi a generatora.
- [x] Zaprojektowac seed domyslnych tabel systemowych.
- [x] Uzgodnic czy generator bedzie deterministic (seed RNG) czy tylko losowy.
- [x] Zaprojektowac API "preview roll" vs "commit roll".
- [x] Zaprojektowac API dla panelu `Inspiracje` (hooki live).
- [x] Zdefiniowac telemetry eventy (klik losuj, typ tabeli, czas akcji).
- [x] Przygotowac checkliste "Definition of Ready" dla Etapu 2.

## Etap 2: Core generator + Ustawienia generatora

### Sekcja 2.1: Silnik losowania
- [x] Zaimplementowac utility RNG z opcja seed.
- [x] Zaimplementowac losowanie z wagami.
- [x] Zaimplementowac losowanie bez powtorzen (opcjonalny tryb).
- [x] Zaimplementowac builder wyniku `Postac`.
- [x] Zaimplementowac builder wyniku `Lokacja`.
- [x] Zaimplementowac builder wyniku `Event table`.
- [x] Zaimplementowac builder wyniku `Custom table`.
- [x] Zaimplementowac fallbacki dla brakujacych segmentow.
- [x] Zaimplementowac zapis historii losowan.
- [x] Dodac testy jednostkowe silnika (determinism, weights, boundaries).

### Sekcja 2.2: Ustawienia -> Ustawienia generatora
- [x] Dodac nowa zakladke `Ustawienia generatora` obok `Ustawienia systemowe`.
- [x] Dodac widok listy zestawow generatora.
- [x] Dodac CRUD tabel systemowych w ramach zestawu.
- [x] Dodac CRUD tabel custom uzytkownika.
- [x] Dodac import CSV/JSON z podgladem.
- [x] Dodac eksport zaznaczonego zestawu.
- [x] Dodac walidacje formularzy i komunikaty bledow.
- [x] Dodac drag&drop zmiany kolejnosci wpisow.
- [x] Dodac szybkie duplikowanie tabeli.
- [x] Dodac testy integracyjne dla calej zakladki.

### Sekcja 2.3: API i hooki frontendowe
- [x] Dodac hook `useGeneratorPacks`.
- [x] Dodac hook `useGeneratorTables`.
- [x] Dodac hook `useGeneratorRoll`.
- [x] Dodac hook `useGeneratorRollHistory`.
- [x] Dodac selector aktywnego zestawu kampanii.
- [x] Dodac komendy `rollCharacter`, `rollLocation`, `rollEvent`, `rollCustom`.
- [x] Dodac cache i memoizacje dla duzych tabel.
- [x] Dodac debouncing wyszukiwania tabel custom.
- [x] Dodac obsluge optimistic UI dla prostych operacji.
- [x] Dodac testy hookow i kontraktow.

### Sekcja 2.4: UX i ergonomia generatora
- [x] Dodac "quick presets" (np. 5x postac, 3x lokacja).
- [x] Dodac opcje kopiowania wyniku jednym kliknieciem.
- [x] Dodac opcje "Losuj ponownie" na tym samym kontekście.
- [x] Dodac opcje przypiecia ulubionych tabel custom.
- [x] Dodac opcje filtrowania tabel custom po tagach.
- [x] Dodac podpowiedzi tooltip dla typow losowan.
- [x] Dodac klawisze skrótow dla szybkiego losowania.
- [x] Dodac informacje o zrodle wyniku (zestaw/tabela).
- [x] Dodac pref "auto-zapis do historii".
- [x] Dodac testy UX smoke (przeplywy klikowe).

## Etap 3: Integracja z Sesja live (panel Inspiracje)

### Sekcja 3.1: Panel boczny `Inspiracje`
- [x] Zmienic nazwe pozycji `Placeholder` na `Inspiracje`.
- [x] Dodac panel `Inspiracje` do raila z tym samym stylem jak pozostale sekcje.
- [x] Dodac wybor typu losowania: Postac, Lokacja, Event table, Custom table.
- [x] Dodac dynamiczne pole wyboru tabeli custom.
- [x] Dodac akcje `Losuj` + `Losuj ponownie`.
- [x] Dodac podglad ostatniego wyniku na gorze panelu.
- [x] Dodac historie ostatnich N losowan.
- [x] Dodac akcje `Kopiuj wynik`.
- [x] Dodac akcje `Dodaj do notatki sesji`.
- [x] Dodac akcje `Otworz Ustawienia generatora`.

### Sekcja 3.2: Powiazanie wynikow z ekosystemem sesji
- [x] Dodac mapowanie wyniku postaci na szybkie tworzenie NPC.
- [x] Dodac mapowanie wyniku lokacji na szybkie tworzenie Lokacji.
- [x] Dodac mapowanie eventu na szybka notatke z timestamp.
- [x] Dodac mapowanie custom result na wpis do notatek.
- [x] Dodac opcje "wstaw do sceny teraz" (NPC/lokacja).
- [x] Dodac opcje "zapisz jako szkic encji".
- [x] Dodac opcje tagowania wyniku (np. `inspiracja`, `improv`).
- [x] Dodac relacje wynikow z aktywna sesja (`appears_in` gdzie sensowne).
- [x] Dodac bezpieczniki, by nie tworzyc duplikatow przy wielokliku.
- [x] Dodac testy integracyjne z `SessionLive`.

### Sekcja 3.3: Wspolna logika scroll i ergonomia paneli
- [x] Potwierdzic jednolity model scrolla (wheel + drag + top button) dla calego raila.
- [x] Dodac "scroll-to-top" rowniez dla panelu `Inspiracje`.
- [x] Ujednolicic spacing i wysokosci sekcji w panelach.
- [x] Ujednolicic format naglowkow paneli i badge count.
- [x] Ujednolicic zachowanie focus i klawiatury w railu.
- [x] Dodac testy manualne overflow dla bardzo dlugich list wynikow.
- [x] Dodac testy dla malych viewportow.
- [x] Dodac testy dla duzych viewportow.
- [x] Dodac testy pointer drag kontra klikalne elementy.
- [x] Dodac checkliste visual QA dla wszystkich zakladek raila.

### Sekcja 3.4: Jakość i testy regresji live
- [x] Dodac testy jednostkowe panelu `Inspiracje`.
- [x] Dodac testy integracyjne przeplywu losowanie -> notatka.
- [x] Dodac testy integracyjne przeplywu losowanie -> tworzenie encji.
- [x] Dodac testy regresji dla `Wyszukaj` (scope sesja/kampania).
- [x] Dodac testy regresji dla `Wskazówki` i grupowania.
- [x] Dodac testy regresji hook-order w `SessionLive`.
- [x] Dodac testy wydajnosci dla duzych tabel (>10k rekordow).
- [x] Dodac testy odtwarzania sesji po reloadzie aplikacji.
- [x] Dodac testy blednych importow i rollbacku.
- [x] Przygotowac scenariusze UAT z MG.

## Etap 4: Stabilizacja, rollout i adopcja

### Sekcja 4.1: Migracje i kompatybilnosc danych
- [x] Dodac migracje bazy dla nowych encji generatora.
- [x] Dodac bezpieczne domyslne wartosci przy brakach.
- [x] Dodac migracje starych ustawien (jesli potrzebne).
- [x] Dodac walidacje wersji danych po starcie aplikacji.
- [x] Dodac mechanizm naprawczy dla uszkodzonych tabel.
- [x] Dodac eksport backupu przed migracja.
- [x] Dodac import backupu po migracji.
- [x] Dodac testy migracyjne na kopiach danych produkcyjnych.
- [x] Dodac monitoring bledow migracji.
- [x] Dodac procedure rollback.

### Sekcja 4.2: Dokumentacja i onboarding
- [x] Dodac dokument "Jak przygotowac tabele generatora".
- [x] Dodac dokument "Jak importowac CSV/JSON".
- [x] Dodac dokument "Jak uzywac panelu Inspiracje przy stole".
- [x] Dodac FAQ najczestszych bledow importu.
- [x] Dodac wzorcowe paczki danych do pobrania.
- [x] Dodac hinty onboardingowe w UI (pierwsze uruchomienie).
- [x] Dodac checklisty "session prep" i "in-session use".
- [x] Dodac screencasty/gify flowow krytycznych.
- [x] Dodac changelog dedykowany modulowi generatora.
- [x] Dodac notatke dla supportu i QA.

### Sekcja 4.3: Telemetria i iteracje po wdrozeniu
- [x] Dodac metryke liczby losowan per typ.
- [x] Dodac metryke konwersji losowanie -> notatka/encja.
- [x] Dodac metryke czestosci uzycia custom tables.
- [x] Dodac metryke najczesciej wybieranych zestawow.
- [x] Dodac metryke porzuconych importow.
- [x] Dodac panel insightow dla zespolu produktowego.
- [x] Dodac formularz feedbacku bezposrednio z `Inspiracje`.
- [x] Dodac review feedbacku co sprint.
- [x] Dodac backlog "quick wins" po pierwszym rollout.
- [x] Dodac backlog "v2 advanced generation".

### Sekcja 4.4: Release plan i kryteria akceptacji
- [x] Zdefiniowac kryteria Go/No-Go dla produkcji.
- [x] Dopracowac prompt AI i kontrakt odpowiedzi na bazie realnych pakietow (iteracje jakosci przed release).
- [x] Wymusic zestaw slow kluczowych przy generowaniu AI (typ tabeli, klimat, domena, tagi osiowe, jezyk, format output) i walidowac ich obecnosc przed akceptacja importu.
- [x] Dodac jawny "AI generation contract" do UI i docs (w tym mapowanie wymaganych keywordow na pola JSON), aby model nie zwracal niespojnych payloadow.
- [x] Dodac fallback parsera dla pojedynczego obiektu `pack` (auto-wrap do `packs[]`) + czytelny komunikat, gdy payload nie spelnia kontraktu.
- [x] Wprowadzic slownik kontrolowany tagow oraz normalizacje synonimow/liczby pojedynczej-mnogiej.
- [x] Dodac walidacje kompatybilnosci tagow miedzy tabelami laczonymi (`locationType` <-> `locationName` i analogiczne pary).
- [x] Dodac checklistę jakosci paczek AI: spojne tagi, pokrycie osi tematycznych, brak luk `male/female/unisex`, sensowne wagi.
- [x] Przygotowac release notes dla zespolu.
- [x] Przygotowac release notes dla uzytkownikow.
- [x] Ustalic etapowy rollout (beta -> stable).
- [x] Ustalic ownerow incident response po release.
- [x] Ustalic SLA na krytyczne bugi generatora.
- [x] Ustalic SLA na poprawki UX.
- [x] Przeprowadzic finalny audit testow E2E.
- [x] Przeprowadzic finalny audit wydajnosci.
- [ ] Zamknac projekt etapem retro + decyzja o v2.

---

## Notatki projektowe do dyskusji z zespolam
- Panel boczny w `Sesja live`: docelowa nazwa `Inspiracje`.
- `Ustawienia` dzielimy na:
  - `Ustawienia systemowe` (obecne)
  - `Ustawienia generatora` (nowe)
- Priorytet MVP: jakosc danych i ergonomia losowania > zaawansowane "AI-like" funkcje.
- Zasada UX: jeden wspolny scroll raila + spojnosc wygladu wszystkich paneli.
