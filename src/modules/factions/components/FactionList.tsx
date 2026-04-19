import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X, Flag } from 'lucide-react';
import { useFactions } from '../hooks/useFactions';
import { FactionCard } from './FactionCard';
import { FactionForm } from './FactionForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import type { FactionFormValues } from './FactionForm';

export function FactionList() {
  const factions = useFactions();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const lowerQuery = query.trim().toLowerCase();
  const filtered = factions?.filter((f) =>
    !lowerQuery ||
    f.name.toLowerCase().includes(lowerQuery) ||
    f.tags.some((t) => t.toLowerCase().includes(lowerQuery)),
  );

  async function handleCreate(values: FactionFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'faction',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: { goals: values.goals, resources: values.resources },
      });
      toast.success(`Frakcja „${values.name}" utworzona`);
      setShowForm(false);
      navigate(`/factions/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć frakcji');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-surface-900">Frakcje</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Nowa frakcja
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Nowa frakcja</h2>
          <FactionForm onSubmit={handleCreate} isSaving={saving} onCancel={() => setShowForm(false)} submitLabel="Utwórz" />
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj frakcji…"
          className="w-full rounded-md border border-surface-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-surface-400" /></button>}
      </div>

      {factions === undefined ? (
        <LoadingSpinner />
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => <FactionCard key={f.id} faction={f} />)}
        </div>
      ) : factions.length === 0 ? (
        <EmptyState
          icon={<Flag className="h-10 w-10 text-surface-300" />}
          title="Brak frakcji"
          description="Utwórz pierwszą frakcję."
          action={<button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"><Plus className="h-4 w-4" /> Nowa frakcja</button>}
        />
      ) : (
        <p className="text-sm text-surface-500">Brak wyników.</p>
      )}
    </div>
  );
}
