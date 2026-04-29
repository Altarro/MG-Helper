import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  loadCampaignCatalogSettings,
  saveCampaignCatalogSettings,
  type CampaignCatalogSettings,
  type CatalogKey,
} from '../campaignCatalogSettings';
import { DEFAULT_THREAT_TYPES, THREAT_TYPE_LABELS } from '@modules/fronts/types';
import { DEFAULT_LOCATION_TYPES, LOCATION_TYPE_LABELS } from '@modules/locations/types';
import { DEFAULT_ITEM_TYPES, ITEM_TYPE_LABELS } from '@modules/items/types';
import { DEFAULT_CLUE_TYPES, CLUE_TYPE_LABELS } from '@modules/clues/types';

const CATALOG_META: Record<
  CatalogKey,
  { title: string; where: string; defaults: readonly string[]; labels: Record<string, string> }
> = {
  threatType: {
    title: 'Typy zagrożeń',
    where: 'Fronty/Zagrożenia, listy i podglądy',
    defaults: DEFAULT_THREAT_TYPES,
    labels: THREAT_TYPE_LABELS,
  },
  locationType: {
    title: 'Typy lokacji',
    where: 'Lokacje, sceny sesji, podglądy',
    defaults: DEFAULT_LOCATION_TYPES,
    labels: LOCATION_TYPE_LABELS,
  },
  itemType: {
    title: 'Typy przedmiotów',
    where: 'Przedmioty, karty i podglądy',
    defaults: DEFAULT_ITEM_TYPES,
    labels: ITEM_TYPE_LABELS,
  },
  clueType: {
    title: 'Typy wskazówek',
    where: 'Wskazówki (formularz, karty, podglądy sesji)',
    defaults: DEFAULT_CLUE_TYPES,
    labels: CLUE_TYPE_LABELS,
  },
};

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

export function CampaignSettingsPanel({ campaignId }: { campaignId: string }) {
  const initial = useMemo(() => loadCampaignCatalogSettings(campaignId), [campaignId]);
  const [draft, setDraft] = useState<CampaignCatalogSettings>(initial);
  const [newCustom, setNewCustom] = useState<Record<CatalogKey, string>>({
    threatType: '',
    locationType: '',
    itemType: '',
    clueType: '',
  });

  function toggleDefault(key: CatalogKey, id: string) {
    setDraft((prev) => {
      const out = clone(prev);
      const set = new Set(out[key].disabledDefaults);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      out[key].disabledDefaults = [...set];
      return out;
    });
  }

  function addCustom(key: CatalogKey) {
    const name = newCustom[key].trim();
    if (!name) {
      toast.error('Podaj nazwę wartości custom');
      return;
    }
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'custom';
    let id = `custom:${slug}`;
    let n = 2;
    while (draft[key].custom.some((c) => c.id === id)) {
      id = `custom:${slug}-${n}`;
      n += 1;
    }
    setDraft((prev) => {
      const out = clone(prev);
      out[key].custom.push({ id, label: name });
      return out;
    });
    setNewCustom((prev) => ({ ...prev, [key]: '' }));
  }

  function removeCustom(key: CatalogKey, id: string) {
    setDraft((prev) => {
      const out = clone(prev);
      out[key].custom = out[key].custom.filter((c) => c.id !== id);
      return out;
    });
  }

  function save() {
    saveCampaignCatalogSettings(campaignId, draft);
    toast.success('Ustawienia kampanii zapisane');
  }

  return (
    <section className="app-panel rounded-[1.8rem] p-6">
      <h2 className="text-primary-900 text-base font-semibold tracking-[-0.02em]">Ustawienia kampanii</h2>
      <p className="text-surface-700 mt-2 max-w-[76ch] text-sm leading-7">
        Domyślne wartości systemowe z podziałem na miejsce użycia. Możesz dodawać własne wpisy i deaktywować domyślne
        per typ.
      </p>

      <div className="mt-4 grid gap-4">
        {(Object.keys(CATALOG_META) as CatalogKey[]).map((key) => {
          const meta = CATALOG_META[key];
          const disabled = new Set(draft[key].disabledDefaults);
          return (
            <div key={key} className="app-input-shell rounded-[1.15rem] p-4">
              <p className="text-surface-800 text-sm font-semibold">{meta.title}</p>
              <p className="text-surface-500 mt-1 text-xs">Występuje w: {meta.where}</p>

              <div className="mt-3 grid gap-1.5 md:grid-cols-2">
                {meta.defaults.map((id) => (
                  <label key={id} className="flex items-center gap-2 rounded-lg border border-surface-200 px-2.5 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={!disabled.has(id)}
                      onChange={() => toggleDefault(key, id)}
                    />
                    <span className={disabled.has(id) ? 'text-surface-400 line-through' : 'text-surface-700'}>
                      {meta.labels[id] ?? id}
                    </span>
                    <span className="ml-auto text-[10px] text-surface-500">domyślne</span>
                  </label>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-dashed border-surface-300 p-3">
                <p className="text-surface-700 text-xs font-medium">Custom ({draft[key].custom.length})</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={newCustom[key]}
                    onChange={(e) => setNewCustom((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Dodaj custom dla: ${meta.title.toLowerCase()}`}
                    className="app-input flex-1 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => addCustom(key)}
                    className="app-button-secondary rounded-lg px-3 py-1.5 text-xs font-semibold"
                  >
                    Dodaj
                  </button>
                </div>
                {draft[key].custom.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {draft[key].custom.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 rounded-lg border border-surface-200 px-2.5 py-1.5">
                        <span className="text-sm text-surface-700">{c.label}</span>
                        <span className="text-[10px] text-surface-500">{c.id}</span>
                        <button
                          type="button"
                          onClick={() => removeCustom(key, c.id)}
                          className="app-button-secondary ml-auto rounded-md px-2 py-1 text-[11px] text-danger-700"
                        >
                          Usuń
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={save}
          className="app-button-primary rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Zapisz ustawienia kampanii
        </button>
      </div>
    </section>
  );
}

