# Audyt jakościowy MG Helper

## Zakres i cel audytu

Celem audytu jest ocena jakości produktu w czterech perspektywach:

- użyteczność (UX operacyjny podczas realnej pracy MG),
- dostępność (a11y),
- przejrzystość interfejsu i informacji,
- kompletność podglądu sesji live względem możliwości systemu.

Dokument zawiera także listę możliwych usprawnień z priorytetami oraz wskazanie:

- co system już potrafi, ale nie jest to dobrze widoczne w sesji live,
- czego obecnie nie da się zrobić, a byłoby praktycznie wartościowe.

---

## Metoda oceny

Audyt wykonano na podstawie analizy architektury i implementacji UI/modułów domenowych. Szczególnie przeanalizowano:

- shell aplikacji, routing i nawigację,
- komponenty bazowe UI (modale, dialogi, wyszukiwarka),
- przepływ sesji: lista, detal, live, cleanup, report,
- logikę stanu live, sygnałów sesji i lifecycle zagrożeń,
- obszary ustawień i konfiguracji zachowania.

---

## Mapa produktu (kontekst techniczny)

Najważniejsze obszary aplikacji:

- **App shell i nawigacja**: `src/app/App.tsx`, `src/app/router.tsx`, `src/app/layout/AppShell.tsx`, `src/app/layout/PrimarySidebar.tsx`, `src/app/layout/PrimaryTopBar.tsx`.
- **Komponenty bazowe UI**: `src/shared/components/Modal.tsx`, `src/shared/components/ConfirmDialog.tsx`, `src/shared/components/Backdrop.tsx`, `src/shared/components/SearchBar.tsx`.
- **Moduł sesji**:
  - widoki: `src/modules/sessions/components/SessionList.tsx`, `SessionDetail.tsx`, `SessionLive.tsx`, `SessionCleanup.tsx`, `SessionReport.tsx`,
  - live state: `src/modules/sessions/hooks/useLiveSessionState.ts`, `useLiveSessionQueries.ts`,
  - operacje/dane live: `src/modules/sessions/utils/liveSessionData.ts`, `liveSessionCommands.ts`.
- **Panele operacyjne live**: `SceneCenter.tsx`, `SessionTimeline.tsx`, `SessionNowPlayingPanel.tsx`, `SpotlightTracker.tsx`, `ActiveThreatsPanel.tsx`, `SessionNpcPanel.tsx`, `ThreadTreePanel.tsx`, `SessionCluesPanel.tsx`, `SessionSearchPanel.tsx`, `SessionInspirationsPanel.tsx`.
- **Lifecycle zagrożeń i sygnały**:
  - `src/shared/utils/threatLifecycle.ts`,
  - `src/modules/sessions/utils/sessionSignals.ts`,
  - `src/modules/sessions/hooks/useSessionSignals.ts`,
  - `src/modules/sessions/hooks/useSessionEvents.ts`.

Wniosek: architektura domenowa jest czytelna i skalowalna; moduł sesji live jest funkcjonalnie bogaty.

---

## Ocena użyteczności (UX)

### Mocne strony

- **Wysoka gęstość operacyjna live**: użytkownik ma w jednym miejscu timeline, scenę, NPC, wątki, clue, zagrożenia, spotlight i narzędzia wyszukiwania.
- **Spójny model pracy MG**: flow „przed sesją -> live -> cleanup -> report” dobrze odpowiada rzeczywistemu cyklowi prowadzenia sesji.
- **Silne „quick actions”**: szybkie przypinanie/odpinanie encji, zmiany statusów, dopisywanie timeline i pracy ze sceną ograniczają koszt kliknięć.
- **Cleanup po sesji**: osobny widok porządkowania danych bardzo dobrze minimalizuje narastający „bałagan kampanii”.

### Słabe strony i ryzyka

- **Przeciążenie poznawcze w `SessionLive`**: wiele paneli i sygnałów równocześnie może przeciążać mniej doświadczonych użytkowników.
- **Niedokończone elementy obniżają zaufanie**: obecność placeholderów i paneli o statusie tymczasowym tworzy wrażenie funkcji „w pół drogi”.
- **Brak szerokiego undo/redo**: część akcji operacyjnych nie ma bezpiecznika, co zwiększa koszt błędu podczas szybkiej pracy.
- **Niejednorodna jakość copy**: pojedyncze artefakty kodowania/tekstu w UI obniżają postrzeganą jakość.

### Ocena ogólna UX

- **Dla power-usera (MG zaawansowany)**: bardzo dobry potencjał.
- **Dla użytkownika średniozaawansowanego**: wymaga lepszego prowadzenia kontekstem i progresywnego ujawniania opcji.

---

## Ocena dostępności (a11y)

### Co działa dobrze

- Modale i dialogi mają poprawne fundamenty semantyczne (`role="dialog"`, `aria-modal`) i mechanikę focusu.
- Widoczne są próby nadawania `aria-label` dla części przycisków ikonowych.
- Wyszukiwanie ma semantykę (`role="search"`) i wspiera skróty.

### Główne ryzyka a11y

- **Interakcje ukryte na hover**: akcje dostępne głównie po najechaniu myszą mogą być słabo odkrywalne dla klawiatury i technologii wspomagających.
- **Dużo zachowań pointer-first**: niestandardowe przewijanie/przeciąganie w panelach live może ograniczać dostępność bez równoważnych ścieżek klawiaturowych.
- **Nadmierna zależność od koloru**: sygnały stanu nie zawsze są wspierane równorzędnym oznaczeniem tekstowym.
- **Potencjalna niespójność focus-visible**: nie wszystkie interaktywne elementy dają równie czytelny feedback fokusu.

### Ocena ogólna a11y

Poziom bazowy jest dobry, ale aby osiągnąć wysoki standard dostępności, potrzebna jest konsekwencja w interakcjach klawiaturowych i sygnałach niekolorystycznych.

---

## Ocena przejrzystości interfejsu

### Co jest przejrzyste

- Architektura informacji na poziomie modułów jest logiczna.
- Topbar i breadcrumb poprawiają orientację kontekstową.
- Nazewnictwo domenowe jest czytelne i osadzone w realnym workflow MG.

### Co obniża przejrzystość

- **Za dużo równorzędnych bodźców w live**: trudniej szybko odróżnić „co najważniejsze teraz” od „co pomocnicze”.
- **Niedostateczna hierarchia priorytetów paneli**: część sekcji wygląda równie ważnie, mimo że różni się wagą operacyjną.
- **Sygnały tymczasowości** (placeholder/foundation) pogarszają postrzeganie dojrzałości.

