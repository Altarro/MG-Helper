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
import { getThreatStatus } from '@shared/utils/entityData';
import { normalizeThreatLifecycle } from '@shared/utils/threatLifecycle';
import { toast } from 'sonner';
import type { ThreatFormValues } from './ThreatForm';

type OwnershipFilter = 'all' | 'fronted' | 'free';
type StatusFilter = 'all' | 'active' | 'completed';

export function ThreatList() {
  const threats = useThreats();
  const fronts = useFronts();
  const navigate = useNavigate();
  const { db } = useCampaign();

  const [query, setQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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

    const threatStatus = getThreatStatus(threat);
    const matchesStatus = statusFilter === 'all' || threatStatus === statusFilter;

    return matchesQuery && matchesOwnership && matchesStatus;
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
      const lifecycle = normalizeThreatLifecycle(values.status, values.completionReason);
      const entity = await addEntity(db, {
        type: 'threat',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          threatType: values.threatType,
          radarArchetype: values.radarArchetype,
          impulse: values.impulse,
          moves: values.moves,
          trigger: values.trigger,
          inheritanceNotes: values.inheritanceNotes,
          forkThreatId: values.forkThreatId,
          ...lifecycle,
          ...(lifecycle.status === 'completed'
            ? { completionOutcome: values.completionOutcome ?? 'resolved_early' }
            : { completionOutcome: undefined }),
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
            kind: 'threat',
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
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(210,166,67,0.42)] bg-[rgba(242,196,88,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c6416]">
              Presja fabularna
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">
              Zagrożenia
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
              Samodzielny widok presji fabularnych, niezależnie od frontów.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="app-accent flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nowe zagrożenie
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj zagrożeń, impulsów albo frontów..."
            className="app-input w-full rounded-2xl py-3 pl-11 pr-10 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-surface-500 transition-colors hover:text-primary-700"
              aria-label="Wyczyść wyszukiwanie zagrożeń"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2.5">
            {([
              ['all', 'Wszystkie'],
              ['fronted', 'Podpięte do frontu'],
              ['free', 'Wolne'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setOwnershipFilter(value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] transition-all ${
                  ownershipFilter === value
                    ? 'app-danger-pill'
                    : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <span aria-hidden="true" className="h-7 w-px bg-[rgba(86,93,94,0.16)]" />

          <div className="flex flex-wrap gap-2.5">
            {([
              ['all', 'Status: wszystkie'],
              ['active', 'Status: aktywne'],
              ['completed', 'Status: zakończone'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] transition-all ${
                  statusFilter === value
                    ? 'app-pill'
                    : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-primary-900">Nowe zagrożenie</h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setSelectedFrontId('');
              }}
              className="rounded-xl p-2 text-surface-500 transition-colors hover:bg-[rgba(223,225,218,0.75)] hover:text-primary-700"
              aria-label="Zamknij formularz nowego zagrożenia"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <label htmlFor="new-threat-front" className="text-sm font-medium text-surface-800">
              Front nadrzędny
            </label>
            <select
              id="new-threat-front"
              value={selectedFrontId}
              onChange={(event) => setSelectedFrontId(event.target.value)}
              className="app-input rounded-2xl px-3 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Brak frontu (wolne zagrożenie)</option>
              {(fronts ?? []).map((front) => (
                <option key={front.id} value={front.id}>
                  {front.name}
                </option>
              ))}
            </select>
            <p className="text-xs leading-6 text-surface-600">
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

      {isLoading ? (
        <LoadingSpinner />
      ) : threats && threats.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<AlertTriangle className="h-10 w-10 text-primary-300" />}
            title="Brak zagrożeń"
            description="Utwórz pierwsze zagrożenie, aby rozpisać aktywną presję fabularną kampanii."
            action={
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="app-accent flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                Nowe zagrożenie
              </button>
            }
          />
        </div>
      ) : hasAnyResults ? (
        <div className="flex flex-col gap-5">
          {frontSections.map((section) => (
            <section key={section.front.id} className="app-panel rounded-[1.85rem] p-4 lg:p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">
                    Front
                  </p>
                  <Link
                    to={`/fronts/${section.front.id}`}
                    className="mt-2 inline-flex max-w-full items-center gap-2 truncate text-lg font-semibold tracking-[-0.03em] text-primary-900 hover:underline"
                  >
                    {section.front.name}
                  </Link>
                </div>
                <span className="app-pill-muted shrink-0 rounded-full px-3 py-1 text-xs">
                  {section.threats.length} zag.
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            <section className="app-panel rounded-[1.85rem] p-4 lg:p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c6416]">
                    Wolne zagrożenia
                  </p>
                  <p className="mt-2 max-w-[58ch] text-sm leading-7 text-surface-700">
                    Presje fabularne, które nie są jeszcze podpięte do żadnego frontu.
                  </p>
                </div>
                <span className="app-danger-pill shrink-0 rounded-full px-3 py-1 text-xs">
                  {freeThreats.length} szt.
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Shield className="h-10 w-10 text-primary-300" />}
            title="Brak wyników"
            description="Spróbuj zmienić filtr albo wyszukiwanie zagrożeń."
          />
        </div>
      )}
    </div>
  );
}
