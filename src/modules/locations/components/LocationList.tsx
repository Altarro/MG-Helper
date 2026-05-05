import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X } from 'lucide-react';
import { useLocations } from '../hooks/useLocations';
import { LocationCard } from './LocationCard';
import { LocationForm } from './LocationForm';
import { FilterCountBadge } from '@shared/components/FilterCountBadge';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity, assignContainment } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { createLocationData } from '../types';
import type { LocationFormValues } from './LocationForm';
import { getLocationLifecycleStatus } from '@shared/utils/entityData';
import { stripHtml } from '@shared/utils/sanitize';
import { getActiveCatalogOptions } from '@modules/settings/campaignCatalogSettings';

type FilterType = 'all' | string;

export function LocationList() {
  const locations = useLocations();
  const navigate = useNavigate();
  const { db, campaignId } = useCampaign();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [hideDestroyed, setHideDestroyed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const typeOptions = getActiveCatalogOptions(campaignId, 'locationType');

  const lowerQuery = query.trim().toLowerCase();
  const queryMatchedLocations = locations?.filter((loc) => {
    const matchesQuery =
      !lowerQuery ||
      loc.name.toLowerCase().includes(lowerQuery) ||
      stripHtml(loc.description ?? '').toLowerCase().includes(lowerQuery) ||
      loc.data.senses.see.toLowerCase().includes(lowerQuery) ||
      loc.data.senses.hear.toLowerCase().includes(lowerQuery) ||
      loc.data.senses.smell.toLowerCase().includes(lowerQuery) ||
      loc.data.senses.feel.toLowerCase().includes(lowerQuery) ||
      loc.tags.some((t) => t.toLowerCase().includes(lowerQuery));
    return matchesQuery;
  });
  const queryDestroyMatched = queryMatchedLocations?.filter(
    (loc) =>
      !hideDestroyed || getLocationLifecycleStatus({ data: loc.data }) !== 'completed',
  );
  const filtered = queryMatchedLocations?.filter((loc) => {
    const matchesType = typeFilter === 'all' || loc.data.locationType === typeFilter;
    const matchesDestroyed =
      !hideDestroyed || getLocationLifecycleStatus({ data: loc.data }) !== 'completed';
    return matchesType && matchesDestroyed;
  });

  const typeCounts = useMemo(() => {
    const list = queryDestroyMatched ?? [];
    const counts: Partial<Record<FilterType, number>> = { all: list.length };
    for (const { id: type } of typeOptions) {
      counts[type] = list.filter((loc) => loc.data.locationType === type).length;
    }
    return counts as Record<FilterType, number>;
  }, [queryDestroyMatched, typeOptions]);

  const destroyedInTypeSelection = useMemo(() => {
    const list =
      queryMatchedLocations?.filter(
        (loc) => typeFilter === 'all' || loc.data.locationType === typeFilter,
      ) ?? [];
    return list.filter((loc) => getLocationLifecycleStatus({ data: loc.data }) === 'completed')
      .length;
  }, [queryMatchedLocations, typeFilter]);

  async function handleCreate(values: LocationFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'location',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: createLocationData({
          locationType: values.locationType,
          danger: values.danger,
          senses: { see: values.see, hear: values.hear, smell: values.smell, feel: values.feel },
          imageId: values.imageId ?? null,
          imageAlt: values.imageAlt ?? '',
        }),
      });
      if (values.parentLocationId) {
        await assignContainment(db, { sourceId: values.parentLocationId, targetId: entity.id });
      }
      toast.success(`Lokacja "${values.name}" utworzona`);
      setShowForm(false);
      navigate(`/locations/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć lokacji');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">
              Świat gry
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">
              Lokacje
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
              Miejsca, regiony i punkty napięcia w świecie kampanii.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nowa lokacja
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj lokacji..."
            className="app-input w-full rounded-2xl py-3 pl-11 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Wyczyść"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-surface-500 transition-colors hover:text-primary-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${typeFilter === 'all' ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'}`}
          >
            <span>Wszystkie</span>
            <FilterCountBadge selected={typeFilter === 'all'} count={typeCounts.all ?? 0} />
          </button>
          {typeOptions.map(({ id: type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${typeFilter === type ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'}`}
            >
              <span>{label}</span>
              <FilterCountBadge selected={typeFilter === type} count={typeCounts[type] ?? 0} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHideDestroyed((v) => !v)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              hideDestroyed ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
            }`}
          >
            <span>Ukryj zniszczone</span>
            <FilterCountBadge selected={hideDestroyed} count={destroyedInTypeSelection} />
          </button>
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.02em] text-primary-900">Nowa lokacja</h2>
          <LocationForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isSaving={saving} />
        </div>
      )}

      {locations === undefined ? (
        <LoadingSpinner />
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((loc) => (
            <LocationCard key={loc.id} location={loc} onClick={() => navigate(`/locations/${loc.id}`)} />
          ))}
        </div>
      ) : (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            title="Brak lokacji"
            description={
              lowerQuery || typeFilter !== 'all' || hideDestroyed
                ? 'Brak wyników dla podanych filtrów.'
                : 'Utwórz pierwszą lokację klikając „Nowa lokacja”.'
            }
            action={
              !lowerQuery && typeFilter === 'all' && !hideDestroyed ? (
                <button type="button" onClick={() => setShowForm(true)} className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium">
                  Nowa lokacja
                </button>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