### Ocena ogólna przejrzystości

Produkt jest strukturalnie uporządkowany, ale wymaga dodatkowej warstwy „prowadzenia uwagi”, szczególnie w `SessionLive`.

---

## Podgląd sesji live: co jest, czego nie widać, czego brakuje

## 1) Co jest możliwe i widoczne w podglądzie live

W bieżącym UI live można:

- prowadzić timeline sesji (wpisy, porządkowanie),
- zarządzać sceną i obecnymi encjami (NPC/wątki/lokacje),
- pracować na zagrożeniach i ich statusach,
- operować na clue i relacjach clue-front/threat/thread,
- korzystać z wyszukiwarki kontekstowej,
- śledzić i sterować spotlightem,
- obsługiwać „now playing” i elementy tempa sesji.

To jest realnie użyteczny zestaw do pracy „w trakcie grania”.

## 2) Co system potrafi, ale sesja live tego nie pokazuje wystarczająco

Na poziomie danych i logiki system zbiera więcej niż to, co użytkownik widzi:

- **sygnały sesji (`session_signal`)**: typ zmian, metadane, źródło, zmienione pola,
- **kontekst mutacji encji** i ich przyczyny,
- **dane wspierające analizę przebiegu sesji** (w tym część telemetryki i stanów pośrednich),
- **stan pomocniczy live** utrzymywany lokalnie (np. elementy kontekstu sesji).

Brakuje zatem czytelnej ekspozycji „dlaczego i kiedy coś się zmieniło”.

## 3) Co jest niemożliwe teraz, a byłoby bardzo wartościowe

- **Pełny Activity Feed / Audit Trail live** (kto/co/kiedy, filtrowanie, wyszukiwanie, eksport).
- **Analiza post-session spotlight i pacingu** (np. udział czasu graczy/MG, dynamika scen).
- **Undo/redo dla krytycznych akcji** w live.
- **Trendy wielosesyjne** (presja zagrożeń, tempo odkrywania clue, dług narracyjny).
- **Warstwa współdzielenia/live-sync między urządzeniami** (obecnie dominują mechanizmy lokalne).
- **Centralne feature flags** do bezpiecznego wdrażania i testowania nowych paneli/funkcji.

---

## Rekomendacje usprawnień

## Uzgodnione priorytety (notatki robocze)

Na bazie przeglądu i Twoich uwag, za najważniejsze na ten moment uznajemy:

1. **Raport sesji jako wyróżnik produktu**  
   Szczególnie wartościowe: czas trwania sesji, porównanie planu scen (ETA) do przebiegu, zmiany scen w czasie, przebieg spotlightu.
2. **Bezpieczniki operacyjne**  
   Brak szerokiego undo/redo podnosi koszt błędu podczas szybkiej pracy live.
3. **Jakość copy i spójność językowa**  
   Artefakty kodowania i nierówna jakość tekstów wpływają negatywnie na odbiór jakości produktu.
4. **Czytelność sygnałów poza kolorem**  
   Stany wymagają silniejszych oznaczeń tekstowych/ikonowych, nie tylko barwy.
5. **Spójny focus-visible i nawigacja klawiaturowa**  
   Interaktywne elementy powinny dawać jednakowo czytelny feedback fokusu.
6. **Lepsza ekspozycja danych, które już zbieramy**  
   Sygnały sesji, kontekst mutacji encji i dane pomocnicze live powinny być widoczne dla MG.

## Priorytet 1: Quick wins (niski koszt, szybki efekt)

1. Naprawić wszystkie problemy copy/encoding w UI i zrobić szybki przegląd językowy.
2. Dodać panel „Sygnały sesji” w `SessionLive` (nawet w wersji podstawowej: lista zdarzeń + filtry).
3. Oznaczyć placeholdery jako „w przygotowaniu” albo tymczasowo je ukryć.
4. Ujednolicić style `focus-visible` i dostępność akcji ukrytych na hover.
5. Dodać prosty onboarding kontekstowy przy pierwszym wejściu do live.

### Tasklista P1 (propozycja realizacji, zarchiwizowana)

- Przegląd i poprawa copy/encoding w całym UI (szczególnie sidebar/live/topbar).
- Standard komponentu „StatusBadge” z obowiązkowym tekstem stanu + opcjonalnym kolorem.
- Wspólny styl `focus-visible` dla button/link/chip/icon-button + smoke test klawiaturą.
- MVP panelu „Sygnały sesji” (`session_signal`): lista, timestamp, typ, źródło, zmienione pola.
- Oznaczenie placeholderów etykietą „W przygotowaniu” lub chwilowe wycofanie z live.
- Mikro-onboarding w `SessionLive`: 3-5 wskazówek „co gdzie znajdziesz”.

## Priorytet 2: Usprawnienia średnie (1-3 sprinty)

1. Połączyć timeline użytkownika z systemowymi sygnałami w jeden „Live Activity Timeline”.
2. Rozszerzyć `SessionReport` o:
   - podsumowanie sygnałów sesji,
   - przebieg zmian statusów zagrożeń,
   - podsumowanie spotlight.
3. Wprowadzić cofanie najczęstszych operacji o wysokim ryzyku pomyłki.
4. Dodać klawiaturowe alternatywy dla interakcji pointer-first.
5. Rozdzielić „core controls” i „advanced controls” w `SessionLive`.

### Tasklista P2 (propozycja realizacji, zarchiwizowana)

- Nowy moduł `SessionReport+`:
  - czas trwania sesji (start/stop, aktywny czas),
  - oś zmian scen vs ETA (plan vs rzeczywistość),
  - podsumowanie spotlight (udział czasu MG/graczy, kolejki oczekiwania),
  - podsumowanie zmian statusów zagrożeń i ticków.
- „Live Activity Timeline”: połączenie timeline ręcznego z sygnałami systemowymi.
- Undo dla akcji najwyższego ryzyka (status threat, pin/unpin, szybkie usunięcia).
- Checklista a11y dla paneli pointer-first (alternatywy klawiaturowe, role, opisy stanu).
- Reorganizacja `SessionLive` na sekcję podstawową i zaawansowaną.

## Priorytet 3: Kierunek strategiczny

1. Zbudować ujednolicony dziennik zdarzeń sesji (event journal) jako fundament analityki i audytu.
2. Dodać warstwę jakości sesji (metryki i wskaźniki trendów między sesjami).
3. Wprowadzić formalny mechanizm feature flags dla kontrolowanego rolloutu.
4. Rozważyć model współpracy wieloosobowej/live-sync (jeśli to zgodne z roadmapą produktu).

