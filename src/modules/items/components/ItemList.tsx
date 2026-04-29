import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X, Package } from 'lucide-react';
import { useItems } from '../hooks/useItems';
import { ItemCard } from './ItemCard';
import { ItemForm } from './ItemForm';
import { FilterCountBadge } from '@shared/components/FilterCountBadge';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { ITEM_TYPES, ITEM_TYPE_LABELS } from '../types';
import type { ItemFormValues } from './ItemForm';
import type { ItemType } from '../types';
import { getItemLifecycleStatus } from '@shared/utils/entityData';

export function ItemList() {
  const items = useItems();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all');
  const [hideDestroyed, setHideDestroyed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const lowerQuery = query.trim().toLowerCase();
  const queryMatchedItems = items?.filter((item) => {
    const matchesQuery =
      !lowerQuery ||
      item.name.toLowerCase().includes(lowerQuery) ||
      item.tags.some((t) => t.toLowerCase().includes(lowerQuery));
    return matchesQuery;
  });
  const queryDestroyMatched = queryMatchedItems?.filter(
    (item) =>
      !hideDestroyed || getItemLifecycleStatus({ data: item.data }) !== 'completed',
  );
  const filtered = queryMatchedItems?.filter((item) => {
    const matchesType = typeFilter === 'all' || item.data.itemType === typeFilter;
    const matchesDestroyed =
      !hideDestroyed || getItemLifecycleStatus({ data: item.data }) !== 'completed';
    return matchesType && matchesDestroyed;
  });

  const typeCounts = useMemo(() => {
    const list = queryDestroyMatched ?? [];
    const counts: Partial<Record<ItemType | 'all', number>> = { all: list.length };
    for (const t of ITEM_TYPES) {
      counts[t] = list.filter((item) => item.data.itemType === t).length;
    }
    return counts as Record<ItemType | 'all', number>;
  }, [queryDestroyMatched]);

  const destroyedInTypeSelection = useMemo(() => {
    const list =
      queryMatchedItems?.filter(
        (item) => typeFilter === 'all' || item.data.itemType === typeFilter,
      ) ?? [];
    return list.filter((item) => getItemLifecycleStatus({ data: item.data }) === 'completed')
      .length;
  }, [queryMatchedItems, typeFilter]);

  async function handleCreate(values: ItemFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'item',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          itemType: values.itemType,
          properties: values.properties,
          imageId: values.imageId ?? null,
          imageAlt: values.imageAlt ?? '',
        },
      });
      toast.success(`Przedmiot "${values.name}" utworzony`);
      setShowForm(false);
      navigate(`/items/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć przedmiotu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(210,166,67,0.42)] bg-[rgba(242,196,88,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c6416]">
              Ekwipunek
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">
              Przedmioty
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
              Przedmioty, artefakty i zasoby używane podczas kampanii.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" /> Nowy przedmiot
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj przedmiotów..."
            className="app-input w-full rounded-2xl py-3 pl-11 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-surface-500 transition-colors hover:text-primary-700">
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
            <FilterCountBadge selected={typeFilter === 'all'} count={typeCounts.all} />
          </button>
          {ITEM_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${typeFilter === t ? 'app-danger-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'}`}
            >
              <span>{ITEM_TYPE_LABELS[t]}</span>
              <FilterCountBadge selected={typeFilter === t} count={typeCounts[t]} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHideDestroyed((v) => !v)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              hideDestroyed ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
            }`}
          >
            <span>Ukryj zniszczone / zgubione</span>
            <FilterCountBadge selected={hideDestroyed} count={destroyedInTypeSelection} />
          </button>
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.02em] text-primary-900">Nowy przedmiot</h2>
          <ItemForm onSubmit={handleCreate} isSaving={saving} onCancel={() => setShowForm(false)} submitLabel="Utwórz" />
        </div>
      )}

      {items === undefined ? (
        <LoadingSpinner />
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Package className="h-10 w-10 text-primary-300" />}
            title={items.length === 0 ? 'Brak przedmiotów' : 'Brak wyników'}
            description={
              items.length === 0
                ? 'Utwórz pierwszy przedmiot.'
                : 'Żaden przedmiot nie pasuje do podanych filtrów (typ, wyszukiwanie, ukryte zniszczone).'
            }
            action={
              items.length === 0 && !hideDestroyed && typeFilter === 'all' && !lowerQuery ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium"
                >
                  Nowy przedmiot
                </button>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
