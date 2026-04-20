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

  const allTags = npcs ? [...new Set(npcs.flatMap((n) => n.tags))].sort() : [];

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
      toast.success(`Postać "${values.name}" utworzona`);
      setShowForm(false);
      navigate(`/npcs/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć postaci');
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
              Postacie
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">
              Postacie
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
              Gracze i postacie niezależne, uporządkowane do pracy przy stole.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nowa postać
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {([
            ['all', 'Wszyscy'],
            ['players', 'Gracze'],
            ['npcs', 'Postacie niezależne'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] transition-all ${
                tab === value ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
              }`}
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
            placeholder="Szukaj postaci, instynktów albo motywacji..."
            className="app-input w-full rounded-2xl py-3 pl-11 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-surface-500 transition-colors hover:text-primary-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeTag === tag ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.02em] text-primary-900">Nowa postać</h2>
          <NpcForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isSaving={saving} />
        </div>
      )}

      {npcs === undefined ? (
        <LoadingSpinner />
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((npc) => (
            <NpcCard key={npc.id} npc={npc} onClick={() => navigate(`/npcs/${npc.id}`)} />
          ))}
        </div>
      ) : (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            title="Brak postaci"
            description={
              lowerQuery || activeTag || tab !== 'all'
                ? 'Brak wyników dla podanych filtrów.'
                : 'Utwórz pierwszą postać, aby zacząć budować obsadę kampanii.'
            }
            action={
              !lowerQuery && !activeTag && tab === 'all' ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium"
                >
                  Nowa postać
                </button>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
