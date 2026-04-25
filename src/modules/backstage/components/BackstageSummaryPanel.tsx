export function BackstageSummaryPanel() {
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
    </section>
  );
}
