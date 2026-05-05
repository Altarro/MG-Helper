# License Audit — MG-Helper

## Executive summary
- Decyzja: **OK po poprawkach** (wymagane działania przed publikacją dystrybucji).
- Największe ryzyka: brak licencji repozytorium oraz assety bez udokumentowanego pochodzenia/licencji (`public/favicon.svg`, `docs/samples/generator/city-intrigue-pack.json`).
- Czy można komercyjnie dystrybuować: **tak, po uzupełnieniu braków formalnych** (repo license + provenance assetów + notices).
- Czy są wymogi otwarcia kodu: dla wykrytych zależności produkcyjnych nie stwierdzono obowiązkowego otwarcia kodu (brak GPL/AGPL/SSPL w produkcji).
- Czy są wymogi notice/attribution: tak, należy zachować teksty licencyjne/attribution dla użytych bibliotek.
- Czy są zależności RED: nie wykryto w produkcji.
- Czy są zależności UNKNOWN: nie w npm dependencies; **UNKNOWN dotyczy assetów lokalnych**.

## Scope
- Commit hash: `ccd1393b7a5e24f2f3863fbc16c61fda023bace6`
- Data audytu: 2026-04-28
- System/narzędzia: Windows 10, `pnpm`, Node.js, Vite
- Komendy użyte do audytu:
  - `pnpm install --frozen-lockfile`
  - `pnpm build`
  - `pnpm list --prod --depth Infinity`
  - `pnpm list --dev --depth Infinity`
  - `pnpm list --prod --depth Infinity --json`
  - `pnpm list --dev --depth Infinity --json`
  - wyszukiwania po repo (`LICENSE`, `NOTICE`, `COPYING`, `SPDX`, `GPL`, `AGPL`, `LGPL`, `font`, `icon`, `svg`, `third_party`, `vendor`)
- Wyniki maszynowe:
  - `docs/legal/dependencies-license-report.csv`
  - `docs/legal/dependencies-license-report.json`
  - `docs/legal/audit-summary.json`

## Project license status
- `LICENSE/LICENCE/COPYING` w repo: **brak**.
- Pole `license` w `package.json`: **brak**.
- Deklaracje warunków użycia w `README/docs`: nie znaleziono jawnej licencji repo.
- Problem do decyzji właściciela: **repo publiczne bez jawnej licencji — dla zewnętrznych użytkowników brak jasnych praw; dla autora nie blokuje komercyjnego użycia własnego kodu, ale wymaga decyzji przed publikacją/dystrybucją**.
- Rekomendacja: podjąć formalną decyzję licencyjną dla repo (np. proprietary/all rights reserved lub wybrana OSS), udokumentować ją w pliku licencji i metadanych projektu.

## Production bundle
- Build produkcyjny wykonany poprawnie (`vite build`).
- `dist/` zawiera bundle aplikacji i chunki vendor (`vendor-react`, `vendor-dexie`, `vendor-tiptap`, `vendor-dnd`, `vendor-graph`) zgodnie z `vite.config.ts`.
- Dev dependencies: brak dowodu, że trafiają bezpośrednio do runtime bundle (standardowe zachowanie Vite zachowane).
- Sourcemapy w `dist/`: nie wykryto plików `*.map`.
- Pliki licencyjne w `dist/`: nie wykryto automatycznie wygenerowanych plików `LICENSE*`.
- Public assets trafiające do dystrybucji: `public/favicon.svg`.

## RED findings
| name | version | type | where found | license | why risky | action |
|---|---|---|---|---|---|---|
| Brak wykryć RED w produkcyjnym npm bundle | - | - | - | - | - | - |

## YELLOW findings
| name | version | type | where found | license | obligations | action |
|---|---|---|---|---|---|---|
| `dompurify` | `3.3.3` | dependency | prod | `(MPL-2.0 OR Apache-2.0)` | attribution/notice; przy wyborze MPL dodatkowa weryfikacja obowiązków | zachować notice i przekazać do legal check (interpretacja wariantu licencji) |
| `@cspell/dict-pl_pl` | `3.0.6` | devDependency | dev | `LGPL-3.0+` | narzędzie developerskie, potencjalne obowiązki LGPL | legal check (niski priorytet runtime, bo dev-only) |
| `lightningcss` | `1.32.0` | devDependency (transitive) | dev | `MPL-2.0` | obowiązki MPL dla modyfikacji/redystrybucji komponentu | legal check (dev/build scope) |

## UNKNOWN findings
| name | version | type | where found | missing info | action |
|---|---|---|---|---|---|
| `favicon.svg` | `n/a` | asset | `public/favicon.svg` | brak źródła i licencji assetu | udokumentować pochodzenie + licencję lub zastąpić własnym assetem |
| `city-intrigue-pack.json` | `n/a` | asset | `docs/samples/generator/city-intrigue-pack.json` | brak jawnej informacji o prawach do treści danych | dodać provenance/licencję lub oznaczyć jako dane własne |

