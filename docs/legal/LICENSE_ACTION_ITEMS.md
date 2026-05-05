# LICENSE_ACTION_ITEMS

## Must fix before release

- [ ] Dodać licencję repozytorium (`LICENSE`/`LICENCE`/`COPYING`) i ustawić pole `license` w `package.json`.
- [ ] Podjąć formalną decyzję: proprietary/all rights reserved vs OSS i udokumentować ją publicznie.
- [ ] Udokumentować pochodzenie oraz prawa do redystrybucji `public/favicon.svg` (obecnie UNKNOWN).
- [ ] Udokumentować pochodzenie oraz prawa do redystrybucji `docs/samples/generator/city-intrigue-pack.json` (obecnie UNKNOWN).
- [ ] Dołączać `THIRD_PARTY_NOTICES.md` do każdej dystrybucji.

## Should fix before release

- [ ] Zweryfikować z prawnikiem interpretację `dompurify` (MPL-2.0 OR Apache-2.0) i przyjąć bezpieczny wariant compliance.
- [ ] Zweryfikować dev-tooling o licencjach weak-copyleft: `@cspell/dict-pl_pl` (LGPL-3.0+), `lightningcss` (MPL-2.0).
- [ ] Upewnić się, że proces release zawiera zachowanie tekstów licencji dla MIT/ISC/Apache zależności.

## Nice to have

- [ ] Dodać automatyczną walidację licencji w CI (raport + fail na RED/UNKNOWN produkcyjne).
- [ ] Dodać automatyczne generowanie SBOM (`SPDX`/`CycloneDX`) po udostępnieniu narzędzia (np. Syft).

## Legal review needed

- [ ] Brak licencji repozytorium publicznego i konsekwencje dla użytkowników zewnętrznych.
- [ ] Assety lokalne bez jawnego źródła/licencji.
- [ ] Finalny kształt i komplet notice/attribution w dystrybucji komercyjnej.

## Aktualna decyzja techniczna

**Można wypuścić po poprawkach.**  
Bez zamknięcia punktów `Must fix before release` publikacja komercyjna jest obarczona istotnym ryzykiem formalnym.
