import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Compass, Info, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';
import { DEFAULT_RADAR_ARCHETYPES, type RadarArchetype } from '@modules/fronts/types';
import type {
  ThreatRadarWeightKey,
  ThreatRadarArchetypeWeights,
} from '@modules/backstage/engine/threatRadarArchetypes';
import {
  getArchetypeWeightDescriptors,
  RADAR_ARCHETYPE_PROFILES,
  type ArchetypeWeightDescriptor,
} from '@modules/backstage/engine/threatRadar';
import {
  getDefaultThreatRadarWeights,
  loadThreatRadarSettings,
  saveThreatRadarSettings,
  getRadarArchetypeLabel,
  type ThreatRadarSettings,
} from '@modules/backstage/radarSettings';

function clone<T>(cfg: T): T {
  return JSON.parse(JSON.stringify(cfg)) as T;
}

function defaultArchetypeWeights(): ThreatRadarArchetypeWeights {
  return { footprintAbsence: 0.01, sinceClock: 0.01, threadOpen: 0.01, clueDebt: 0.01, clockFill: 0.01 };
}

interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  apply: (weights: ThreatRadarArchetypeWeights) => ThreatRadarArchetypeWeights;
}

const PRESETS: PresetDefinition[] = [
  {
    id: 'reset',
    name: 'Domyślne',
    description: 'Wagi przywracają fabryczne wartości — dobry punkt startu.',
    apply: () => ({ footprintAbsence: 0.01, sinceClock: 0.01, threadOpen: 0.01, clueDebt: 0.01, clockFill: 0.01 }),
  },
  {
    id: 'louder',
    name: 'Mocny radar',
    description: 'Każdy archetyp reaguje wyraźniej — dobre na intensywne kampanie.',
    apply: (w) => ({
      footprintAbsence: Math.min(1, w.footprintAbsence * 1.25 + 0.05),
      sinceClock: Math.min(1, w.sinceClock * 1.25 + 0.05),
      threadOpen: Math.min(1, w.threadOpen * 1.25 + 0.05),
      clueDebt: Math.min(1, w.clueDebt * 1.25 + 0.05),
      clockFill: Math.min(1, w.clockFill * 1.25 + 0.05),
    }),
  },
  {
    id: 'softer',
    name: 'Stonowany',
    description: 'Tylko najmocniejsze sygnały zapalają wyższe poziomy uwagi.',
    apply: (w) => ({
      footprintAbsence: Math.max(0, w.footprintAbsence * 0.7),
      sinceClock: Math.max(0, w.sinceClock * 0.7),
      threadOpen: Math.max(0, w.threadOpen * 0.7),
      clueDebt: Math.max(0, w.clueDebt * 0.7),
      clockFill: Math.max(0, w.clockFill * 0.7),
    }),
  },
];

function factorBadge(factor: number): { label: string; tone: string } {
  if (factor >= 0.95) return { label: 'kluczowy', tone: 'bg-orange-100 text-orange-900' };
  if (factor >= 0.7) return { label: 'mocny', tone: 'bg-amber-100 text-amber-900' };
  if (factor >= 0.45) return { label: 'wspomagający', tone: 'bg-surface-100 text-surface-700' };
  return { label: 'lekki', tone: 'bg-surface-50 text-surface-600' };
}

function ArchetypeProfile({ archetype }: { archetype: RadarArchetype }) {
  if (archetype.startsWith('custom:')) {
    return (
      <p className="text-xs leading-snug text-surface-600">
        Archetyp niestandardowy — używa tej samej mechaniki co „Tajemnica”. Dostosuj wagi, by lepiej oddać charakter Twojego zagrożenia.
      </p>
    );
  }
  const profile = RADAR_ARCHETYPE_PROFILES[archetype as keyof typeof RADAR_ARCHETYPE_PROFILES];
  if (!profile) return null;
  return (
    <div className="text-xs leading-snug text-surface-700">
      <p className="font-semibold text-surface-900">{profile.tagline}</p>
      <p className="mt-1 text-surface-600">{profile.how}</p>
    </div>
  );
}

