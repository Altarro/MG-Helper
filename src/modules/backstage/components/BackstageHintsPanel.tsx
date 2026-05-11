export function BackstageHintsPanel() {
  return (
    <section
      className="rounded-xl border border-surface-200 bg-white p-4 text-sm text-surface-600"
      data-testid="backstage-hints"
      aria-labelledby="backstage-hints-heading"
    >
      <h2 id="backstage-hints-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
        Jak czytać „Za kulisami”
      </h2>
      <ul className="space-y-1.5 text-xs leading-relaxed text-surface-600">
        <li>Radar pokazuje, co najbardziej domaga się Twojej uwagi przed kolejną sesją.</li>
        <li>Macierz pomaga sprawdzić, czy wątki, NPC i lokacje rzeczywiście żyją na stole.</li>
        <li>Jeśli wynik brzmi nietrafnie, najczęściej brakuje powiązań między encjami.</li>
      </ul>
    </section>
  );
}
