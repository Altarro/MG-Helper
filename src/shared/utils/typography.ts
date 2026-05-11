const POLISH_SINGLE_LETTER_WORDS = '[AaIiOoUuWwZz]';

/**
 * Prevents typographic widows for Polish one-letter words by replacing the
 * following regular space with a non-breaking space.
 */
export function applyPolishTypography(text: string): string {
  return text.replace(
    new RegExp(`(^|[\\s([{"„«])(${POLISH_SINGLE_LETTER_WORDS})\\s+`, 'g'),
    (_match, prefix: string, letter: string) => `${prefix}${letter}\u00A0`,
  );
}
