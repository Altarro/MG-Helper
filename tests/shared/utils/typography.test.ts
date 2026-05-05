import { describe, expect, it } from 'vitest';
import { applyPolishTypography } from '@shared/utils/typography';

describe('applyPolishTypography', () => {
  it('replaces spaces after one-letter Polish words with NBSP', () => {
    expect(applyPolishTypography('Wysyła wiernych do kanałów po kolejne składniki.')).toBe(
      'Wysyła wiernych do kanałów po kolejne składniki.',
    );
    expect(applyPolishTypography('Porywa ludzi powiązanych z pierwszym rytuałem')).toBe(
      'Porywa ludzi powiązanych z\u00A0pierwszym rytuałem',
    );
    expect(applyPolishTypography('A potem i jeszcze w porcie.')).toBe(
      'A\u00A0potem i\u00A0jeszcze w\u00A0porcie.',
    );
  });

  it('does not break strings without one-letter words', () => {
    const input = 'Przeciwnik atakuje tylko nocą.';
    expect(applyPolishTypography(input)).toBe(input);
  });

  it('supports opening punctuation before one-letter words', () => {
    expect(applyPolishTypography('(z ukrycia) i atak frontalny')).toBe(
      '(z\u00A0ukrycia) i\u00A0atak frontalny',
    );
  });
});
