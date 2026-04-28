type FilterCountBadgeProps = {
  /** Czy nadrzędny przycisk filtra jest aktywny */
  selected: boolean;
  count: number;
};

/** Mała liczba w „kółeczku” przy filtrze — spójnie na listach modułów. */
export function FilterCountBadge({ selected, count }: FilterCountBadgeProps) {
  return (
    <span
      className={`ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
        selected
          ? 'border border-[rgba(33,71,102,0.1)] bg-[rgba(252,249,238,0.96)] text-primary-800 shadow-[inset_0_1px_0_rgba(255,255,250,0.65)]'
          : 'bg-[rgba(86,93,94,0.16)] text-surface-700'
      }`}
    >
      {count}
    </span>
  );
}