function WeightControl({
  descriptor,
  value,
  onChange,
}: {
  descriptor: ArchetypeWeightDescriptor;
  value: number;
  onChange: (next: number) => void;
}) {
  const badge = factorBadge(descriptor.factor);
  const factorPct = Math.round(descriptor.factor * 100);
  const weightId = `weight-${descriptor.key}-${descriptor.signalId}`;
  return (
    <div className="rounded-xl border border-surface-200/80 bg-white/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={weightId} className="text-[12px] font-semibold text-surface-900">
          {descriptor.signalLabel}
        </label>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.tone}`}
          title={`Mnożnik archetypu: ${factorPct}%`}
        >
          {badge.label}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-surface-600">{descriptor.hint}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={weightId}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-200 accent-primary-600"
        />
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={Number(value.toFixed(2))}
          onChange={(e) => {
            const num = Number(e.target.value.replace(',', '.'));
            onChange(Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 0);
          }}
          className="app-input w-16 rounded-md px-2 py-1 text-right text-[12px]"
        />
      </div>
    </div>
  );
}

function ArchetypeBlock({
  archetype,
  campaignId,
  weights,
  onWeightChange,
  onApplyPreset,
  trailing,
}: {
  archetype: RadarArchetype;
  campaignId: string;
  weights: ThreatRadarArchetypeWeights;
  onWeightChange: (key: ThreatRadarWeightKey, value: number) => void;
  onApplyPreset: (preset: PresetDefinition) => void;
  trailing?: React.ReactNode;
}) {
  const descriptors = useMemo(() => getArchetypeWeightDescriptors(archetype), [archetype]);
  return (
    <div className="rounded-[1.15rem] border border-surface-200/80 bg-white/85 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-surface-900 text-sm font-semibold">{getRadarArchetypeLabel(archetype, campaignId)}</p>
          <div className="mt-1.5">
            <ArchetypeProfile archetype={archetype} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset)}
              title={preset.description}
              className="app-button-secondary inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold"
            >
              <Sparkles className="h-3 w-3" aria-hidden /> {preset.name}
            </button>
          ))}
          {trailing}
        </div>
      </header>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {descriptors.map((descriptor) => (
          <WeightControl
            key={descriptor.key}
            descriptor={descriptor}
            value={weights[descriptor.key] ?? 0}
            onChange={(next) => onWeightChange(descriptor.key, next)}
          />
        ))}
      </div>
    </div>
  );
}

export function ThreatRadarSettingsPanel({ campaignId }: { campaignId: string }) {
  const initial = useMemo(() => loadThreatRadarSettings(campaignId), [campaignId]);
  const [draft, setDraft] = useState<ThreatRadarSettings>(initial);
  const [newCustomName, setNewCustomName] = useState('');

  function update(archetype: string, key: ThreatRadarWeightKey, value: number) {
    const next = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    setDraft((prev) => {
      const out = clone(prev);
      if (!out.weights[archetype]) {
        out.weights[archetype] = defaultArchetypeWeights();
      }
      out.weights[archetype]![key] = next;
      return out;
    });
  }

  function applyPresetTo(archetype: string, preset: PresetDefinition) {
    setDraft((prev) => {
      const out = clone(prev);
      const current = out.weights[archetype] ?? defaultArchetypeWeights();
      out.weights[archetype] = preset.apply(current);
      return out;
    });
    toast.success(`Preset „${preset.name}” zastosowany do archetypu`);
  }

  function applyPresetToAll(preset: PresetDefinition) {
    setDraft((prev) => {
      const out = clone(prev);
      for (const id of Object.keys(out.weights)) {
        out.weights[id] = preset.apply(out.weights[id] ?? defaultArchetypeWeights());
      }
      return out;
    });
    toast.success(`Preset „${preset.name}” zastosowany do wszystkich archetypów`);
  }

  function handleSave() {
    saveThreatRadarSettings(campaignId, draft);
    toast.success('Ustawienia radaru zagrożeń zapisane');
  }

  function handleResetDefaults() {
    const defaults: ThreatRadarSettings = {
      weights: getDefaultThreatRadarWeights(),
      customLabels: {},
    };
    setDraft(defaults);
    saveThreatRadarSettings(campaignId, defaults);
    toast.success('Przywrócono domyślne wagi radaru');
  }

  function createCustomArchetype() {
    const name = newCustomName.trim();
    if (!name) {
      toast.error('Podaj nazwę custom archetypu');
      return;
    }
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'custom';
    let id = `custom:${slug}`;
    let n = 2;
    while (draft.customLabels[id]) {
      id = `custom:${slug}-${n}`;
      n += 1;
    }
    setDraft((prev) => {
      const out = clone(prev);
      out.customLabels[id] = name;
      out.weights[id] = defaultArchetypeWeights();
      return out;
    });
    setNewCustomName('');
    toast.success(`Dodano custom archetyp: ${name}`);
  }

  function removeCustomArchetype(id: string) {
    setDraft((prev) => {
      const out = clone(prev);
      delete out.customLabels[id];
      delete out.weights[id];
      return out;
    });
    toast.success('Usunięto custom archetyp');
  }

  const customIds = Object.keys(draft.customLabels).sort((a, b) =>
    draft.customLabels[a]!.localeCompare(draft.customLabels[b]!, 'pl'),
  );

  return (
    <section className="app-panel rounded-[1.8rem] p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-primary-900 text-base font-semibold tracking-[-0.02em]">Ustawienia radaru zagrożeń</h2>
          <p className="text-surface-700 mt-2 max-w-[78ch] text-sm leading-7">
            Każdy archetyp łączy te same suwaki z innym sygnałem (np. „nieobecność” w „Żyjącym świecie” znaczy co innego niż w „Drapieżniku”). Dlatego pod każdym suwakiem jest podpis sygnału, który właśnie regulujesz, oraz mnożnik archetypu — żebyś wiedział, ile dana waga waży dla tej kategorii.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPresetToAll(preset)}
              title={`Zastosuj „${preset.name}” do wszystkich archetypów`}
              className="app-button-secondary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> {preset.name}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary-200/70 bg-primary-50/50 px-3 py-2 text-[12px] leading-snug text-primary-900">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          „Kluczowy / mocny / wspomagający / lekki” to siła wpływu danego suwaka w wybranym archetypie. Dwa identyczne suwaki w różnych archetypach mogą prowadzić do innego rezultatu.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {DEFAULT_RADAR_ARCHETYPES.map((archetype) => (
          <ArchetypeBlock
            key={archetype}
            archetype={archetype}
            campaignId={campaignId}
            weights={draft.weights[archetype] ?? defaultArchetypeWeights()}
            onWeightChange={(key, value) => update(archetype, key, value)}
            onApplyPreset={(preset) => applyPresetTo(archetype, preset)}
          />
        ))}
      </div>

      <div className="mt-6 rounded-[1.15rem] border border-dashed border-surface-300 p-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary-700" aria-hidden />
          <p className="text-surface-800 text-sm font-semibold">Custom archetypy</p>
        </div>
        <p className="text-surface-600 mt-1 text-xs leading-relaxed">
          Tworzą nowe etykiety dla zagrożeń, ale używają mechaniki „Tajemnicy”. Wagi startują od 0,01 — dostosuj je pod swój styl.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={newCustomName}
            onChange={(e) => setNewCustomName(e.target.value)}
            placeholder="Nazwa custom archetypu..."
            className="app-input flex-1 rounded-lg px-2.5 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={createCustomArchetype}
            className="app-button-secondary rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            Dodaj custom
          </button>
        </div>
      </div>

      {customIds.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {customIds.map((id) => (
            <ArchetypeBlock
              key={id}
              archetype={id as RadarArchetype}
              campaignId={campaignId}
              weights={draft.weights[id] ?? defaultArchetypeWeights()}
              onWeightChange={(key, value) => update(id, key, value)}
              onApplyPreset={(preset) => applyPresetTo(id, preset)}
              trailing={
                <button
                  type="button"
                  onClick={() => removeCustomArchetype(id)}
                  className="app-button-secondary inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-danger-700"
                >
                  <Trash2 className="h-3 w-3" aria-hidden /> Usuń
                </button>
              }
            />
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="app-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <Save className="h-4 w-4" aria-hidden /> Zapisz ustawienia radaru
        </button>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="app-button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Przywróć domyślne
        </button>
      </div>
    </section>
  );
}
