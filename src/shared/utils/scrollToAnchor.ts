const DEFAULT_OFFSET_TOP_PX = 10;

/**
 * Przewija okno tak, by góra elementu znalazła się `offsetTopPx` pod górą widoku strony
 * (jak sekcje w „Macierz sesji” na ekranie Za kulisami).
 */
export function scrollWindowToElementId(
  elementId: string,
  offsetTopPx: number = DEFAULT_OFFSET_TOP_PX,
): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  const targetTop = window.scrollY + el.getBoundingClientRect().top - offsetTopPx;
  window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
}