### Tasklista P3 (propozycja realizacji, zarchiwizowana)

- Unified Session Journal (event model + retencja + filtrowanie + eksport).
- Warstwa analityczna cross-session (trendy tempa, spotlight, clue flow, pressure).
- Feature flags dla paneli live i eksperymentów UX.
- Ocena opłacalności i zakresu live-sync/collaboration (warianty techniczne + koszt).

---

## Backlog developerski (ready for sprint)

Poniżej backlog w układzie: **epik -> task -> kryteria akceptacji (AC)**.  
Założenie: zachowujemy obecny sens struktury menu, ale poprawiamy ergonomię i spójność.

### Backlog wdrożeniowy (wersja finalna)

Kolejność realizacji od teraz:

1. **P0 — Fundament procesu sesji**
   - EPIC G1, G2, G3, G4 (cleanup gate, draft, finalizacja, blokada nowej sesji).
   - EPIC A2 (status raportu zgodny z polityką nadpisywania).
2. **P1 — Widoczność i bezpieczeństwo operacyjne**
   - EPIC B1, B2, B5 (sygnały live: skrót na osi czasu + szczegóły na żądanie),
   - EPIC C1, C2, C3 (undo dla akcji krytycznych i lifecycle).
3. **P1 — Spójność danych świata**
   - EPIC B4 + B6 (szybkie lifecycle actions + dziedziczenie zniszczenia lokacji),
   - EPIC F1/F2 (copy, encoding i guardrails jakości).
4. **P2 — Używalność strategiczna**
   - EPIC A1/A3 (metryki i eksport raportu),
   - EPIC E (nawigacja statusami i skrótami, bez nowego navbaru),
   - EPIC dotyczące grafu/backstage/notatek.

Definicja startu implementacji:
- najpierw zamykamy zadania, które stabilizują cykl `live -> cleanup -> report`,
- dopiero potem rozszerzamy analitykę i dodatki UX.

### EPIC A: SessionReport+ jako wyróżnik produktu

**Cel biznesowy**: raport sesji ma dawać MG realny materiał do retrospektywy i planowania kolejnej sesji.

#### A1. Silnik metryk raportu sesji
- **Task**:
  - policzyć czas trwania sesji (start/stop, aktywny czas),
  - zbudować metryki zmian scen i odchyleń od ETA,
  - podsumować spotlight (MG/gracze, czasy aktywności/oczekiwania),
  - agregować zmiany statusów zagrożeń i ticki.
- **AC**:
  - raport pokazuje wszystkie 4 grupy metryk dla sesji z danymi,
  - dla sesji bez pełnych danych raport pokazuje komunikat „brak danych” zamiast pustych wartości,
  - metryki są deterministyczne (ten sam input -> ten sam wynik).

#### A2. Widok `SessionReport+` (UX + czytelność)
- **Task**:
  - podzielić raport na sekcje: Czas, Sceny vs ETA, Spotlight, Zagrożenia, Wnioski,
  - dodać krótkie interpretacje („co to znaczy”) pod kluczowymi metrykami,
  - dodać wersję „skrót 60s” i wersję szczegółową.
  - zapisywać raport jako artefakt sesji (`session report snapshot`) dostępny z poziomu detalu sesji.
  - przy ponownym uruchomieniu tej samej sesji po `cleanup` wyświetlić komunikat o skutkach: „uruchomienie nowego przebiegu nadpisze raport bieżącej sesji”.
  - przyjąć politykę produktu: raport sesji jest zawsze nadpisywany przy nowym przebiegu (bez archiwizacji).
  - uprościć status raportu w UI do dwóch stanów: `Raport dostępny` / `Brak raportu (po ponownym uruchomieniu sesji)`.
- **AC**:
  - użytkownik odczytuje status sesji w < 60 sekund (sekcja skrótowa),
  - każda sekcja ma nagłówek, opis i stan empty/error/success,
  - brak wskaźników opartych wyłącznie na kolorze,
  - przed restartem sesji po `cleanup` użytkownik dostaje jednoznaczne potwierdzenie operacji,
  - po restarcie raport poprzedniego przebiegu jest nadpisany zgodnie z polityką produktu,
  - UI nie używa statusu „report stale”; status raportu pozostaje jednoznaczny.

#### A3. Eksport raportu
- **Task**:
  - eksport do Markdown (MVP) i kopiowanie podsumowania do schowka,
  - sekcja „następne kroki na kolejną sesję”.
- **AC**:
  - eksport zawiera wszystkie sekcje raportu i timestamp wygenerowania,
  - zawartość eksportu jest czytelna bez kontekstu UI.

---

### EPIC B: Live Activity Feed i ekspozycja danych, które już mamy

**Cel biznesowy**: MG ma pełny obraz „co się zmieniło, kiedy i dlaczego” bez przeszukiwania kilku paneli.

#### B1. Panel „Sygnały sesji” (MVP)
- **Task**:
  - lista sygnałów `session_signal`: czas, typ, źródło, zmienione pola,
  - filtry: typ/źródło/encja,
  - klik do przejścia do encji powiązanej.
  - dodać kontekstowy „powrót do aktywnej sesji live” po wejściu w encję z panelu sygnałów.
  - utrzymać stos nawigacji dla widoków zagnieżdżonych, ale bez wymuszania powrotu przez listy pośrednie.
- **AC**:
  - panel ładuje się w `SessionLive` bez zauważalnych lagów przy standardowej sesji,
  - filtr działa bez przeładowania widoku,
  - każdy rekord ma tekstowy opis zmiany,
  - przejście sygnał -> encja -> powrót przenosi użytkownika bezpośrednio do aktywnej sesji live (jeśli nadal trwa),
  - dla zagnieżdżonych podwidoków działa poprawny „back stack” bez utraty kontekstu.

#### B2. Scalony „Live Activity Timeline”
- **Task**:
  - połączyć timeline ręczny i zdarzenia systemowe w jedną oś czasu,
  - rozróżnienie wpisu użytkownika vs sygnału systemowego,
  - domyślnie pokazywać sygnały systemowe w trybie skondensowanym (zwinięte), z opcją rozwinięcia szczegółów.
- **AC**:
  - użytkownik widzi jednolity porządek chronologiczny,
  - typ wpisu jest rozpoznawalny także bez koloru (ikoną i etykietą),
  - można filtrować typy wpisów jednym kliknięciem,
  - wpis systemowy ma czytelny format skrócony, np. `21:37 Clara Katilia — Nie żyje (Automat)`,
  - rozwinięcie wpisu pokazuje metadane (źródło, pola before/after, kontekst).

