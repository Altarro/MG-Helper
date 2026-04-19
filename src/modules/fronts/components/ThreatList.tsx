import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, Plus, Search, Shield, X } from 'lucide-react';
import { useThreats } from '../hooks/useThreats';
import { useFronts } from '../hooks/useFronts';
import { ThreatCard } from './ThreatCard';
import { ThreatForm } from './ThreatForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity, addRelation } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { normalizeThreatLifecycle } from '@shared/utils/threatLifecycle';
import { toast } from 'sonner';
import type { ThreatFormValues } from './ThreatForm';

type OwnershipFilter = 'all' | 'fronted' | 'free';

export function ThreatList() {
  const threats = useThreats();
  const fronts = useFronts();
  const navigate = useNavigate();
  const { db } = useCampaign();

  const [query, setQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFrontId, setSelectedFrontId] = useState('');

  const parentFrontEntries = useLiveQuery(async () => {
    const relations = await db.relations.toArray();
    return relations
      .filter((relation) => relation.type === 'belongs_to')
      .map((relation) => ({
        threatId: relation.sourceId,
        frontId: relation.targetId,
      }));
  }, [db]);

  const parentFrontMap = useMemo(() => {
    const frontMap = new Map((fronts ?? []).map((front) => [front.id, front]));
    return new Map(
      (parentFrontEntries ?? [])
        .map(({ threatId, frontId }) => [threatId, frontMap.get(frontId)] as const)
        .filter((entry): entry is readonly [string, NonNullable<typeof entry[1]>] => Boolean(entry[1])),
    );
  }, [fronts, parentFrontEntries]);

  const lowerQuery = query.trim().toLowerCase();
  const filteredThreats = threats?.filter((threat) => {
    const parentFront = parentFrontMap.get(threat.id);
    const matchesQuery =
      !lowerQuery ||
      threat.name.toLowerCase().includes(lowerQuery) ||
      threat.data.impulse.toLowerCase().includes(lowerQuery) ||
      threat.data.moves.some((move) => move.toLowerCase().includes(lowerQuery)) ||
      threat.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      parentFront?.name.toLowerCase().includes(lowerQuery);

    const isFronted = parentFrontMap.has(threat.id);
    const matchesOwnership =
      ownershipFilter === 'all' ||
      (ownershipFilter === 'fronted' && isFronted) ||
      (ownershipFilter === 'free' && !isFronted);

    return matchesQuery && matchesOwnership;
  });

  const frontSections = useMemo(() => {
    const sections = new Map<string, { front: NonNullable<(typeof fronts)>[number]; threats: NonNullable<typeof threats> }>();

    for (const threat of filteredThreats ?? []) {
      const parentFront = parentFrontMap.get(threat.id);
      if (!parentFront) continue;

      const existing = sections.get(parentFront.id);
      if (existing) {
        existing.threats.push(threat);
      } else {
        sections.set(parentFront.id, { front: parentFront, threats: [threat] });
      }
    }

    return [...sections.values()].sort((a, b) => a.front.name.localeCompare(b.front.name));
  }, [filteredThreats, parentFrontMap]);

  const freeThreats = useMemo(
    () => (filteredThreats ?? []).filter((threat) => !parentFrontMap.has(threat.id)),
    [filteredThreats, parentFrontMap],
  );

  async function handleCreate(values: ThreatFormValues) {
    setSaving(true);
    try {
      const lifecycle = normalizeThreatLifecycle(values.status, values.reasonOfDead);
      const entity = await addEntity(db, {
        type: 'threat',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          threatType: values.threatType,
          impulse: values.impulse,
          moves: values.moves,
          trigger: values.trigger,
          inheritanceNotes: values.inheritanceNotes,
          forkThreatId: values.forkThreatId,
          ...lifecycle,
        },
      });

      if (selectedFrontId) {
        await addRelation(db, {
          type: 'belongs_to',
          sourceId: entity.id,
          targetId: selectedFrontId,
        });
      }

      if (values.clock) {
        const clockEntity = await addEntity(db, {
          type: 'clock',
          name: values.clock.name,
          description: '',
          tags: [],
          data: {
            segments: values.clock.segments,
            filled: 0,
            tickLabels: [],
            isActive: lifecycle.status !== 'completed',
          },
        });
        await addRelation(db, { type: 'tracks', sourceId: entity.id, targetId: clockEntity.id });
      }

      toast.success(`Zagrożenie "${values.name}" utworzone`);
      setShowForm(false);
      setSelectedFrontId('');
      navigate(`/threats/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć zagrożenia');
    } finally {
      setSaving(false);
    }
  }

  const isLoading = threats === undefined;
  const hasAnyResults = frontSections.length > 0 || freeThreats.length > 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-surface-900">Zagrożenia</h1>
          <p className="mt-1 text-sm text-surface-500">
            Samodzielny widok presji fabularnych, niezależnie od frontów.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          Nowe zagrożenie
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-surface-900">Nowe zagrożenie</h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setSelectedFrontId('');
              }}
              className="rounded-md p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700"
              aria-label="Zamknij formularz nowego zagrożenia"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 flex flex-col gap-1">
            <label htmlFor="new-threat-front" className="text-sm font-medium text-surface-700">
              Front nadrzędny
            </label>
            <select
              id="new-threat-front"
              value={selectedFrontId}
              onChange={(event) => setSelectedFrontId(event.target.value)}
              className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Brak frontu (wolne zagrożenie)</option>
              {(fronts ?? []).map((front) => (
                <option key={front.id} value={front.id}>
                  {front.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-surface-500">
              Zagrożenie może pozostać wolne albo od razu wejść pod konkretny front.
            </p>
          </div>

          <ThreatForm
            onSubmit={handleCreate}
            isSaving={saving}
            onCancel={() => {
              setShowForm(false);
              setSelectedFrontId('');
            }}
            submitLabel="Utwórz zagrożenie"
          />
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj zagrożeń, impulsów albo frontów..."
          className="w-full rounded-md border border-surface-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            aria-label="Wyczyść wyszukiwanie zagrożeń"
          >
            <X className="h-4 w-4 text-surface-400" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'Wszystkie'],
          ['fronted', 'Podpiete do frontu'],
          ['free', 'Wolne'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setOwnershipFilter(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              ownershipFilter === value
                ? 'bg-amber-100 text-amber-700'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : threats && threats.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10 text-surface-300" />}
          title="Brak zagrożeń"
          description="Utwórz pierwsze zagrożenie, aby rozpisać aktywną presję fabularną kampanii."
          action={(
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              <Plus className="h-4 w-4" /> Nowe zagrożenie
            </button>
          )}
        />
      ) : hasAnyResults ? (
        <div className="flex flex-col gap-4">
          {frontSections.map((section) => (
            <section
              key={section.front.id}
              className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">
                    Front
                  </p>
                  <Link
                    to={`/fronts/${section.front.id}`}
                    className="mt-1 inline-flex max-w-full items-center gap-2 truncate text-sm font-semibold text-primary-700 hover:underline"
                  >
                    {section.front.name}
                  </Link>
                </div>
                <span className="shrink-0 rounded-full bg-surface-100 px-2.5 py-1 text-xs text-surface-500">
                  {section.threats.length} zag.
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {section.threats.map((threat) => (
                  <ThreatCard
                    key={threat.id}
                    threat={threat}
                    onClick={() => navigate(`/threats/${threat.id}`)}
                  />
                ))}
              </div>
            </section>
          ))}

          {freeThreats.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Wolne zagrożenia
                  </p>
                  <p className="mt-1 text-sm text-surface-600">
                    Presje fabularne, które nie są jeszcze podpięte do żadnego frontu.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
                  {freeThreats.length} szt.
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {freeThreats.map((threat) => (
                  <ThreatCard
                    key={threat.id}
                    threat={threat}
                    onClick={() => navigate(`/threats/${threat.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<Shield className="h-10 w-10 text-surface-300" />}
          title="Brak wyników"
          description="Spróbuj zmienić filtr albo wyszukiwanie zagrożeń."
        />
      )}
    </div>
  );
}
