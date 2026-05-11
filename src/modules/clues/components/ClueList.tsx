// ARCHIWALNE: aktywny widok listy jest eksportowany z ClueListPage.tsx.
// Ten komponent zostaje tylko jako odniesienie do starszej wersji UI; nie podpinaj go w routerze.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, Zap } from 'lucide-react';
import { useClues } from '../hooks/useClues';
import { ClueCard } from './ClueCard';
import { ClueForm } from './ClueForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import type { Clue } from '../types';
import type { ClueFormValues } from './ClueForm';

type FilterTab = 'all' | 'discovered' | 'hidden' | 'character' | 'location' | 'event' | 'item';

const TAB_LABELS: Record<FilterTab, string> = {
  all: 'Wszystkie',
  discovered: 'Odkryte',
  hidden: 'Nieodkryte',
  character: 'Postacie',
  location: 'Lokacje',
  event: 'Zdarzenia',
  item: 'Przedmioty',
};

export function ClueList() {
  const clues = useClues();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const lowerQuery = query.trim().toLowerCase();
  const filtered = clues?.filter((clue) => {
    const matchesQuery =
      !lowerQuery ||
      clue.name.toLowerCase().includes(lowerQuery) ||
      clue.data.hint.toLowerCase().includes(lowerQuery) ||
      clue.tags.some((t) => t.toLowerCase().includes(lowerQuery));

    const matchesTab =
      tab === 'all' ||
      (tab === 'discovered' && clue.data.discovered) ||
      (tab === 'hidden' && !clue.data.discovered) ||
      (tab !== 'discovered' && tab !== 'hidden' && clue.data.clueTypes.includes(tab));

    return matchesQuery && matchesTab;
  });

  async function handleCreate(values: ClueFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'clue',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          clueTypes: values.clueTypes,
          clueType: values.clueTypes[0],
          hint: values.hint,
          discovered: values.discovered,
        },
      });
      toast.success(`Wskazówka "${values.name}" utworzona`);
      setShowForm(false);
      navigate(`/clues/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć wskazówki');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleDiscovered(clue: Clue) {
    try {
      await updateEntity(db, clue.id, {
        data: { ...clue.data, discovered: !clue.data.discovered },
      });
      toast.success(
        clue.data.discovered
          ? 'Wskazówka oznaczona jako nieodkryta'
          : 'Wskazówka odkryta',
      );
    } catch {
      toast.error('Nie udało się zaktualizować wskazówki');
    }
  }

  if (clues === undefined) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">
              Tropy kampanii
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">
              Wskazówki
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
              Ślady, tropy i informacje, które napędzają odkrywanie świata i zagrożeń.
            </p>
          </div>

          <button type="button" onClick={() => setShowForm(true)} className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5">
            <Plus className="h-4 w-4" />
            Nowa wskazówka
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {(Object.entries(TAB_LABELS) as [FilterTab, string][]).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${tab === t ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj wskazówek..."
            className="app-input w-full rounded-2xl py-3 pl-11 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.02em] text-primary-900">Nowa wskazówka</h2>
          <ClueForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isSaving={saving} />
        </div>
      )}

      {clues.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Zap className="h-8 w-8 text-primary-300" />}
            title="Brak wskazówek"
            description="Dodaj pierwszą wskazówkę dla tej kampanii."
          />
        </div>
      ) : filtered && filtered.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Search className="h-8 w-8 text-primary-300" />}
            title="Brak wyników"
            description="Zmień filtry lub wyszukiwaną frazę."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered?.map((clue) => (
            <ClueCard
              key={clue.id}
              clue={clue}
              onClick={() => navigate(`/clues/${clue.id}`)}
              onToggleDiscovered={handleToggleDiscovered}
            />
          ))}
        </div>
      )}
    </div>
  );
}
