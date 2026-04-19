import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X, Package } from 'lucide-react';
import { useItems } from '../hooks/useItems';
import { ItemCard } from './ItemCard';
import { ItemForm } from './ItemForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { ITEM_TYPES, ITEM_TYPE_LABELS } from '../types';
import type { ItemFormValues } from './ItemForm';
import type { ItemType } from '../types';

export function ItemList() {
  const items = useItems();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const lowerQuery = query.trim().toLowerCase();
  const filtered = items?.filter((item) => {
    const matchesQuery =
      !lowerQuery ||
      item.name.toLowerCase().includes(lowerQuery) ||
      item.tags.some((t) => t.toLowerCase().includes(lowerQuery));
    const matchesType = typeFilter === 'all' || item.data.itemType === typeFilter;
    return matchesQuery && matchesType;
  });

  async function handleCreate(values: ItemFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'item',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: { itemType: values.itemType, properties: values.properties },
      });
      toast.success(`Przedmiot „${values.name}" utworzony`);
      setShowForm(false);
      navigate(`/items/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć przedmiotu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-surface-900">Przedmioty</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Nowy przedmiot
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Nowy przedmiot</h2>
          <ItemForm onSubmit={handleCreate} isSaving={saving} onCancel={() => setShowForm(false)} submitLabel="Utwórz" />
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj przedmiotów…"
          className="w-full rounded-md border border-surface-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-surface-400" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${typeFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
        >
          Wszystkie
        </button>
        {ITEM_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${typeFilter === t ? 'bg-amber-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
          >
            {ITEM_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {items === undefined ? (
        <LoadingSpinner />
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10 text-surface-300" />}
          title="Brak przedmiotów"
          description="Utwórz pierwszy przedmiot."
          action={<button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"><Plus className="h-4 w-4" /> Nowy przedmiot</button>}
        />
      ) : (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="Brak wyników"
          description="Żaden przedmiot nie pasuje do podanych filtrów."
        />
      )}
    </div>
  );
}
