import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X } from 'lucide-react';
import { useNpcs } from '../hooks/useNpcs';
import { NpcCard } from './NpcCard';
import { NpcForm } from './NpcForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import type { NpcFormValues } from './NpcForm';

export function NpcList() {
  const npcs = useNpcs();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'players' | 'npcs'>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const lowerQuery = query.trim().toLowerCase();
  const filtered = npcs?.filter((npc) => {
    const matchesQuery =
      !lowerQuery ||
      npc.name.toLowerCase().includes(lowerQuery) ||
      npc.data?.instinct?.toLowerCase().includes(lowerQuery) ||
      npc.data?.motivation?.toLowerCase().includes(lowerQuery) ||
      npc.tags.some((t) => t.toLowerCase().includes(lowerQuery));
    const matchesTag = !activeTag || npc.tags.includes(activeTag);
    const matchesTab =
      tab === 'all' ||
      (tab === 'players' && npc.data?.isPC === true) ||
      (tab === 'npcs' && !npc.data?.isPC);
    return matchesQuery && matchesTag && matchesTab;
  });

  // Collect all tags from all NPCs for filter chips
  const allTags = npcs
    ? [...new Set(npcs.flatMap((n) => n.tags))].sort()
    : [];

  async function handleCreate(values: NpcFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'npc',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          instinct: values.instinct,
          motivation: values.motivation,
          appearance: values.appearance,
          playStyle: values.playStyle ?? '',
          isPC: values.isPC ?? false,
          playerName: values.playerName ?? '',
        },
      });
      toast.success(`Postać „${values.name}" utworzona`);
      setShowForm(false);
      navigate(`/npcs/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć postaci');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-surface-900">Postacie</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nowa postać
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-surface-200 bg-surface-50 p-1 w-fit">
        {(['all', 'players', 'npcs'] as const).map((t) => (
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
            {t === 'all' ? 'Wszyscy' : t === 'players' ? 'Gracze' : 'Postacie niezależne'}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Nowa postać</h2>
          <NpcForm
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
          placeholder="Szukaj postaci…"
          className="w-full rounded-md border border-surface-300 py-2 pl-9 pr-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Wyczyść wyszukiwanie"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTag === tag
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {npcs === undefined && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Empty */}
      {npcs !== undefined && filtered!.length === 0 && (
        <EmptyState
          title="Brak postaci"
          description={
            lowerQuery || activeTag || tab !== 'all'
              ? 'Brak wyników dla podanych filtrów.'
              : 'Utwórz pierwszą postać klikając „Nowa postać".'
          }
          action={
            !lowerQuery && !activeTag && tab === 'all' ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Nowa postać
              </button>
            ) : undefined
          }
        />
      )}

      {/* Grid */}
      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((npc) => (
            <NpcCard
              key={npc.id}
              npc={npc}
              onClick={() => navigate(`/npcs/${npc.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
