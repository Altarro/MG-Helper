import { Link } from 'react-router';

interface BackstageQuickAction {
  id: string;
  label: string;
  href: string;
}

export function BackstageSummaryPanel({ actions = [] }: { actions?: BackstageQuickAction[] }) {
  return (
    <section
      className="rounded-xl border border-surface-200 bg-surface-50/80 p-4 text-sm text-surface-700"
      data-testid="backstage-summary"
      aria-labelledby="backstage-summary-heading"
    >
      <h2 id="backstage-summary-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
        Podsumowanie
      </h2>
      <p className="leading-relaxed">
        Tu pojawi się skrót z ostatnich sesji i frontów — na razie radar korzysta wyłącznie z danych już zapisanych
        w kampanii (relacje, wątki, wskazówki, zegary). Uzupełniaj powiązania, żeby sugestie miały sens.
      </p>
      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={action.id}
              to={action.href}
              className="rounded-full border border-[rgba(33,71,102,0.2)] bg-[rgba(111,146,164,0.1)] px-3 py-1 text-xs font-semibold text-primary-800 hover:bg-[rgba(111,146,164,0.2)]"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