#### B3. Widoczność kontekstu mutacji
- **Task**:
  - pokazać „co było przed/po” dla najważniejszych zmian (status, pin, tick),
  - dodać „źródło zmiany” (manual/system/automatyka).
- **AC**:
  - co najmniej dla krytycznych akcji dostępny jest opis before/after,
  - przy każdej zmianie widoczne jest źródło.

#### B4. Szybkie akcje lifecycle z poziomu `SessionLive`
- **Task**:
  - dodać szybkie akcje statusu dla encji używanych operacyjnie w live:
    - NPC: „Oznacz: nie żyje / przywróć”,
    - Lokacja: „Oznacz: zniszczona / przywróć”,
    - Przedmiot: „Oznacz: utracony/zniszczony / przywróć”,
  - każda akcja zapisuje sygnał sesji z powodem zmiany (krótki preset + własny opis),
  - dla akcji krytycznych dodać potwierdzenie i kompatybilność z undo.
- **AC**:
  - status można zmienić bez wychodzenia z `SessionLive`,
  - zmiana statusu ma ślad w `session_signal` (kto/co/kiedy/powód),
  - UI pokazuje stan tekstowo (nie tylko kolorem),
  - cofnięcie działa dla zmian wykonanych z quick action.

#### B6. Dziedziczenie statusu zniszczenia w drzewie lokacji
- **Task**:
  - wprowadzić regułę domenową: gdy lokacja nadrzędna dostaje status `zniszczona`, lokacje potomne dziedziczą ten status domyślnie,
  - umożliwić wyjątek na poziomie potomnej lokacji: `Oznacz jako ocalałe`,
  - rejestrować dziedziczenie i wyjątki w `session_signal`.
- **AC**:
  - zmiana statusu lokacji nadrzędnej propaguje się na potomne zgodnie z regułą,
  - użytkownik może jawnie oznaczyć wyjątki i są one zachowane,
  - raport/cleanup pokazuje, które lokacje są zniszczone dziedzicznie, a które oznaczone jako ocalałe.

#### B5. „Sygnały live” jako panel drugiego planu
- **Task**:
  - utrzymać panel sygnałów jako domyślnie zwinięty/ukryty blok pomocniczy, aby nie przeciążać głównego widoku,
  - dodać szybki toggle „Pokaż sygnały” oraz licznik nowych sygnałów od ostatniego otwarcia,
  - zsynchronizować panel z osią czasu (to samo zdarzenie, dwa widoki: skrót i szczegóły).
- **AC**:
  - domyślny stan nie zwiększa obciążenia poznawczego w `SessionLive`,
  - użytkownik może jednym kliknięciem przejść od skrótu na osi czasu do szczegółu sygnału,
  - brak duplikowania treści między osią czasu i panelem (jedno źródło prawdy).

---

### EPIC C: Bezpieczeństwo operacyjne (undo/redo)

**Cel biznesowy**: ograniczyć koszt pomyłki i stres pracy live.

#### C1. Undo dla akcji wysokiego ryzyka
- **Task**:
  - wdrożyć undo dla: zmiana statusu zagrożenia, pin/unpin, usunięcia z sesji,
  - dodać toast z akcją „Cofnij” w oknie czasowym.
- **AC**:
  - cofnięcie odtwarza stan poprawnie i idempotentnie,
  - użytkownik ma jednoznaczny feedback po cofnięciu,
  - brak regresji w lifecycle zagrożeń.

#### C2. Fundament pod rozszerzalne undo/redo
- **Task**:
  - zdefiniować kontrakt akcji odwracalnych,
  - rejestrować operacje w kolejce undo.
- **AC**:
  - nowa akcja może być dodana do undo bez refaktoru całego modułu,
  - testy jednostkowe pokrywają scenariusze podstawowe i edge-case.

#### C3. Undo dla zmian lifecycle encji
- **Task**:
  - objąć undo akcje „nie żyje / zniszczone / utracone” uruchamiane w live,
  - przywracać poprzedni status i poprzedni powód zakończenia.
- **AC**:
  - cofnięcie odtwarza status i metadane powodu 1:1,
  - brak utraty spójności w raportach i sygnałach sesji po undo.

---

### EPIC G: Cleanup jako brama jakości danych (hard gate)

**Cel biznesowy**: MG może skupić się na prowadzeniu live, a pełne porządki i decyzje domykające wykonuje dopiero w `SessionCleanup` bez ryzyka chaosu danych.

#### G1. Pełny „inbox zmian” w `SessionCleanup`
- **Task**:
  - pokazać wszystkie zmiany wymagające decyzji po sesji:
    - encje „wiszące” (niespójne relacje, brak lokacji, osierocone powiązania),
    - encje utworzone „na biegu” podczas live,
    - zmiany statusów/lifecycle wykonane w live,
    - wpisy i sygnały oznaczone jako „do potwierdzenia po sesji”.
    - notatki z live wymagające decyzji: `zachowaj / archiwizuj / usuń`.
  - grupować zmiany na: „wymaga decyzji”, „sugerowane”, „informacyjne”.
- **AC**:
  - `SessionCleanup` zawiera kompletną listę otwartych zmian dla danej sesji,
  - każda pozycja ma rekomendowaną akcję i wpływ na dane,
  - użytkownik może filtrować i wyszukiwać po typie zmiany,
  - notatki oznaczone jako „zachowaj” są dostępne w raporcie sesji.

#### G2. Cleanup jako draft (odłóż i wróć)
- **Task**:
  - wprowadzić stan roboczy cleanupu (draft), zapisywany w trakcie pracy,
  - umożliwić przerwanie cleanupu i powrót w dowolnym momencie bez utraty decyzji cząstkowych,
  - pokazywać postęp cleanupu (% i liczba otwartych decyzji).
- **AC**:
  - użytkownik może zamknąć aplikację i wrócić do cleanupu z zachowaniem stanu,
  - draft wskazuje, które decyzje są zatwierdzone, a które nadal otwarte,
  - zapis draftu jest automatyczny i odporny na przypadkowe wyjście.

#### G3. Finalizacja cleanupu jako jedyny moment zapisu do encji
- **Task**:
  - do czasu finalizacji trzymać decyzje cleanupu jako staging (bez trwałej mutacji encji docelowych),
  - przy „Zakończ cleanup” wykonać atomowy commit zmian do encji,
  - dodać walidację pre-commit (spójność relacji, wymagane pola, brak konfliktów).
