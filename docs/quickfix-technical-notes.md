# MG Helper - Quick Fix Technical Notes

## Cel

Ten dokument zbiera techniczne decyzje i zmiany wprowadzone w ramach etapow quick fix.
Ma sluzyc jako lekki changelog architektoniczny bez mieszania go z planem wykonawczym w `quickfix.md`.

## Najwazniejsze decyzje

### 1. Offline-first zamiast PWA

- Produkt komunikujemy jako offline-first.
- Nie komunikujemy instalowalnego PWA, dopoki w repo nie pojawia sie `manifest.json` i service worker.
- Chroni to dokumentacje i proces wydania przed rozjazdem z kodem.

### 2. Wspolny standard modali

- `Modal` jest podstawowym prymitywem dla dialogow blokujacych.
- Standard modala obejmuje:
  - ESC close
  - backdrop close
  - initial focus
  - trap focus
  - restore focus po zamknieciu

### 3. Search UX ma byc przewidywalny

- Pole wyszukiwania jest traktowane jako kontrolowane wobec aktualnego query.
- `Ctrl+K` zawsze ma fokusowac input.
- Czyszczenie pola nie powinno wymagac wczesniejszego submitu.

### 4. Release readiness jest procesem, nie pamieciowka

- Wydanie ma przechodzic przez jedna checkliste.
- Wersja aplikacji i wersja backupu sa osobnymi kontraktami.
- Session Live, import/export i multi-campaign pozostaja sciezkami krytycznymi.

## Changelog techniczny quick fix

### Etap 2

- ujednolicono kontrakty danych i helpery domenowe
- uszczelniono integralnosc relacji
- dodano wersjonowany backup i migracje importu

### Etap 3

- wydzielono query layer i command layer dla Session Live
- uszczelniono storage live i recovery po uszkodzonych danych przegladarki
- utrzymano istniejaca logike UI bez zmiany kontraktow domenowych

### Etap 4

- dopracowano prymityw `Modal` o focus trap, initial focus i restore focus
- poprawiono `ConfirmDialog`, by domyslnie ustawial bezpieczny fokus na akcji anulowania
- dopieto fokus i zachowanie klawiatury w modalach krytycznych dla Session Live i relacji
- uporzadkowano Search UX pod `Ctrl+K` oraz kontrolowany stan inputu
- dodano testy regresyjne dla modali i wyszukiwarki
- dopisano dokumentacje release readiness oraz jawne rozroznienie offline-first vs PWA
