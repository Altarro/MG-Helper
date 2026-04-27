export function BackstageHintsPanel() {
  return (
    <section
      className="rounded-xl border border-dashed border-surface-300 bg-white p-4 text-sm text-surface-600"
      data-testid="backstage-hints"
      aria-labelledby="backstage-hints-heading"
    >
      <h2 id="backstage-hints-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
        Podpowiedzi (AI)
      </h2>
      <p className="leading-relaxed">
        Miejsce na podpowiedzi generowane przez model — jeszcze niepodłączone. Radar poniżej działa deterministycznie
        z Twojej bazy.
      </p>
      <p className="mt-2 text-xs text-surface-500">
        Każdy insight powinien kończyć się akcją. Jeśli sekcja nie prowadzi do decyzji, traktuj ją jako sygnał do
        dopracowania danych źródłowych.
      </p>
    </section>
  );
}
