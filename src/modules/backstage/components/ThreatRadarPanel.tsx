import { Link } from 'react-router';
import { Sparkles } from 'lucide-react';
import { useCampaign } from '@shared/db/CampaignContext';
import type { AttentionTier, ThreatRadarResult } from '../types';
import { tierShortLabel } from '../backstageCopy';
import { getRadarArchetypeLabel } from '../radarSettings';

function tierBarClass(tier: AttentionTier): string {
  switch (tier) {
    case 0:
      return 'border-l-surface-300 bg-white';
    case 1:
      return 'border-l-surface-400 bg-surface-50/50';
    case 2:
      return 'border-l-amber-400 bg-amber-50/40';
    case 3:
      return 'border-l-orange-500 bg-orange-50/50';
    case 4:
      return 'border-l-red-500 bg-red-50/60';
    default:
      return 'border-l-surface-300 bg-white';
  }
}

function AxisBar({ value, label, title: titleOverride }: { value: number; label: string; title?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const tip = titleOverride ?? `${label}: ${pct}%`;
  return (
    <div className="flex flex-col gap-0.5 min-w-[72px]" title={tip}>
      <span className="text-[9px] uppercase tracking-wide text-surface-400">{label}</span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
        <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ThreatRadarPanel({ rows }: { rows: ThreatRadarResult[] }) {
  const { campaignId } = useCampaign();
  if (rows.length === 0) {
    return (
      <p className="text-sm text-surface-600" data-testid="backstage-radar-empty">
        Brak aktywnych zagrożeń — dodaj zagrożenie na froncie lub w module zagrożeń, a potem powiąż je z sesjami i
        wskazówkami.
      </p>
    );
  }

  const spotlightRow = rows.find((r) => r.isSpotlightSuggestion);

  return (
    <div className="flex flex-col gap-3" data-testid="backstage-radar-list">
      <div className="rounded-lg border border-primary-200/80 bg-primary-50/40 px-3 py-2 text-xs leading-snug text-surface-700">
        <strong className="font-semibold text-surface-800">Sugestie, nie automaty.</strong>{' '}
        Radar łączy sygnały w sposób rozmyty (jak presja na stole), żeby podpowiedzieć, co warto rozważyć —{' '}
        <span className="text-surface-600">nie przesuwa zegarów ani niczego nie zapisuje za narratora.</span>
      </div>

      {spotlightRow && (
        <div
          className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-snug text-amber-950"
          data-testid="backstage-radar-spotlight-banner"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden />
          <div>
            <span className="font-semibold">Najsilniejsza sugestia „na stole teraz”:</span>{' '}
            <Link to={`/threats/${spotlightRow.threatId}`} className="font-medium text-primary-800 underline-offset-2 hover:underline">
              {spotlightRow.name}
            </Link>
            {spotlightRow.spotlightCue ? <p className="mt-1 text-amber-900/90">{spotlightRow.spotlightCue}</p> : null}
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.threatId}>
            <Link
              to={`/threats/${row.threatId}`}
              className={`flex flex-col gap-2 rounded-lg border border-surface-200 border-l-4 p-3 shadow-sm transition-colors hover:bg-surface-50 ${tierBarClass(row.tier)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-surface-900 truncate">{row.name}</span>
                    {row.isSpotlightSuggestion ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                        Sugestia „na stole”
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] font-medium text-surface-500">
                    Archetyp radaru: {getRadarArchetypeLabel(row.radarArchetype, campaignId)}
                  </span>
                  <span className="text-[11px] font-medium text-surface-500">{tierShortLabel(row.tier)}</span>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0 max-w-full justify-end">
                  <AxisBar
                    value={row.scalars.footprintPresence}
                    label="Ślad"
                    title="(a) Ostatnie sesje: wątek / wskazówka / NPC powiązany lub samo zagrożenie na stole"
                  />
                  <AxisBar
                    value={row.scalars.sinceClockSessions}
                    label="Od ticku"
                    title="(b) Presja czasu od ostatniego ticku zegara w przód (lub od śladu, gdy brak zapisu ticku)"
                  />
                  <AxisBar
                    value={row.scalars.threadsResolvedRatio}
                    label="Wątki ✓"
                    title="(c) Ułamek powiązanych wątków zakończonych (completed)"
                  />
                  <AxisBar
                    value={row.scalars.cluesUndiscoveredRatio}
                    label="Wsk. ?"
                    title="(d) Ułamek powiązanych wskazówek jeszcze nieodkrytych"
                  />
                </div>
              </div>
              <p className="text-xs leading-snug text-surface-600">{row.cue}</p>
              {row.clockTickCue ? (
                <p className="text-[11px] leading-snug text-surface-500 border-t border-surface-100 pt-2">{row.clockTickCue}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
