import { describe, expect, it } from 'vitest';
import { stripHtml } from '@shared/utils/sanitize';

describe('stripHtml', () => {
  it('keeps readable spaces between block elements', () => {
    expect(stripHtml('<p>Plan szturmu na fort.</p><p>Wątek dotyczący najemnika.</p>')).toBe(
      'Plan szturmu na fort. Wątek dotyczący najemnika.',
    );
  });

  it('normalizes line breaks, list items and repeated whitespace', () => {
    expect(stripHtml('<ul><li>Pakt Latarni</li><li>Kupieni Radni</li></ul><br> Finał')).toBe(
      'Pakt Latarni Kupieni Radni Finał',
    );
  });
});
