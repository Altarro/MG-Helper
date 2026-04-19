import { useSearchParams, useNavigate } from 'react-router';
import { SearchBar } from '@shared/components/SearchBar';
import { EntityCard } from '@shared/components/EntityCard';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { useSearch } from '@shared/hooks/useSearch';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';
import { Search } from 'lucide-react';
import type { Entity } from '@shared/types/entity';

export function SearchResultsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get('q') ?? '';
  const results = useSearch(query);

  function handleNavigate(entity: Entity) {
    const detailPath = getEntityDetailPath(entity.type, entity.id);
    navigate(detailPath ?? `/search?q=${encodeURIComponent(entity.name)}`);
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold text-surface-900">Wyniki wyszukiwania</h1>

      <div className="mb-6">
        <SearchBar compact={false} />
      </div>

      {!query && (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Wpisz frazę"
          description="Zacznij pisać, aby przeszukać wszystkie encje."
        />
      )}

      {query && results === undefined && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {query && results !== undefined && results.length === 0 && (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Brak wyników"
          description={`Nie znaleziono niczego pasującego do „${query}".`}
        />
      )}

      {results && results.length > 0 && (
        <>
          <p className="mb-3 text-sm text-surface-500">
            Znaleziono: <strong>{results.length}</strong>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {results.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                onClick={() => handleNavigate(entity)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
