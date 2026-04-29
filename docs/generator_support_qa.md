# Notatka dla supportu i QA: Generator

## Szybka diagnostyka supportowa

1. Sprawdz czy kampania ma aktywna paczke generatora.
2. Sprawdz czy import nie byl wykonany trybem `Zastap`.
3. Sprawdz, czy pojawil sie toast o naprawie danych generatora.
4. W razie potrzeby wykonaj rollback: `Przywróć ostatni backup migracyjny generatora`.
5. Jesli problem trwa, popros o backup JSON/ZIP i kroki reprodukcji.

## Checklist QA po zmianach generatora

- [ ] Losowanie: postac, lokacja, event, custom.
- [ ] Akcje: kopiuj, notatka, utworz encje.
- [ ] Import JSON i CSV (walidacja + merge mode).
- [ ] Backup/restore JSON i ZIP.
- [ ] Onboarding hint (pierwsze uruchomienie i zamkniecie hintu).
- [ ] Rollback backupu migracyjnego.

## Znane sygnaly regresji

- Wszystkie wpisy zmieniaja sie na jeden placeholder.
- Brak tabel po imporcie mimo poprawnego pliku.
- Historia losowan nie zapisuje sie mimo wlaczonego auto-zapisu.
- Skróty klawiaturowe odpalaja losowanie podczas wpisywania tekstu.