- **AC**:
  - przed finalizacją encje źródłowe nie są trwale modyfikowane przez decyzje cleanup draftu,
  - finalizacja zapisuje wszystkie zatwierdzone zmiany albo żadnej (all-or-nothing),
  - po finalizacji stan sesji = „cleanup completed”.

#### G4. Blokada nowej sesji bez ukończonego cleanupu
- **Task**:
  - dodać globalny guard: nie można rozpocząć nowej sesji, jeśli istnieje poprzednia sesja z niezamkniętym cleanupem,
  - pokazać jasny komunikat i CTA „Przejdź do cleanupu”,
  - guard powinien działać z każdego punktu startu nowej sesji (lista sesji, skróty, akcje szybkie).
- **AC**:
  - start nowej sesji jest technicznie zablokowany przy `cleanup pending`,
  - użytkownik zawsze dostaje ścieżkę powrotu do przerwanego cleanupu,
  - brak możliwości obejścia blokady przez alternatywne wejścia w UI.

---

### EPIC D: Dostępność i spójność UI

**Cel biznesowy**: aplikacja jest równie czytelna i sterowalna myszą, klawiaturą i przy ograniczeniach percepcji koloru.

#### D1. Spójny `focus-visible`
- **Task**:
  - ujednolicić styl fokusu dla button/link/chip/icon-button/nav-item,
  - przejrzeć breadcrumb, sidebar i panele live.
- **AC**:
  - każdy interaktywny element ma widoczny stan fokusu,
  - przejście TAB-em po kluczowych ekranach jest przewidywalne.

#### D2. Odejście od sygnałów tylko kolorystycznych
- **Task**:
  - wdrożyć wzorzec `StatusBadge` (tekst + ikona + opcjonalny kolor),
  - zastąpić miejsca, gdzie stan komunikuje wyłącznie kolor.
- **AC**:
  - wszystkie kluczowe statusy mają etykietę tekstową,
  - informacja o stanie jest czytelna także w skali szarości.

#### D3. Interakcje hover/pointer-first
- **Task**:
  - zapewnić odkrywalność akcji bez hover (widoczne przy focusie, skróty, menu kontekstowe),
  - dodać alternatywne ścieżki klawiaturowe.
- **AC**:
  - żadna akcja krytyczna nie jest „ukryta tylko pod hover”,
  - najważniejsze operacje live można wykonać bez myszy.

---

### EPIC E: Menu i architektura informacji (bez burzenia obecnego układu)

**Cel biznesowy**: zachować sens obecnego menu i zwiększyć szybkość orientacji użytkownika.

#### Stan obecny (co zostaje)
- grupowanie domenowe w sidebarze jest sensowne (`Fabuła`, `Świat gry`, `Prowadzenie`, `Narzędzia`),
- topbar i breadcrumb dobrze wspierają orientację kontekstową,
- osobna sekcja start/settings jest czytelna.

#### E1. Audyt nawigacji i telemetryka klików (niewidoczne domyślnie dla użytkownika)
- **Task**:
  - zmierzyć, które pozycje menu są używane najczęściej i w jakich sekwencjach,
  - zidentyfikować „zimne” i „gorące” ścieżki,
  - telemetrykę udostępnić wyłącznie w narzędziach deweloperskich/raportach wewnętrznych (bez ekspozycji w standardowym UI).
- **AC**:
  - raport użycia menu za min. 2 tygodnie danych,
  - rekomendacje zmian oparte na danych, nie intuicji,
  - brak domyślnej widoczności metryk telemetrycznych dla końcowego użytkownika aplikacji.

#### E2. Usprawnienia sidebaru (inkrementalne)
- **Task**:
  - dodać „ulubione/szybki dostęp” (pin 3-5 widoków),
  - dodać lokalny filtr/szukaj w menu,
  - dopracować etykiety i mikrocopy (w tym naprawa artefaktów kodowania).
- **AC**:
  - użytkownik może otworzyć najczęstszy widok w <= 2 interakcjach,
  - brak mojibake i niespójności językowych.

#### E3. Kontekst live w nawigacji
- **Task**:
  - mocniej wyeksponować aktywną sesję live i szybki powrót do niej,
  - dodać skrót „Ostatnia sesja live” w obszarze prowadzenia,
  - dodać status procesu sesji w topbarze i nawigacji bez dokładania nowego navbaru (np. `Live`, `Cleanup wymagany`, `Raport dostępny` / `Brak raportu`).
- **AC**:
  - powrót do aktywnej sesji live zajmuje 1 klik z większości ekranów,
  - stan aktywnej sesji jest czytelny tekstowo i ikonowo,
  - status raportu jest jednoznaczny i zgodny z polityką nadpisywania.

---

### EPIC F: Jakość copy i i18n hygiene

**Cel biznesowy**: profesjonalny odbiór produktu i brak błędów językowych/encodingu.

#### F1. Audit i poprawa copy
- **Task**:
  - przejść wszystkie kluczowe etykiety, toasty, dialogi i panele live,
  - poprawić błędy, niespójności, placeholdery i artefakty.
- **AC**:
  - brak wykrytych artefaktów kodowania w UI,
  - spójny ton i nazewnictwo w całej aplikacji.

#### F2. Guardrails jakości tekstów
- **Task**:
  - dodać checklistę PR dla copy/a11y,
  - dodać testy/reguły wykrywające typowe uszkodzenia encodingu.
- **AC**:
  - PR z nowym tekstem nie przechodzi bez kontroli jakości copy,
  - automatyczne testy wychwytują regresję encodingu.

---

## Kolejność wdrożenia (proponowany plan 3 sprintów)

### Sprint 1 (foundation + szybka wartość)
- EPIC D1, D2 (focus-visible + statusy tekstowe),
- EPIC F1 (copy/encoding),
- EPIC B1 (panel sygnałów MVP),
- EPIC E2 (szybki dostęp + poprawki etykiet).

### Sprint 2 (wyróżnik produktowy)
- EPIC A1 i A2 (`SessionReport+` rdzeń + widok),
- EPIC B2 (scalony timeline),
- EPIC B4 (quick lifecycle actions w live),
- EPIC C1 (undo dla akcji wysokiego ryzyka).

### Sprint 3 (utrwalenie i skalowanie)
- EPIC A3 (eksport),
- EPIC B3 (before/after + source),
- EPIC C2 + C3 (fundament i undo lifecycle),
- EPIC G1 + G2 (inbox zmian + draft cleanup),
- EPIC E1 + E3 (telemetria menu + kontekst live),
- EPIC F2 (guardrails i automatyzacja jakości).

