import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

type DetailScrollTopFabProps = {
  /** Po ilu pikselach przewinięcia pokazać przycisk (względem `window`). */
  showAfterScrollY?: number;
  /** Gdy false, nie nasłuchujemy i nie renderujemy (np. tryb edycji). */
  enabled?: boolean;
};

/** Pływająca strzałka w górę — jak na ekranie Za kulisami / Macierz sesji. */
export function DetailScrollTopFab({ showAfterScrollY = 320, enabled = true }: DetailScrollTopFabProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }
    function onScroll() {
      setVisible(window.scrollY > showAfterScrollY);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled, showAfterScrollY]);

  if (!enabled || !visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-surface-200 bg-white/70 text-surface-700 shadow-sm backdrop-blur-sm transition-opacity duration-200 opacity-55 hover:opacity-100"
      title="Powrót na górę"
      aria-label="Powrót na górę"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
