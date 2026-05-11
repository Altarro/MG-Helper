interface ThreadStakesListProps {
  stakes: string[];
}

export function ThreadStakesList({ stakes }: ThreadStakesListProps) {
  if (stakes.length === 0) return null;

  return (
    <div className="app-panel rounded-[1.5rem] p-5 shadow-[0_12px_24px_rgba(18,45,66,0.06)] lg:p-6">
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-2">
        {stakes.map((stake, index) => (
          <li
            key={`${index}:${stake}`}
            className="app-input-shell flex min-h-full min-w-0 gap-3 rounded-[1.25rem] border px-4 py-4 shadow-[0_12px_24px_rgba(18,45,66,0.04)]"
          >
            <span className="app-pill-muted inline-flex h-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
              {index + 1}
            </span>
            <p className="text-surface-800 min-w-0 flex-1 text-sm leading-6 break-words">{stake}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
