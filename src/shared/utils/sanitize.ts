import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'a', 'blockquote', 'code', 'pre',
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

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
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
