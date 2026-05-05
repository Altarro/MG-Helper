import { Link } from 'react-router';

interface BackstageQuickAction {
  id: string;
  label: string;
  href: string;
}

interface BackstageSummaryPanelProps {
  actions?: BackstageQuickAction[];
  stats: {
    activeThreats: number;
    openThreads: number;
    sessionCount: number;
    clueCount: number;
  };
}

export function BackstageSummaryPanel({ actions = [], stats }: BackstageSummaryPanelProps) {
  return (
    <section
      className="app-panel rounded-[1.5rem] border border-surface-200/80 p-5 text-sm text-surface-700"
      data-testid="backstage-summary"
      aria-labelledby="backstage-summary-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="backstage-summary-heading" className="text-xs font-semibold uppercase tracking-wide text-surface-500">
            Szybki obraz kampanii
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-surface-700">
            To jest Twoja odprawa przed sesją: gdzie rośnie presja, co wymaga decyzji i które elementy świata są teraz
            na pierwszym planie.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Aktywne zagrożenia', stats.activeThreats],
          ['Otwarte wątki', stats.openThreads],
          ['Sesje w kampanii', stats.sessionCount],
          ['Wskazówki', stats.clueCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-surface-200 bg-white/80 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-primary-900">{value}</p>
          </div>
        ))}
      </div>
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={action.id}
              to={action.href}
              className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-800 transition-colors hover:bg-primary-100"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
