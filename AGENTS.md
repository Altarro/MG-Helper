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
- If you touched threat lifecycle or cleanup behavior, also run:
  `pnpm test tests/shared/threatLifecycle.test.ts`

## Editing rules

- Keep files as UTF-8 with LF endings.
- Prefer small targeted edits over mass copy/paste from external tools.
- If terminal output looks suspicious, verify the actual file contents before saving changes.
- When changing visible labels, placeholders, toasts, dialog text, or descriptions, double-check Polish spelling.
