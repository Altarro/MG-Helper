import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X } from 'lucide-react';
import { useFronts } from '../hooks/useFronts';
import { FrontCard } from './FrontCard';
import { FrontForm } from './FrontForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import type { FrontFormValues } from './FrontForm';
import { Shield } from 'lucide-react';
import { FRONT_CATEGORIES, FRONT_CATEGORY_LABELS } from '../types';

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
      front.data.stakes.some((s) => s.toLowerCase().includes(lowerQuery)) ||
      front.tags.some((t) => t.toLowerCase().includes(lowerQuery));
    const matchesCategory = !categoryFilter || front.data.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

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
      toast.success(`Front „${values.name}" utworzony`);
      setShowForm(false);
      navigate(`/fronts/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć frontu');
    } finally {
      setSaving(false);
    }
  }

  const isLoading = fronts === undefined;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-surface-900">Fronty</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nowy front
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Nowy front</h2>
          <FrontForm
            onSubmit={handleCreate}
            isSaving={saving}
            onCancel={() => setShowForm(false)}
            submitLabel="Utwórz"
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj frontów…"
          className="w-full rounded-md border border-surface-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-surface-400" />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !categoryFilter
              ? 'bg-primary-100 text-primary-700'
              : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
          }`}
        >
          Wszystkie
        </button>
        {FRONT_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c === categoryFilter ? null : c)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === c
                ? 'bg-primary-100 text-primary-700'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            {FRONT_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSpinner />
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((front) => (
            <FrontCard key={front.id} front={front} />
          ))}
        </div>
      ) : fronts && fronts.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-10 w-10 text-surface-300" />}
          title="Brak frontów"
          description="Utwórz pierwszy front, by śledzić zagrożenia w kampanii."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" /> Nowy front
            </button>
          }
        />
      ) : (
        <p className="text-sm text-surface-500">Brak wyników dla podanego filtra.</p>
      )}
    </div>
  );
}
