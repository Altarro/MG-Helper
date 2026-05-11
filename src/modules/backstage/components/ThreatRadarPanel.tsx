import { Link } from 'react-router';
import { AlertTriangle, ArrowRight, Clock3, Compass, Flag, Info, Sparkles } from 'lucide-react';
import { useCampaign } from '@shared/db/CampaignContext';
import type { AttentionTier, ThreatRadarResult, ThreatRadarSignal } from '../types';
import { tierShortLabel } from '../backstageCopy';
import { getRadarArchetypeLabel } from '../radarSettings';

const TIER_TONE: Record<
  AttentionTier,
  { card: string; chip: string; chipText: string; bar: string }
> = {
  0: {
    card: 'border-surface-200 bg-white',
    chip: 'bg-surface-100',
    chipText: 'text-surface-600',
    bar: 'bg-surface-400',
  },
  1: {
    card: 'border-surface-300 bg-surface-50/60',
    chip: 'bg-surface-100',
    chipText: 'text-surface-700',
    bar: 'bg-surface-500',
  },
  2: {
    card: 'border-amber-200 bg-amber-50/45',
    chip: 'bg-amber-100',
    chipText: 'text-amber-900',
    bar: 'bg-amber-500',
  },
  3: {
    card: 'border-orange-300 bg-orange-50/55',
    chip: 'bg-orange-100',
    chipText: 'text-orange-900',
    bar: 'bg-orange-500',
  },
  4: {
    card: 'border-red-300 bg-red-50/55',
    chip: 'bg-red-100',
    chipText: 'text-red-900',
    bar: 'bg-red-500',
  },
};

function tierHeadline(tier: AttentionTier): string {
  if (tier >= 4) return 'Wymaga decyzji teraz';
  if (tier === 3) return 'Przygotuj przed sesją';
  if (tier === 2) return 'Warto rzucić okiem';
  return 'Spokojne tło';
}

function tierSubhead(tier: AttentionTier): string {
  if (tier >= 4) return 'Radar widzi mocną presję — to zagrożenie powinno mieć beat na nadchodzącej sesji.';
  if (tier === 3) return 'Sygnały rosną — zaplanuj ruch, scenę albo segment zegara.';
  if (tier === 2) return 'Coś zaczyna pracować w tle — sprawdź kartę przed sesją.';
  return 'Bez pilnych sygnałów — wystarczy zerknąć od czasu do czasu.';
}

function SignalRow({ signal, barTone }: { signal: ThreatRadarSignal; barTone: string }) {
  const intensityPct = Math.round(Math.max(0, Math.min(1, signal.intensity)) * 100);
  const contributionPct = Math.round(Math.max(0, Math.min(1, signal.contribution)) * 100);
  return (
    <div className="rounded-lg border border-surface-200/80 bg-white/70 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[12px] font-semibold text-surface-800">{signal.label}</span>
        <span
          className="shrink-0 rounded-full bg-surface-100 px-1.5 py-0.5 text-[10px] font-semibold text-surface-700"
          title={`Wkład w łączny wynik: ${contributionPct}%`}
        >
          udział {contributionPct}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-200/80">
        <div
          className={`h-full rounded-full transition-all ${barTone}`}
          style={{ width: `${intensityPct}%` }}
          aria-hidden
        />
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-surface-600">{signal.why}</p>
    </div>
  );
}

function ThreatCard({ row }: { row: ThreatRadarResult }) {
  const { campaignId } = useCampaign();
  const tone = TIER_TONE[row.tier];
  const archetypeLabel = getRadarArchetypeLabel(row.radarArchetype, campaignId);
  const topSignals = row.contributions.slice(0, 2);

  return (
    <Link
      to={`/threats/${row.threatId}`}
      className={`group block rounded-xl border p-3.5 transition-colors hover:bg-surface-50 ${tone.card}`}
      data-testid={`backstage-radar-card-${row.threatId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-surface-900">{row.name}</span>
            {row.tier >= 4 ? <AlertTriangle className="h-3.5 w-3.5 text-red-600" aria-hidden /> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.chip} ${tone.chipText}`}>
              {tierShortLabel(row.tier)}
            </span>
            <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-medium text-surface-700">
              {archetypeLabel}
            </span>
            {row.clockCritical ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                <Clock3 className="h-3 w-3" aria-hidden /> zegar krytyczny
              </span>
            ) : null}
            {row.narrativeGap ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                <Flag className="h-3 w-3" aria-hidden /> luka narracyjna
              </span>
            ) : null}
            {row.isSpotlightSuggestion ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-800">
                <Sparkles className="h-3 w-3" aria-hidden /> na stole teraz
              </span>
            ) : null}
          </div>
        </div>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-surface-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed text-surface-800">{row.cue}</p>

      {topSignals.length > 0 ? (
        <div className="mt-3 space-y-1.5" data-testid="backstage-radar-signals">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-surface-500">
            <Info className="h-3 w-3" aria-hidden /> Skąd to wynika
          </p>
          {topSignals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} barTone={tone.bar} />
          ))}
        </div>
      ) : null}

      {row.recommendedMove ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface-100/70 px-3 py-2 text-[12px] leading-relaxed text-surface-800">
          <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-700" aria-hidden />
          <div>
            <span className="font-semibold text-surface-900">Propozycja ruchu MG: </span>
            {row.recommendedMove}
          </div>
        </div>
      ) : null}

      {row.clockTickCue ? (
        <p className="mt-2 inline-flex items-start gap-1.5 text-[11px] text-surface-600">
          <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-500" aria-hidden />
          {row.clockTickCue}
        </p>
      ) : null}
    </Link>
  );
}

