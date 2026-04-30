import { useMemo, useState } from 'react';
import { Plus, Search, Shield, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { FrontCard } from './FrontCard';
import { FrontForm } from './FrontForm';
import { useFronts } from '../hooks/useFronts';
import { FilterCountBadge } from '@shared/components/FilterCountBadge';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { formatPolishFrontCount } from '@shared/utils/polishPlural';
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
  const queryMatchedFronts = fronts?.filter((front) => {
    const matchesQuery =
      !lowerQuery ||
      front.name.toLowerCase().includes(lowerQuery) ||
      front.data.stakes.some((stake) => stake.toLowerCase().includes(lowerQuery)) ||
      front.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
    return matchesQuery;
  });
  const filtered = queryMatchedFronts?.filter(
    (front) => !categoryFilter || front.data.category === categoryFilter,
  );
  const categoryCounts = useMemo(() => {
    const list = queryMatchedFronts ?? [];
    const byCategory = new Map<string, number>();
    for (const cat of FRONT_CATEGORIES) {
      byCategory.set(cat, 0);
    }
    for (const front of list) {
      byCategory.set(front.data.category, (byCategory.get(front.data.category) ?? 0) + 1);
    }
    return { all: list.length, byCategory };
  }, [queryMatchedFronts]);

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
          goal: values.goal,
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
            <div className="text-primary-700 mb-3 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
              Fronty
            </div>
            <h1 className="text-primary-900 text-3xl font-semibold tracking-[-0.04em] lg:text-[2.2rem]">
              Fronty
            </h1>
            <p className="text-surface-700 mt-2 max-w-[62ch] text-sm leading-7 lg:text-[0.98rem]">
              Główne kontenery kampanii, porządkujące większe osie konfliktu i presji.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nowy front
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="text-surface-500 pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj frontów, stawek albo tagów..."
            className="app-input text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-2xl py-3 pr-10 pl-11 text-sm focus:ring-2 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-surface-500 hover:text-primary-700 absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 transition-colors"
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
              !categoryFilter ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
            }`}
          >
            <span>Wszystkie</span>
            <FilterCountBadge selected={!categoryFilter} count={categoryCounts.all} />
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
              <span>{FRONT_CATEGORY_LABELS[category]}</span>
              <FilterCountBadge
                selected={categoryFilter === category}
                count={categoryCounts.byCategory.get(category) ?? 0}
              />
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-primary-900 text-base font-semibold tracking-[-0.02em]">
              Nowy front
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-surface-500 hover:text-primary-700 rounded-xl p-2 transition-colors hover:bg-[rgba(223,225,218,0.75)]"
              aria-label="Zamknij formularz nowego frontu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

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
            icon={<Shield className="text-primary-300 h-10 w-10" />}
            title="Brak frontów"
            description="Utwórz pierwszy front, by uporządkować główne osie kampanii."
            action={
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
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
            icon={<Search className="text-primary-300 h-8 w-8" />}
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
                  <p className="text-surface-500 text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Kategoria frontu
                  </p>
                  <h2 className="text-primary-900 mt-2 text-lg font-semibold tracking-[-0.03em]">
                    {FRONT_CATEGORY_LABELS[section.category]}
                  </h2>
                </div>
                <span className="app-pill-muted shrink-0 rounded-full px-3 py-1 text-xs">
                  {formatPolishFrontCount(section.fronts.length)}
                </span>
              </div>

              <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
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
