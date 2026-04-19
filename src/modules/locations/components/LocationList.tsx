import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X } from 'lucide-react';
import { useLocations } from '../hooks/useLocations';
import { LocationCard } from './LocationCard';
import { LocationForm } from './LocationForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity, assignContainment } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { createLocationData, LOCATION_TYPE_LABELS } from '../types';
import type { LocationType } from '../types';
import type { LocationFormValues } from './LocationForm';

type FilterType = 'all' | LocationType;

export function LocationList() {
  const locations = useLocations();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const lowerQuery = query.trim().toLowerCase();
  const filtered = locations?.filter((loc) => {
    const matchesQuery =
      !lowerQuery ||
      loc.name.toLowerCase().includes(lowerQuery) ||
      loc.tags.some((t) => t.toLowerCase().includes(lowerQuery));
    const matchesType = typeFilter === 'all' || loc.data.locationType === typeFilter;
    return matchesQuery && matchesType;
  });

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
        }),
      });
      // Create parent relation if specified
      if (values.parentLocationId) {
        await assignContainment(db, { sourceId: values.parentLocationId, targetId: entity.id });
      }
      toast.success(`Lokacja „${values.name}" utworzona`);
      setShowForm(false);
      navigate(`/locations/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć lokacji');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-surface-900">Lokacje</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nowa lokacja
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Nowa lokacja</h2>
          <LocationForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSaving={saving}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj lokacji…"
          className="w-full rounded-md border border-surface-300 py-2 pl-9 pr-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Wyczyść"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            typeFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
          }`}
        >
          Wszystkie
        </button>
        {(Object.entries(LOCATION_TYPE_LABELS) as [LocationType, string][]).map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === type ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {locations === undefined && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Empty */}
      {locations !== undefined && filtered!.length === 0 && (
        <EmptyState
          title="Brak lokacji"
          description={
            lowerQuery || typeFilter !== 'all'
              ? 'Brak wyników dla podanych filtrów.'
              : 'Utwórz pierwszą lokację klikając „Nowa lokacja".'
          }
          action={
            !lowerQuery && typeFilter === 'all' ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Nowa lokacja
              </button>
            ) : undefined
          }
        />
      )}

      {/* Grid */}
      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              onClick={() => navigate(`/locations/${loc.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