### Sprint 4 (twarde domknięcie procesu)
- EPIC G3 (atomowa finalizacja cleanupu),
- EPIC G4 (globalna blokada nowej sesji bez cleanupu),
- testy e2e dla flow: `live -> cleanup draft -> wznowienie -> finalizacja -> nowa sesja`.

---

## Definicja gotowości (DoR) i ukończenia (DoD)

### DoR (Definition of Ready)
- task ma cel biznesowy i miernik sukcesu,
- wskazane pliki/moduły dotknięte zmianą,
- opisane ryzyka regresji (live, lifecycle, a11y),
- uzgodnione AC i scenariusze testowe.

### DoD (Definition of Done)
- spełnione AC,
- testy manualne flow „sesja -> live -> report -> cleanup”,
- brak nowych błędów a11y krytycznych,
- brak regresji encoding/copy,
- aktualizacja dokumentacji (co dodano, jak używać).

---

## Dodatkowe doprecyzowania produktowe (uzgodnione)

1. **Status raportu po restarcie tej samej sesji**  
   Nie używamy semantyki „raport nieaktualny”. Obowiązuje model:
   - `Raport dostępny`,
   - `Brak raportu (po ponownym uruchomieniu sesji)`.

2. **Zegary — model trzech typów**
   - `zegar sesyjny` (tymczasowy, tylko na czas sesji; warianty 4 i 6 segmentów; zapis zakończenia: ręcznie wyłączony albo domknięty),
   - `zegar wolny` (narzędzie prowadzenia; już istnieje, wymaga lepszej ekspozycji użycia),
   - `zegar zagrożenia` (powiązany z zagrożeniem, aktualny model bazowy).

3. **Notatki live w cyklu sesji**  
   Notatki z live mają przechodzić przez cleanup (decyzja: zachowaj/archiwizuj/usuń) i zasilać raport sesji po zatwierdzeniu.

## Porównanie: stan systemu vs audyt (gap analysis)

Poniżej szybkie porównanie „jak jest teraz” vs „co zakłada backlog”.

### 1) `SessionCleanup` (największa luka)

- **Stan systemu (teraz)**:
  - cleanup już ma kilka sekcji jakościowych (NPC bez lokacji, lokacje bez rodzica, wiszące wątki, zakończone zagrożenia),
  - decyzje są zapisywane od razu do encji (bez warstwy draft),
  - są operacje destrukcyjne (`deleteEntity`) wykonywane bez etapu finalizacji.
- **Stan docelowy (audyt/backlog)**:
  - pełny inbox zmian po live, draft cleanupu, wznowienie pracy, finalizacja atomowa, blokada nowej sesji bez zamknięcia cleanupu.
- **Wniosek**:
  - to jest główny obszar ryzyka i najwyższy priorytet implementacyjny.

### 2) `SessionReport`

- **Stan systemu (teraz)**:
  - raport działa, ma eksport i druk, agreguje encje/notatki/zegary,
  - brak osi scen vs ETA, brak metryk spotlight i brak timeline sygnałów.
- **Stan docelowy**:
  - `SessionReport+` z metrykami przebiegu sesji i sekcją „co dalej”.
- **Wniosek**:
  - raport jest dobrym fundamentem, ale nie pełni jeszcze roli wyróżnika.

### 3) Live signals i widoczność zmian

- **Stan systemu (teraz)**:
  - sygnały sesji są zapisywane (`session_signal`), są agregowane w hookach,
  - w UI live ekspozycja jest szczątkowa (placeholder „Umarło w tej sesji”).
- **Stan docelowy**:
  - pełny panel sygnałów + scalony activity timeline + before/after.
- **Wniosek**:
  - dane już są, brakuje ich produktowej ekspozycji.

### 4) Nawigacja i przepływ live -> encja -> live

- **Stan systemu (teraz)**:
  - częściowo działa `returnToSessionLive` z paneli live do detali encji,
  - brak jednolitego, globalnego wzorca powrotu i zachowania stosu dla wszystkich ścieżek.
- **Stan docelowy**:
  - spójny kontekstowy powrót do aktywnej sesji live.
- **Wniosek**:
  - dobre zalążki są, trzeba to ujednolicić na poziomie całej aplikacji.

### 5) Blokada nowej sesji bez cleanupu

- **Stan systemu (teraz)**:
  - brak twardego guardu; można wejść w „Na żywo” z poziomu detalu sesji bez walidacji stanu cleanupu poprzedniej sesji.
- **Stan docelowy**:
  - globalna blokada + CTA powrotu do przerwanego cleanupu.
- **Wniosek**:
  - to krytyczny brak wobec przyjętej zasady „najpierw porządek, potem nowa sesja”.

### 6) Undo/redo

- **Stan systemu (teraz)**:
  - lokalne potwierdzenia i toasty, ale brak systemowego undo dla większości akcji live i cleanup.
- **Stan docelowy**:
  - warstwa odwracalnych operacji + undo dla akcji wysokiego ryzyka.
- **Wniosek**:
  - potrzebny wspólny mechanizm, nie punktowe obejścia.

### Co mogło nam umykać (ważne doprecyzowanie)

1. **Konflikt semantyki „cleanup jako staging” vs obecne operacje `deleteEntity`**  
   Jeśli finalizacja ma być jedynym momentem trwałych zmian, kasowanie encji musi iść przez staging (oznaczenie „do usunięcia”), a nie natychmiastowy delete.
2. **Wymóg transakcyjności finalizacji**  
   Przy modelu „all-or-nothing” trzeba jawnie zaplanować transakcję zapisu cleanupu (lub bezpieczny mechanizm kompensacyjny).
3. **Model statusu sesji**  
   Brakuje formalnego pola procesu (`live_active`, `cleanup_pending`, `cleanup_completed`) potrzebnego do guardów i raportowania.
4. **E2E dla bramy cleanupu**  
   Bez testów end-to-end łatwo o obejścia blokady nowej sesji przez alternatywne ścieżki UI.

### Decyzja priorytetowa (rekomendacja)

Najpierw domknąć **EPIC G** (cleanup gate + draft + finalizacja), a dopiero potem rozwijać szerzej automaty i analitykę raportu.  
Powód: to EPIC G stabilizuje fundament danych, na którym opierają się wszystkie kolejne moduły.

---

## Proponowane KPI po wdrożeniach

Żeby ocenić, czy usprawnienia działają, warto mierzyć:

- czas wykonania kluczowych operacji live (mediana),
- liczbę cofnięć/napraw po błędnych akcjach,
- odsetek użytkowników korzystających z panelu sygnałów,
- czas potrzebny nowemu użytkownikowi do pierwszej poprawnej sesji live,
- subiektywną ocenę „czy wiem, co się dzieje w sesji” (krótka ankieta po sesji),
- zgłoszenia UX/a11y na sprint.

