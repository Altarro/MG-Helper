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
import { getFactionLifecycleStatus } from '@shared/utils/entityData';

export function FactionList() {
  const factions = useFactions();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hideDisbanded, setHideDisbanded] = useState(false);

  const lowerQuery = query.trim().toLowerCase();
  const filtered = factions?.filter((f) => {
    if (hideDisbanded && getFactionLifecycleStatus({ data: f.data }) === 'completed') return false;
    return (
      !lowerQuery ||
      f.name.toLowerCase().includes(lowerQuery) ||
      f.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  });

  async function handleCreate(values: FactionFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'faction',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          goals: values.goals,
          resources: values.resources,
          imageId: values.imageId ?? null,
          imageAlt: values.imageAlt ?? '',
        },
      });
      toast.success(`Frakcja "${values.name}" utworzona`);
      setShowForm(false);
      navigate(`/factions/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć frakcji');
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
              Siły świata
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">
              Frakcje
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
              Organizacje, stronnictwa i ośrodki wpływu obecne w kampanii.
            </p>
          </div>

          <button type="button" onClick={() => setShowForm(true)} className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5">
            <Plus className="h-4 w-4" /> Nowa frakcja
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj frakcji..."
            className="app-input w-full rounded-2xl py-3 pl-11 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {query && <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-surface-500 transition-colors hover:text-primary-700"><X className="h-4 w-4" /></button>}
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-surface-700">
          <input
            type="checkbox"
            checked={hideDisbanded}
            onChange={(e) => setHideDisbanded(e.target.checked)}
            className="border-surface-300 accent-primary-600 h-4 w-4 rounded"
          />
          Ukryj rozbite
        </label>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.02em] text-primary-900">Nowa frakcja</h2>
          <FactionForm onSubmit={handleCreate} isSaving={saving} onCancel={() => setShowForm(false)} submitLabel="Utwórz" />
        </div>
      )}

      {factions === undefined ? (
        <LoadingSpinner />
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => <FactionCard key={f.id} faction={f} />)}
        </div>
      ) : (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Flag className="h-10 w-10 text-primary-300" />}
            title={factions.length === 0 ? 'Brak frakcji' : 'Brak wyników'}
            description={factions.length === 0 ? 'Utwórz pierwszą frakcję.' : 'Żadna frakcja nie pasuje do wyszukiwania.'}
            action={factions.length === 0 ? <button onClick={() => setShowForm(true)} className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium">Nowa frakcja</button> : undefined}
          />
        </div>
      )}
    </div>
  );
}
