export function SessionPlaceholderPanel() {
  return (
    <div className="flex flex-col gap-3">
      <div className="app-panel rounded-[1.45rem] p-4">
        <div className="mb-2">
          <p className="text-surface-500 text-xs font-semibold tracking-[0.18em] uppercase">
            Placeholder
          </p>
          <p className="text-surface-700 mt-1 text-sm">
            Sekcja celowo pozostawiona pusta. Miejsce na kolejny panel live.
          </p>
        </div>
      </div>
      <div className="app-input-shell text-surface-500 rounded-[1.25rem] border-dashed px-4 py-4 text-sm">
        Brak zawartości.
      </div>
    </div>
  );
}