---

## Podsumowanie końcowe

MG Helper ma mocny rdzeń funkcjonalny i dobrą architekturę domenową. Największa dźwignia jakości leży obecnie nie w „dokładaniu kolejnych paneli”, tylko w:

1) lepszym ujawnieniu danych, które system już ma,  
2) zwiększeniu bezpieczeństwa operacji (undo i audyt zmian),  
3) poprawie czytelności i dostępności działań w `SessionLive`.

Jeżeli kolejnym krokiem ma być plan wygładzania aplikacji, ten audyt daje gotową bazę do ułożenia roadmapy w układzie: quick wins -> stabilizacja UX/a11y -> strategiczne capability.

---

## Ustalenia obowiązujące od teraz

Ta sekcja jest traktowana jako wiążąca baza decyzji produktowo-technicznych dla dalszych prac.

1. **Cleanup jest bramą jakości danych**  
   Nowa sesja nie startuje bez domknięcia cleanupu poprzedniej. Cleanup wspiera draft/wznowienie, a finalizacja jest momentem commitu.

2. **Raport sesji jest nadpisywany przy nowym przebiegu tej samej sesji**  
   Bez archiwizacji. Status raportu w UI: `Raport dostępny` albo `Brak raportu (po ponownym uruchomieniu sesji)`.

3. **Sygnały live są domyślnie dyskretne**  
   W osi czasu mają formę skrótu, panel szczegółów jest zwijany i dostępny na żądanie.

4. **Lokacje dziedziczą zniszczenie po rodzicu**  
   Domyślnie status propaguje się na potomne, z możliwością wyjątku `Oznacz jako ocalałe`.

5. **Notatki live przechodzą przez cleanup i raport**  
   W cleanupie decyzja: `zachowaj / archiwizuj / usuń`; zatwierdzone notatki zasilają raport.

6. **Brak dokładania dodatkowego navbaru**  
   Informacje o stanie procesu sesji i priorytetach mają być podawane przez statusy/badge w istniejącym układzie.

---

## Checklista realizacyjna (monitoring pracy)

> Wzór statusów: `[ ]` do zrobienia · `[~]` w trakcie · `[x]` ukończone  
> Zasada: każda faza kończy się krótką walidacją (`typecheck`, testy, smoke UX) zanim przechodzimy dalej.

### Etap 0 — Start i porządek wykonawczy

#### Zadanie 0.1 — Ustawić źródła prawdy
- [x] Potwierdzić, że `audyt-jakosciowy.md` jest jedynym aktywnym planem wdrożenia.
- [x] Potwierdzić „Ustalenia obowiązujące od teraz” jako nienegocjowalny baseline.
- [x] Oznaczyć zakres sprintu: które epiki i taski wchodzą, które świadomie odkładamy.

#### Zadanie 0.2 — Przygotować tryb pracy
- [x] Rozpisać taski sprintowe na małe PR-y (max 1 temat domenowy / PR).
- [x] Dla każdego PR dopisać: cel biznesowy, ryzyko, test plan.
- [x] Ustawić kolejność: najpierw stabilizacja cyklu sesji, potem rozszerzenia.

#### Kroki kontrolne Etapu 0
- [x] Brak niejednoznacznych decyzji produktowych.
- [x] Każdy task ma właściciela i status startowy.
- [x] Lista zadań w audycie jest gotowa do odhaczania.

---

### Etap 1 — P0: Cykl sesji i brama cleanup (najwyższy priorytet)

#### Zadanie 1.1 — Model procesu sesji
- [x] Dodać formalny `sessionLifecycleStatus` (co najmniej: `live`, `cleanup_pending`, `cleanup_completed`).
- [x] Powiązać status z przejściami ekranów `Live -> Cleanup -> Report`.
- [x] Zastąpić logikę „tylko marker lokalny” statusem domenowym.

#### Zadanie 1.2 — Cleanup draft i wznowienie
- [x] Wprowadzić roboczy zapis cleanupu (stan cząstkowy).
- [x] Umożliwić przerwanie i powrót bez utraty decyzji.
- [x] Pokazać postęp cleanupu (ile decyzji zamkniętych / otwartych).

#### Zadanie 1.3 — Finalizacja cleanup (commit)
- [x] Wdrożyć staging decyzji cleanupu do momentu finalizacji.
- [x] Dodać walidację pre-commit (spójność relacji, wymagane dane, konflikty).
- [x] Finalizacja wykonuje commit all-or-nothing.

#### Zadanie 1.4 — Twardy gate nowej sesji
- [x] Zablokować start nowej sesji przy `cleanup_pending`.
- [x] Dodać jasny komunikat + CTA powrotu do przerwanego cleanupu.
- [x] Zabezpieczyć wszystkie wejścia (lista, skróty, quick actions, deeplinki).

#### Kroki kontrolne Etapu 1
- [x] Smoke flow: `live -> cleanup draft -> wznowienie -> finalizacja`.
- [x] Smoke flow: próba nowej sesji przy `cleanup_pending` jest blokowana.
- [x] Brak obejść blokady przez alternatywne trasy.

---

### Etap 2 — P0/P1: Raport sesji i status raportu

#### Zadanie 2.1 — Polityka raportu
- [x] Utrzymać politykę: raport nadpisywany przy nowym przebiegu tej samej sesji.
- [x] Brak archiwizacji raportu.
- [x] Komunikat przed restartem sesji informuje o nadpisaniu.

#### Zadanie 2.2 — Jednoznaczny status raportu
- [x] W UI używać tylko: `Raport dostępny` / `Brak raportu (po ponownym uruchomieniu sesji)`.
- [x] Nie używać semantyki „stale/nieaktualny”.
- [x] Status raportu spójny w topbarze/nawigacji/detalu sesji.

#### Zadanie 2.3 — Rozszerzenia treści raportu
- [x] Dodać metryki: czas sesji, sceny vs ETA, spotlight, zmiany statusów zagrożeń.
- [x] Dodać sekcję „kolejne kroki”.
- [x] Zachować eksport Markdown jako źródło raportowe.

#### Kroki kontrolne Etapu 2
- [x] Restart tej samej sesji zeruje raport zgodnie z polityką.
- [x] Raport pokazuje poprawny stan po cleanup finalnym.
- [x] Eksport raportu odzwierciedla stan UI.

---

### Etap 3 — P1: Sygnały live i oś czasu

