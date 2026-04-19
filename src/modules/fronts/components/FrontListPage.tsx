import { useMemo, useState } from 'react';
import { Plus, Search, Shield, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { FrontCard } from './FrontCard';
import { FrontForm } from './FrontForm';
import { useFronts } from '../hooks/useFronts';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { FRONT_CATEGORIES, FRONT_CATEGORY_LABELS } from '../types';
import type { FrontFormValues } from './FrontForm';

export function FrontList() {
  const fronts = useFronts();
  const navigate = useNavigate();
  const { db } = useCampaign();

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const lowerQuery = query.trim().toLowerCase();
  const filtered = fronts?.filter((front) => {
    const matchesQuery =
      !lowerQuery ||
      front.name.toLowerCase().includes(lowerQuery) ||
      front.data.stakes.some((stake) => stake.toLowerCase().includes(lowerQuery)) ||
      front.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
    const matchesCategory = !categoryFilter || front.data.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  const sections = useMemo(
    () =>
      FRONT_CATEGORIES.map((category) => ({
        category,
        fronts: (filtered ?? []).filter((front) => front.data.category === category),
      })).filter((section) => section.fronts.length > 0),
    [filtered],
  );

  async function handleCreate(values: FrontFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'front',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          category: values.category,
          stakes: values.stakes,
        },
      });
      toast.success(`Front "${values.name}" utworzony`);
      setShowForm(false);
      navigate(`/fronts/${entity.id}`);
    } catch {
      toast.error('Nie udalo sie utworzyc frontu');
    } finally {
      setSaving(false);
    }
  }

  if (fronts === undefined) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-surface-900">Fronty</h1>
          <p className="mt-1 text-sm text-surface-500">
            Glowne kontenery kampanii, porzadkujace wieksze osie konfliktu i presji.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nowy front
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Nowy front</h2>
          <FrontForm
            onSubmit={handleCreate}
            isSaving={saving}
            onCancel={() => setShowForm(false)}
            submitLabel="Utworz"
          />
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj frontow, stawek albo tagow..."
          className="w-full rounded-md border border-surface-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            aria-label="Wyczysc wyszukiwanie frontow"
          >
            <X className="h-4 w-4 text-surface-400" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !categoryFilter
              ? 'bg-primary-100 text-primary-700'
              : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
          }`}
        >
          Wszystkie
        </button>
        {FRONT_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setCategoryFilter(category === categoryFilter ? null : category)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === category
                ? 'bg-primary-100 text-primary-700'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            {FRONT_CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {fronts.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-10 w-10 text-surface-300" />}
          title="Brak frontow"
          description="Utworz pierwszy front, by uporzadkowac glowne osie kampanii."
          action={
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Nowy front
            </button>
          }
        />
      ) : sections.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Brak wynikow"
          description="Sprobuj zmienic filtr albo wyszukiwana fraze."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <section
              key={section.category}
              className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">
                    Kategoria frontu
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-surface-900">
                    {FRONT_CATEGORY_LABELS[section.category]}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full bg-surface-100 px-2.5 py-1 text-xs text-surface-500">
                  {section.fronts.length} front.
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {section.fronts.map((front) => (
                  <FrontCard key={front.id} front={front} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
