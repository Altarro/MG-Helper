# FAQ importu generatora

## "Nieprawidlowy JSON"

Plik ma zly format albo nie jest zgodny z kontraktem `packs[]`. Sprawdz klucze i nawiasy.

## "Payload nie wyglada na kontrakt generatora"

Import oczekuje obiektu z `packs`. Dla odpowiedzi AI upewnij sie, ze finalnie zwraca JSON zgodny z kontraktem.

## "Tag przekracza limit"

Skroc tagi do limitu i unikaj dlugich fraz opisowych jako tagow.

## "Brak tabel po imporcie"

Najczesciej zly typ tabeli (`type`). Popraw na systemowy lub `custom:<nazwa>`.

## "Wyniki sie powtarzaja"

Wlacz opcje `Bez powtorzen` dla aktywnego losowania.

## "Import zastap usunal moje dane"

Tryb `Zastap` czysci dane generatora kampanii. Uzyj backupu migracyjnego albo importu z backup JSON/ZIP.

## "Po migracji brakuje paczek"

Przywroc `ostatni backup migracyjny generatora` z `Ustawienia systemowe`.