#### Zadanie 3.1 — Sygnały na osi czasu
- [x] Wpiąć sygnały systemowe do wspólnej osi czasu.
- [x] Domyślnie pokazywać skrót (tryb skondensowany).
- [x] Format skrótu: `HH:mm Encja — Zdarzenie (Źródło)`.

#### Zadanie 3.2 — Panel sygnałów drugiego planu
- [x] Utrzymać panel sygnałów jako zwijany (domyślnie ukryty).
- [x] Dodać licznik nowych sygnałów od ostatniego otwarcia.
- [x] Klik ze skrótu na osi czasu otwiera szczegóły sygnału.

#### Zadanie 3.3 — Kontekst zmian
- [x] Pokazać `before/after` dla krytycznych zmian.
- [x] Pokazać źródło zmiany (`manual/system/automat`).
- [x] Unikać duplikacji danych między osią a panelem.

#### Kroki kontrolne Etapu 3
- [x] Oś czasu pozostaje czytelna podczas intensywnej sesji.
- [x] Szczegóły są dostępne bez przeciążenia głównego widoku.
- [x] Użytkownik rozumie „co i dlaczego się zmieniło”.

---

### Etap 4 — P1: Lifecycle encji i spójność świata

#### Zadanie 4.1 — Quick actions lifecycle w live
- [x] Dodać szybkie akcje: NPC (`nie żyje`), lokacja (`zniszczona`), przedmiot (`utracony/zniszczony`).
- [x] Każda zmiana wymaga powodu (preset + własny opis).
- [x] Zmiany lifecycle zapisują sygnał sesji.

#### Zadanie 4.2 — Dziedziczenie zniszczenia lokacji
- [x] Reguła: zniszczenie rodzica domyślnie propaguje się na potomne.
- [x] Wyjątek: możliwość oznaczenia potomnej jako `ocalałe`.
- [x] Widoczność wyjątków w cleanupie i raporcie.

#### Zadanie 4.3 — Undo dla lifecycle
- [x] Cofanie przywraca status i powód.
- [x] Cofanie nie psuje sygnałów i raportów.
- [x] Cofanie działa także po sekwencji kilku zmian.

#### Kroki kontrolne Etapu 4
- [x] Zmiany lifecycle są spójne we wszystkich modułach.
- [x] Dziedziczenie lokacji nie tworzy pętli/konfliktów.
- [x] Undo działa przewidywalnie.

---

### Etap 5 — P1: Notatki live -> cleanup -> raport

#### Zadanie 5.1 — Decyzje na notatkach w cleanup
- [x] Dla notatek live dodać decyzje: `zachowaj / archiwizuj / usuń`.
- [x] Notatki do decyzji trafiają do inboxu cleanup.
- [x] Decyzje na notatkach zapisują się w draftzie cleanup.

#### Zadanie 5.2 — Zasilanie raportu
- [x] Do raportu trafiają tylko notatki zatwierdzone do zachowania.
- [x] Notatki archiwalne są oddzielone od raportu operacyjnego.
- [x] Usunięte notatki nie wracają po restarcie.

#### Kroki kontrolne Etapu 5
- [x] Notatki nie zaśmiecają raportu.
- [x] Cleanup ma pełną kontrolę nad losem notatek.
- [x] Ścieżka notatki jest audytowalna.

---

### Etap 6 — P1: UI/A11y/Copy (higiena produktu)

#### Zadanie 6.1 — Copy i encoding
- [x] Usunąć artefakty kodowania i niespójności językowe.
- [x] Sprawdzić kluczowe etykiety, toasty, opisy, aria-label.
- [x] Zachować poprawne polskie znaki we wszystkich tekstach.

#### Zadanie 6.2 — Focus i klawiatura
- [x] Ujednolicić `focus-visible`.
- [x] Zapewnić alternatywy dla akcji hover-only.
- [x] Przejść tab-order dla kluczowych flow (live, cleanup, report).

#### Zadanie 6.3 — Kolor vs treść
- [x] Wszystkie statusy mają etykietę tekstową.
- [x] Ikona/tekst informują niezależnie od koloru.
- [x] Krytyczne komunikaty są czytelne w skali szarości.

#### Kroki kontrolne Etapu 6
- [x] `pnpm test:encoding` przechodzi.
- [x] Brak regresji a11y krytycznych w nowych ekranach.
- [x] UX pozostaje szybki pod klawiaturą.

---

### Etap 7 — P2: Nawigacja, dashboard, graf, backstage

#### Zadanie 7.1 — Nawigacja statusami (bez nowego navbaru)
- [x] Dodać badge/statusy procesu sesji w istniejącej nawigacji.
- [x] Dodać skróty do najczęstszych flow.
- [x] Zachować obecny układ menu jako bazę.

#### Zadanie 7.2 — Dashboard „Wymaga decyzji”
- [x] Sekcja z priorytetami: cleanup, niespójności, sygnały wymagające reakcji.
- [x] Wątki/zagrożenia/lifecycle w jednym miejscu decyzyjnym.
- [x] Linkowanie 1 klik do odpowiedniego widoku.

#### Zadanie 7.3 — Graf i backstage używalny operacyjnie
- [x] Presety widoków grafu pod realne use-case GM.
- [x] Backstage z CTA prowadzącymi do decyzji.
- [x] Ograniczyć „martwe” insighty bez akcji.

#### Kroki kontrolne Etapu 7
- [x] Użytkownik szybciej dociera do zadań wysokiej wartości.
- [x] Graf przestaje być „tylko podglądem”.
- [x] Dashboard realnie skraca czas decyzji.

---

### Etap 8 — Bramka jakości per iteracja

#### Zadanie 8.1 — Walidacje techniczne
- [x] `pnpm typecheck`
- [x] `pnpm test:encoding`
- [x] Jeśli dotyczy lifecycle/cleanup: `pnpm test tests/shared/threatLifecycle.test.ts`

#### Zadanie 8.2 — Walidacje funkcjonalne
- [x] Smoke: live -> cleanup draft -> cleanup final -> report.
- [x] Smoke: blokada nowej sesji przy niedomkniętym cleanupie.
- [x] Smoke: restart tej samej sesji i polityka raportu (nadpisanie).

#### Zadanie 8.3 — Walidacje UX
- [x] Klawiatura i focus na głównych flow.
- [x] Czytelność statusów bez koloru.
- [x] Spójność copy i komunikatów.

#### Kroki kontrolne Etapu 8
- [x] Brak krytycznych regresji.
- [x] Dokumentacja/audyt zaktualizowane po każdym większym kroku.
- [x] Gotowość do kolejnego etapu potwierdzona checklistą.