function TierSection({
  tier,
  title,
  rows,
}: {
  tier: AttentionTier;
  title: string;
  rows: ThreatRadarResult[];
}) {
  return (
    <section
      className="rounded-xl border border-surface-200/80 bg-white p-4"
      aria-label={title}
      data-testid={`backstage-radar-tier-${tier}`}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-surface-600">{tierSubhead(tier)}</p>
        </div>
        <span className="shrink-0 rounded-full border border-surface-200 bg-surface-50 px-2 py-0.5 text-[11px] font-semibold text-surface-700">
          {rows.length}
        </span>
      </header>
      {rows.length === 0 ? (
        <p className="text-xs text-surface-500">Brak zagrożeń w tej grupie.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.threatId}>
              <ThreatCard row={row} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ThreatRadarPanel({ rows }: { rows: ThreatRadarResult[] }) {
  if (rows.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-surface-300 bg-white p-4 text-sm text-surface-600"
        data-testid="backstage-radar-empty"
      >
        Brak aktywnych zagrożeń. Dodaj zagrożenie i powiąż je z wątkiem, NPC, frakcją lub wskazówką, aby radar pokazał, co wymaga uwagi.
      </div>
    );
  }

  const spotlightRow = rows.find((r) => r.isSpotlightSuggestion);
  const groups = {
    hot: rows.filter((row) => row.tier >= 4),
    high: rows.filter((row) => row.tier === 3),
    medium: rows.filter((row) => row.tier === 2),
    calm: rows.filter((row) => row.tier <= 1),
  };

  return (
    <div className="flex flex-col gap-4" data-testid="backstage-radar-list">
      <div className="rounded-xl border border-primary-200/80 bg-gradient-to-r from-primary-50 via-white to-primary-50/30 px-4 py-3 text-xs leading-relaxed text-surface-700">
        <p className="font-semibold text-surface-900">Czytaj radar od góry: „teraz”, „przed sesją”, „warto zerknąć”, „spokojne tło”.</p>
        <p className="mt-1">
          Każda karta pokazuje, dlaczego zagrożenie się zaświeciło — przez najmocniejsze sygnały (np. cisza po ruchu, niedomknięte tropy, postęp zegara). Apka tylko sugeruje; każdą zmianę zapisujesz Ty.
        </p>
      </div>

      {spotlightRow ? (
        <div
          className="flex gap-2 rounded-xl border border-primary-200 bg-primary-50/70 px-4 py-3 text-xs leading-relaxed text-primary-950"
          data-testid="backstage-radar-spotlight-banner"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" aria-hidden />
          <div className="min-w-0">
            <span className="font-semibold">Najsilniejsza sugestia „na stole teraz”: </span>
            <Link
              to={`/threats/${spotlightRow.threatId}`}
              className="font-medium text-primary-900 underline-offset-2 hover:underline"
            >
              {spotlightRow.name}
            </Link>
            {spotlightRow.recommendedMove ? (
              <p className="mt-1 text-primary-900/90">{spotlightRow.recommendedMove}</p>
            ) : spotlightRow.spotlightCue ? (
              <p className="mt-1 text-primary-900/90">{spotlightRow.spotlightCue}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <TierSection tier={4} title={tierHeadline(4)} rows={groups.hot} />
        <TierSection tier={3} title={tierHeadline(3)} rows={groups.high} />
        <TierSection tier={2} title={tierHeadline(2)} rows={groups.medium} />
        <TierSection tier={0} title={tierHeadline(0)} rows={groups.calm} />
      </div>
    </div>
  );
}
