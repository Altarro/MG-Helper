# MG Helper Agent Notes

## Encoding and language

- Always use UTF-8 when reading, editing, and writing files.
- This application UI is in Polish. Preserve correct Polish diacritics in all user-facing strings:
  `ą ć ę ł ń ó ś ź ż` and uppercase variants.
- Never replace Polish letters with ASCII fallbacks in UI text.
- Never introduce mojibake sequences such as `Ä`, `Ĺ`, `â€`, `�`, or mixed quote artifacts.

## Before finishing changes

- Run `pnpm typecheck`.
- Run `pnpm test:encoding`.
- Run `pnpm spellcheck` (cspell: PL+EN, słowniki `cspell.json` / `cspell-words.txt` / `cspell-words-project.txt`). Gdy pojawią się nowe dopuszczalne tokeny, `pnpm spellcheck:collect` zaktualizuje listę projektową — potem sprawdź diff pod kątem literówek zamiast ślepego commitu.
- If you touched threat lifecycle or cleanup behavior, also run:
  `pnpm test tests/shared/threatLifecycle.test.ts`

## Editing rules

- Keep files as UTF-8 with LF endings.
- Prefer small targeted edits over mass copy/paste from external tools.
- If terminal output looks suspicious, verify the actual file contents before saving changes.
- When changing visible labels, placeholders, toasts, dialog text, or descriptions, double-check Polish spelling.

## E2E privacy and artifact policy

- Treat E2E runs as potentially sensitive: avoid collecting visual/debug artifacts by default.
- For Playwright, keep `trace`, `screenshot`, and `video` disabled unless explicitly needed for debugging.
- Enable artifacts only with explicit opt-in (`PW_E2E_ARTIFACTS=1`) and only for short-lived troubleshooting.
- Never commit or upload Playwright artifacts (`playwright-report/`, `test-results/`, `blob-report/`).

## Dependency and licensing policy

- Before adding any new dependency/tool, prefer permissive OSS licenses (MIT/BSD/Apache-2.0/ISC).
- If a package, addon, service, or plugin may be paid/commercial/proprietary (including freemium tiers), stop and ask the user first.
- In that question, clearly state: what will be added, why it is needed, license model, expected cost, and available OSS alternatives.
- Do not install, configure, or migrate to paid/commercial tooling without explicit user approval.
