# Jak importowac CSV i JSON

## CSV (jedna tabela)

Format wiersza:

- `value`
- `weight` (opcjonalnie)
- `tags` (opcjonalnie, rozdzielane przecinkiem)

Przyklad:

`Stary dok,2,miasto,port,mrok`

## JSON (wiele tabel i paczek)

Oczekiwany ksztalt:

```json
{
  "packs": [
    {
      "id": "pack-1",
      "campaignId": "camp-1",
      "name": "Nazwa paczki",
      "description": "",
      "isActive": true,
      "tables": []
    }
  ]
}
```

## Tryby laczenia

- `Dopisz`: dodaje nowe paczki/tabele.
- `Nadpisz`: podmienia po nazwach, pozostale zostawia.
- `Zastap`: czyści istniejace dane generatora kampanii i wrzuca import.

## Przebieg bezpiecznego importu

1. Zrob `Backup JSON` albo `Backup pełny (ZIP)`.
2. Wczytaj plik.
3. Sprawdz podglad i komunikaty walidacji.
4. Dla trybu `Zastap` potwierdz operacje.
5. Przetestuj 2-3 losowania po imporcie.

## Najczestsze przyczyny odrzucenia

- Nieprawidlowy `type` tabeli.
- Puste `value`.
- Za dlugie tagi.
- Przekroczone limity tabel/wpisow.
