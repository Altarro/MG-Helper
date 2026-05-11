# Jak przygotowac tabele generatora

## Cel

Przygotowac paczke tabel, ktora da sie szybko wykorzystac w `Inspiracje` bez recznego poprawiania danych.

## Zasady projektowe

- Trzymaj jedna os tematyczna na tabele (np. tylko imiona, tylko plotki, tylko lokacje).
- Uzywaj krotkich wartosci (najlepiej 1 fraza, max 300 znakow).
- Dodawaj tagi osiowe (`miasto`, `port`, `mrok`, `polityka`) dla lepszego filtrowania.
- Nie mieszaj jezykow w jednej tabeli.
- Dla kluczowych wpisow ustaw wyzsza wage (`weight`), reszte zostaw na `1`.

## Minimalny zestaw startowy

- `firstName`
- `nickname`
- `lastName`
- `locationType`
- `locationName`
- `event`

## Jakosc danych przed importem

1. Usun puste wpisy.
2. Sprawdz duplikaty (szczegolnie w tabelach imion i lokacji).
3. Sprawdz limity: wpisy, liczba tabel i dlugosc tagow.
4. Zweryfikuj, czy typy tabel sa poprawne (`system` albo `custom:*`).

## Praktyka utrzymania

- Jedna paczka na klimat kampanii.
- Raz na 2-3 sesje zrob szybki przeglad najrzadziej trafiajacych wpisow.
- Po duzych zmianach wyeksportuj paczke JSON jako wersje robocza.
