import { useEffect } from 'react';

/**
 * Registers a global keyboard shortcut.
 * @param combo - e.g. 'ctrl+k', 'esc', 'mod+k' (mod = ctrl on Win/Linux, cmd on Mac)
 * @param handler - callback (receives the KeyboardEvent)
 * @param options - `enabled` defaults to true
 */
export function useKeyboardShortcut(
  combo: string,
  handler: (e: KeyboardEvent) => void,
  options: { enabled?: boolean } = {},
): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const parts = combo.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const needsCtrl = parts.includes('ctrl') || parts.includes('mod');
    const needsShift = parts.includes('shift');
    const needsAlt = parts.includes('alt');

    function onKeyDown(e: KeyboardEvent) {
      const isMod = needsCtrl ? (e.ctrlKey || e.metaKey) : true;
      const isShift = needsShift ? e.shiftKey : !e.shiftKey;
      const isAlt = needsAlt ? e.altKey : !e.altKey;
      const notMod = !needsCtrl ? (!e.ctrlKey && !e.metaKey) : true;

      if (
        e.key.toLowerCase() === key &&
        isMod &&
        isShift &&
        isAlt &&
        notMod
      ) {
        handler(e);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [combo, handler, enabled]);
}
