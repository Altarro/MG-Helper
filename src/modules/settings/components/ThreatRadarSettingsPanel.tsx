import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DEFAULT_RADAR_ARCHETYPES } from '@modules/fronts/types';
import {
  THREAT_RADAR_WEIGHT_KEYS,
  type ThreatRadarWeightKey,
} from '@modules/backstage/engine/threatRadarArchetypes';
import {
  getDefaultThreatRadarWeights,
  loadThreatRadarSettings,
  saveThreatRadarSettings,
  getRadarArchetypeLabel,
  type ThreatRadarSettings,
} from '@modules/backstage/radarSettings';

const WEIGHT_LABELS: Record<ThreatRadarWeightKey, string> = {
  footprintAbsence: 'Ślad nieobecności',
  sinceClock: 'Od ostatniego ticku zegara',
  threadOpen: 'Nierozwiązane wątki',
  clueDebt: 'Nieodkryte wskazówki',
  clockFill: 'Zapełnienie zegara',
};

function clone<T>(cfg: T): T {
  return JSON.parse(JSON.stringify(cfg)) as T;
}

export function ThreatRadarSettingsPanel({ campaignId }: { campaignId: string }) {
  const initial = useMemo(() => loadThreatRadarSettings(campaignId), [campaignId]);
  const [draft, setDraft] = useState<ThreatRadarSettings>(initial);
  const [newCustomName, setNewCustomName] = useState('');

  function update(archetype: string, key: ThreatRadarWeightKey, raw: string) {
    const num = Number(raw.replace(',', '.'));
    const next = Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 0;
    setDraft((prev) => {
      const out = clone(prev);
      if (!out.weights[archetype]) {
        out.weights[archetype] = {
          footprintAbsence: 0.01,
          sinceClock: 0.01,
          threadOpen: 0.01,
          clueDebt: 0.01,
          clockFill: 0.01,
        };
      }
      out.weights[archetype][key] = next;
      return out;
    });
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
      out.weights[id] = {
        footprintAbsence: 0.01,
        sinceClock: 0.01,
        threadOpen: 0.01,
        clueDebt: 0.01,
        clockFill: 0.01,
      };
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
      <h2 className="text-primary-900 text-base font-semibold tracking-[-0.02em]">Ustawienia radaru zagrożeń</h2>
      <p className="text-surface-700 mt-2 max-w-[76ch] text-sm leading-7">
        Konfiguracja wag rozmytej sugestii dla każdego archetypu. Wartości zakresu 0-1 (np. 0.25). Radar wykorzystuje
        te nastawy przy wyliczaniu kolejności i cue, ale nadal niczego nie zapisuje za MG.
      </p>

      <div className="mt-4 grid gap-3">
        {DEFAULT_RADAR_ARCHETYPES.map((archetype) => (
          <div key={archetype} className="app-input-shell rounded-[1.15rem] p-4">
            <p className="text-surface-800 mb-3 text-sm font-semibold">{getRadarArchetypeLabel(archetype, campaignId)}</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {THREAT_RADAR_WEIGHT_KEYS.map((k) => (
                <label key={k} className="flex flex-col gap-1 text-xs text-surface-600">
                  <span className="font-medium">{WEIGHT_LABELS[k]}</span>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={draft.weights[archetype]?.[k] ?? 0.01}
                    onChange={(e) => update(archetype, k, e.target.value)}
                    className="app-input rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[1.15rem] border border-dashed border-surface-300 p-4">
        <p className="text-surface-800 text-sm font-semibold">Custom archetypy</p>
        <p className="text-surface-600 mt-1 text-xs">
          Oddzielne od domyślnych. Przy tworzeniu wszystkie wagi startują od 0.01.
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

      {customIds.length > 0 && (
        <div className="mt-3 grid gap-3">
          {customIds.map((id) => (
            <div key={id} className="app-input-shell rounded-[1.15rem] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-surface-800 text-sm font-semibold">{draft.customLabels[id]}</p>
                <button
                  type="button"
                  onClick={() => removeCustomArchetype(id)}
                  className="app-button-secondary rounded-md px-2 py-1 text-[11px] text-danger-700"
                >
                  Usuń custom
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {THREAT_RADAR_WEIGHT_KEYS.map((k) => (
                  <label key={k} className="flex flex-col gap-1 text-xs text-surface-600">
                    <span className="font-medium">{WEIGHT_LABELS[k]}</span>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={draft.weights[id]?.[k] ?? 0.01}
                      onChange={(e) => update(id, k, e.target.value)}
                      className="app-input rounded-lg px-2.5 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="app-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Zapisz ustawienia radaru
        </button>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="app-button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Przywróć domyślne
        </button>
      </div>
    </section>
  );
}

