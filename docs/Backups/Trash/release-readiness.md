# MG Helper - Release Readiness

## Cel

Ten dokument zamyka operacyjna czesc wdrozenia po quick fixach.
Ma sluzyc jako jedna lista kontroli przed wydaniem oraz jako punkt odniesienia dla dalszych zmian.

## Stan produktu

- Aplikacja jest offline-first dzieki IndexedDB i lokalnej persystencji danych.
- Aplikacja nie jest jeszcze PWA.
- Backup ma wersjonowany kontrakt eksportu/importu.
- Session Live, import/export i multi-campaign sa traktowane jako sciezki krytyczne.

## Checklist przed wydaniem

Kazde wydanie powinno przejsc calosc ponizszej listy:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build`
5. Smoke test importu i eksportu backupu JSON
6. Smoke test izolacji danych miedzy kampaniami
7. Smoke test Session Live:
   - start sesji live
   - zmiana lokacji
   - dodanie NPC z kampanii
   - odswiezenie strony i odtworzenie stanu
   - zakonczenie sesji live
8. Smoke test seedu demo:
   - zaladowanie kampanii demo
   - przejscie po kluczowych widokach
   - eksport backupu po seedzie
9. Smoke test GitHub Pages (prod):
  - wejscie na `https://altarro.github.io/MG-Helper/`
  - sprawdzenie nawigacji hash (`#/campaigns`, `#/sessions`, `#/settings`)
  - odswiezenie strony na trasie hash i potwierdzenie poprawnego renderu
  - weryfikacja ladowania assetow (brak 404 dla JS/CSS)

## Wersjonowanie

### Wersja aplikacji

- Wersja aplikacji jest prowadzona semverem: `MAJOR.MINOR.PATCH`.
- Zrodla prawdy:
  - `package.json`
  - `src/shared/appInfo.ts`
- Oba miejsca musza pozostac zgodne w tym samym commicie.

### Wersja backupu

- Format backupu jest wersjonowany niezaleznie od wersji aplikacji.
- Aktualny kontrakt:
  - `formatVersion = 2`
  - `appVersion = 0.1.0-alpha`
- Kazda zmiana struktury eksportu/importu wymaga:
  - decyzji czy rosnie `formatVersion`
  - dopisania migracji importu dla wspieranych starszych wersji
  - dopisania testow roundtrip i kompatybilnosci

## Must / Should / Nice To Have

### Must Have przed v1

- zielone `typecheck`, `lint`, `test`, `build`
- zgodna dokumentacja offline-first vs PWA
- wersjonowany backup i testy kompatybilnosci
- stabilne Session Live bez regresji stanu po refreshu
- brak krytycznych regresji w multi-campaign

### Should Have

- checklista smoke testow wykonywana przy kazdym release candidate
- uzupelnione decyzje architektoniczne dla quick fixow
- changelog techniczny aktualizowany przy kazdym etapie stabilizacji

### Nice To Have

- instalowalne PWA
- service worker z polityka cache
- automatyczny release checklist w CI

## Decyzja produktowa: offline-first vs PWA

Do czasu wdrozenia `manifest.json` i service workera komunikujemy produkt jako:

- offline-first dla danych
- lokalny, przegladarkowy
- bez obietnicy instalowalnego PWA

To ogranicza ryzyko rozjazdu miedzy dokumentacja a rzeczywistym zachowaniem aplikacji.

## Krytyczne obszary smoke testu

### Multi-campaign

- utworzenie nowej kampanii
- przelaczenie aktywnej kampanii
- potwierdzenie izolacji encji i relacji

### Import / Export

- eksport pustej kampanii
- eksport kampanii z danymi
- import aktualnego backupu
- odrzucenie nieobslugiwanej wersji lub uszkodzonego payloadu

### Session Live

- odzyskanie stanu z przegladarki
- bezpieczne zamkniecie sesji live
- brak crasha przy uszkodzonych danych storage

### GitHub Pages

- poprawne ladowanie builda spod `/MG-Helper/`
- poprawne dzialanie hash routingu po odswiezeniu
- brak bledow 404 dla chunkow lazy routes

## Dalszy krok po Etapie 4

Nastepny logiczny krok to rozwiniecie placeholdera `ostatnio widziany w` na detalu NPC:

- najpierw kontrakt danych historii widocznosci
- potem zapis zmian lokacji NPC
- na koncu UI z ostatnimi 3 wpisami i pelna historia w osobnym widoku/modalu
