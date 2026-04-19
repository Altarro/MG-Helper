import { useEffect } from 'react';
import { useBlocker } from 'react-router';

/**
 * Blocks navigation and shows a browser confirm dialog when `isDirty` is true.
 * Also registers a `beforeunload` handler to catch tab/window close.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  // Handle browser close / reload
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Expose blocker so consumer can render a ConfirmDialog
  return blocker;
}