## GREEN findings
| name | version | type | license | required notice |
|---|---|---|---|---|
| `react` | `19.2.4` | dependency | MIT | zachować tekst licencji MIT |
| `react-dom` | `19.2.4` | dependency | MIT | zachować tekst licencji MIT |
| `react-router` | `7.14.0` | dependency | MIT | zachować tekst licencji MIT |
| `@dnd-kit/core` | `6.3.1` | dependency | MIT | zachować tekst licencji MIT |
| `@dnd-kit/sortable` | `10.0.0` | dependency | MIT | zachować tekst licencji MIT |
| `@dnd-kit/utilities` | `3.2.2` | dependency | MIT | zachować tekst licencji MIT |
| `@hookform/resolvers` | `3.10.0` | dependency | MIT | zachować tekst licencji MIT |
| `@tiptap/extension-link` | `2.27.2` | dependency | MIT | zachować tekst licencji MIT |
| `@tiptap/react` | `2.27.2` | dependency | MIT | zachować tekst licencji MIT |
| `@tiptap/starter-kit` | `2.27.2` | dependency | MIT | zachować tekst licencji MIT |
| `date-fns` | `4.1.0` | dependency | MIT | zachować tekst licencji MIT |
| `dexie` | `4.4.2` | dependency | Apache-2.0 | zachować LICENSE + ewentualny NOTICE |
| `dexie-react-hooks` | `1.1.7` | dependency | Apache-2.0 | zachować LICENSE + ewentualny NOTICE |
| `fflate` | `0.8.2` | dependency | MIT | zachować tekst licencji MIT |
| `lucide-react` | `0.460.0` | dependency | ISC | zachować tekst licencji ISC |
| `nanoid` | `5.1.7` | dependency | MIT | zachować tekst licencji MIT |
| `react-easy-crop` | `5.5.7` | dependency | MIT | zachować tekst licencji MIT |
| `react-force-graph-2d` | `1.29.1` | dependency | MIT | zachować tekst licencji MIT |
| `react-hook-form` | `7.72.1` | dependency | MIT | zachować tekst licencji MIT |
| `sonner` | `2.0.7` | dependency | MIT | zachować tekst licencji MIT |
| `zod` | `3.25.76` | dependency | MIT | zachować tekst licencji MIT |
| `zustand` | `5.0.12` | dependency | MIT | zachować tekst licencji MIT |

Pełna lista direct/transitive (prod/dev) znajduje się w `docs/legal/dependencies-license-report.csv` i `docs/legal/dependencies-license-report.json`.

## Third-party notices required
- Należy utrzymać dystrybucyjny pakiet notice/licencji dla bibliotek MIT/ISC/Apache-2.0.
- Szczególnie dopilnować:
  - Apache-2.0 (`dexie`, `dexie-react-hooks`) — zachowanie tekstów licencji i NOTICE, jeśli występuje.
  - `lucide-react` (ISC) — zachowanie tekstu licencji.
- Rekomendowane miejsce publikacji:
  - plik `THIRD_PARTY_NOTICES.md` w repo i paczce dystrybucyjnej,
  - dodatkowo sekcja „Licencje” w aplikacji lub dokumentacji dystrybucyjnej.

## Assets
- `public/favicon.svg` — w `dist`, status: **UNKNOWN** (brak udokumentowanej licencji/pochodzenia).
- `docs/samples/generator/city-intrigue-pack.json` — sample data, status: **UNKNOWN** (brak jawnego pochodzenia/licencji).
- Nie wykryto fontów ani dodatkowych grafik binarnych poza powyższymi elementami.

## Dev dependencies
- Wykryto głównie GREEN.
- YELLOW (dev-only): `@cspell/dict-pl_pl` (LGPL-3.0+), `lightningcss` (MPL-2.0).
- Ponieważ to narzędzia dev/build, ryzyko dla zamkniętej dystrybucji runtime jest niższe, ale zalecana weryfikacja prawna polityki dystrybucji build toolchain.

## Future Electron packaging risks
- W obecnym repo **nie wykryto** konfiguracji/dependency Electron.
- Jeśli planowane będzie pakowanie desktopowe, trzeba powtórzyć audyt dla:
  - Electron runtime (Chromium/Node/Electron),
  - instalatora i auto-updatera,
  - ikon/assetów desktopowych,
  - ewentualnych natywnych binarek i ich licencji.

## Recommended action plan
- must fix before release:
  - dodać i zadeklarować licencję repo (`LICENSE` + `package.json` `license`),
  - udokumentować prawa do `public/favicon.svg`,
  - udokumentować prawa do `docs/samples/generator/city-intrigue-pack.json`,
  - dołączyć i utrzymywać `THIRD_PARTY_NOTICES.md` w dystrybucji.
- should fix before release:
  - potwierdzić wariant licencji `dompurify` (MPL-2.0 OR Apache-2.0) i zakres obowiązków,
  - przejść legal check dla YELLOW dev tooling.
- nice to have:
  - automatyzacja generowania notice/SBOM w CI.
- legal review needed:
  - status assetów UNKNOWN,
  - finalna polityka licencyjna repo,
  - interpretacja licencji dual/weak-copyleft (MPL/LGPL) w kontekście procesu build.

## Limitations
- Audyt techniczny nie stanowi porady prawnej.
- Metadane npm mogą być niekompletne lub nieaktualne.
- Ręcznie dodane pliki i sample data mogą wymagać osobnej walidacji źródła.
- Narzędzie Syft/ScanCode/licensee nie było dostępne w środowisku, więc SBOM SPDX nie został wygenerowany automatycznie.
