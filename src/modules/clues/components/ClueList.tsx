import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { useClues } from '../hooks/useClues';
import { ClueCard } from './ClueCard';
import { ClueForm } from './ClueForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';
import type { Clue } from '../types';
import type { ClueFormValues } from './ClueForm';

type FilterTab = 'all' | 'discovered' | 'hidden' | 'character' | 'location' | 'event';

const TAB_LABELS: Record<FilterTab, string> = {
  all: 'Wszystkie',
  discovered: 'Odkryte',
  hidden: 'Nieodkryte',
  character: 'Postacie',
  location: 'Lokacje',
  event: 'Zdarzenia',
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
      clue.data.clueType === tab;

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
          clueType: values.clueType,
          hint: values.hint,
          discovered: values.discovered,
        },
      });
      toast.success(`Wskazówka „${values.name}" utworzona`);
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
      toast.success(clue.data.discovered ? 'Wskazówka ukryta' : 'Wskazówka odkryta');
    } catch {
      toast.error('Nie udało się zaktualizować wskazówki');
    }
  }

  if (clues === undefined) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-surface-900">Wskazówki</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nowa wskazówka
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-surface-200 bg-surface-50 p-1 w-fit">
        {(Object.entries(TAB_LABELS) as [FilterTab, string][]).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Nowa wskazówka</h2>
          <ClueForm
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
          placeholder="Szukaj wskazówek…"
          className="w-full rounded-md border border-surface-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
        />
      </div>

      {/* List */}
      {filtered === undefined || clues.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-8 w-8" />}
          title="Brak wskazówek"
          description="Dodaj pierwszą wskazówkę dla tej kampanii."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Brak wyników"
          description="Zmień filtry lub wyszukiwaną frazę."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((clue) => (
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
