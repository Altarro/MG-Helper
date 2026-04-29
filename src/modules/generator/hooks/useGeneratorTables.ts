import { useMemo } from 'react';
import { useDebounce } from '@shared/hooks';
import type { GeneratorPack, GeneratorTable } from '../contracts';

interface UseGeneratorTablesOptions {
  activePack: GeneratorPack | null;
  customSearch?: string;
  tagFilter?: string;
  favoriteTableIds?: string[];
  favoritesOnly?: boolean;
  debounceMs?: number;
}

export function useGeneratorTables(options: UseGeneratorTablesOptions) {
  const {
    activePack,
    customSearch = '',
    tagFilter = '',
    favoriteTableIds = [],
    favoritesOnly = false,
    debounceMs = 180,
  } = options;
  const debouncedCustomSearch = useDebounce(customSearch, debounceMs);
  const normalizedCustomSearch = debouncedCustomSearch.trim().toLowerCase();
  const normalizedTagFilter = tagFilter.trim().toLowerCase();

  const allTables = useMemo(() => activePack?.tables ?? [], [activePack]);
  const tableById = useMemo(
    () => new Map(allTables.map((table) => [table.id, table])),
    [allTables],
  );
  const customTables = useMemo(
    () => allTables.filter((table) => table.type.startsWith('custom:')),
    [allTables],
  );
  const filteredCustomTables = useMemo(() => {
    return customTables
      .filter((table) => (favoritesOnly ? favoriteTableIds.includes(table.id) : true))
      .filter((table) =>
        normalizedCustomSearch ? table.name.toLowerCase().includes(normalizedCustomSearch) : true,
      )
      .filter((table) =>
        normalizedTagFilter
          ? table.entries.some((entry) =>
              entry.tags.some((tag) => tag.toLowerCase().includes(normalizedTagFilter)),
            )
          : true,
      );
  }, [customTables, favoriteTableIds, favoritesOnly, normalizedCustomSearch, normalizedTagFilter]);
  const systemTables = useMemo(
    () => allTables.filter((table) => !table.type.startsWith('custom:')),
    [allTables],
  );

  function getTableById(tableId: string): GeneratorTable | null {
    return tableById.get(tableId) ?? null;
  }

  return {
    allTables,
    systemTables,
    customTables,
    filteredCustomTables,
    debouncedCustomSearch,
    getTableById,
  };
}

