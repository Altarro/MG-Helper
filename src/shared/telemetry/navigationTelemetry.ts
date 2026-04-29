export type NavigationTelemetryEvent = {
  name: 'navigation_click';
  source: 'sidebar' | 'topbar_breadcrumb';
  target: string;
  at: string;
};

const NAV_TELEMETRY_KEY = 'mg-navigation-telemetry';

export function trackNavigationClick(
  source: NavigationTelemetryEvent['source'],
  target: string,
): void {
  try {
    const previous = JSON.parse(localStorage.getItem(NAV_TELEMETRY_KEY) ?? '[]') as NavigationTelemetryEvent[];
    const event: NavigationTelemetryEvent = {
      name: 'navigation_click',
      source,
      target,
      at: new Date().toISOString(),
    };
    const next = [event, ...previous].slice(0, 300);
    localStorage.setItem(NAV_TELEMETRY_KEY, JSON.stringify(next));
  } catch {
    // ignore telemetry failures
  }
}

export function getNavigationTelemetryEvents(): NavigationTelemetryEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(NAV_TELEMETRY_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as NavigationTelemetryEvent[]) : [];
  } catch {
    return [];
  }
}
