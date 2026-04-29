# AI generation contract (jawny)

## Wymagane keywordy (musza byc w `pack.description`)

- `typ tabeli`
- `klimat`
- `domena`
- `tagi osiowe`
- `jezyk`
- `format output`

Brak ktoregokolwiek keywordu blokuje akceptacje importu AI.

## Mapowanie keyword -> pola JSON

- `typ tabeli` -> `pack.tables[].type`
- `klimat` -> `pack.description` + `pack.tables[].entries[].tags`
- `domena` -> `pack.description` + tagi domenowe wpisow
- `tagi osiowe` -> `pack.tables[].entries[].tags`
- `jezyk` -> `pack.description` + jezyk tresci w `value`
- `format output` -> struktura obiektu `pack` + `tables[]` + `entries[]`

## Kontrakt struktury

```json
{
  "pack": {
    "name": "string",
    "description": "string (z keywordami)",
    "tables": [
      {
        "name": "string",
        "type": "firstName|lastName|nickname|locationType|locationName|event|custom:*",
        "entries": [
          { "value": "string", "weight": 1, "tags": ["string"] }
        ]
      }
    ]
  }
}
```

## Dodatkowe zasady jakości

- Tagi sa normalizowane slownikiem kontrolowanym (synonimy + liczba pojedyncza/mnoga).
- Dla pary `locationType` <-> `locationName` wymagane sa kompatybilne tagi osiowe.
- Dla pojedynczego obiektu `pack` dziala fallback auto-wrap do `packs[]`.
