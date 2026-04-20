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
      toast.error('Nie udało się utworzyć frontu');
    } finally {
      setSaving(false);
    }
  }

  if (fronts === undefined) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(210,166,67,0.42)] bg-[rgba(242,196,88,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c6416]">
              Fronty
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">
              Fronty
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
              Główne kontenery kampanii, porządkujące większe osie konfliktu i presji.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="app-accent flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nowy front
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj frontów, stawek albo tagów..."
            className="app-input w-full rounded-2xl py-3 pl-11 pr-10 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-surface-500 transition-colors hover:text-primary-700"
              aria-label="Wyczyść wyszukiwanie frontów"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] transition-all ${
              !categoryFilter
                ? 'app-pill'
                : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
            }`}
          >
            Wszystkie
          </button>
          {FRONT_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category === categoryFilter ? null : category)}
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] transition-all ${
                categoryFilter === category
                  ? 'app-pill'
                  : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
              }`}
            >
              {FRONT_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.02em] text-primary-900">Nowy front</h2>
          <FrontForm
            onSubmit={handleCreate}
            isSaving={saving}
            onCancel={() => setShowForm(false)}
            submitLabel="Utwórz"
          />
        </div>
      )}

      {fronts.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Shield className="h-10 w-10 text-primary-300" />}
            title="Brak frontów"
            description="Utwórz pierwszy front, by uporządkować główne osie kampanii."
            action={
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="app-accent flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                Nowy front
              </button>
            }
          />
        </div>
      ) : sections.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Search className="h-8 w-8 text-primary-300" />}
            title="Brak wyników"
            description="Spróbuj zmienić filtr albo wyszukiwaną frazę."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {sections.map((section) => (
            <section key={section.category} className="app-panel rounded-[1.85rem] p-4 lg:p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">
                    Kategoria frontu
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-primary-900">
                    {FRONT_CATEGORY_LABELS[section.category]}
                  </h2>
                </div>
                <span className="app-pill-muted shrink-0 rounded-full px-3 py-1 text-xs">
                  {section.fronts.length} front.
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
