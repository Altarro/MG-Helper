import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'a', 'blockquote', 'code', 'pre',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'data-entity-id', 'data-entity-type'];
const TEXT_BOUNDARY_TAGS =
  /<\/?(?:address|article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi;

/**
 * Sanitizes HTML output from Tiptap before storing or displaying.
 * Strips all tags and attributes not in the allowlist.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force links to be safe
    FORCE_BODY: false,
  });
}

/** Strips all HTML tags and returns plain text. Used for fulltext search indexing. */
export function stripHtml(html: string): string {
  const withTextBoundaries = html.replace(TEXT_BOUNDARY_TAGS, ' ');

  return DOMPurify
    .sanitize(withTextBoundaries, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
