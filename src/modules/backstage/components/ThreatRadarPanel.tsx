import { Link } from 'react-router';
import type { AttentionTier, ThreatRadarResult } from '../types';
import { tierShortLabel } from '../backstageCopy';

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

function AxisBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="flex flex-col gap-0.5 min-w-[72px]" title={`${label}: ${pct}%`}>
      <span className="text-[9px] uppercase tracking-wide text-surface-400">{label}</span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
        <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ThreatRadarPanel({ rows }: { rows: ThreatRadarResult[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-surface-600" data-testid="backstage-radar-empty">
        Brak aktywnych zagrożeń — dodaj zagrożenie na froncie lub w module zagrożeń, a potem powiąż je z sesjami i
        wskazówkami.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2" data-testid="backstage-radar-list">
      {rows.map((row) => (
        <li key={row.threatId}>
          <Link
            to={`/threats/${row.threatId}`}
            className={`flex flex-col gap-2 rounded-lg border border-surface-200 border-l-4 p-3 shadow-sm transition-colors hover:bg-surface-50 ${tierBarClass(row.tier)}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-sm font-semibold text-surface-900 truncate block">{row.name}</span>
                <span className="text-[11px] font-medium text-surface-500">{tierShortLabel(row.tier)}</span>
              </div>
              <div className="flex gap-3 shrink-0">
                <AxisBar value={row.presence} label="Obecność" />
                <AxisBar value={row.debt} label="Dług" />
              </div>
            </div>
            <p className="text-xs leading-snug text-surface-600">{row.cue}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
