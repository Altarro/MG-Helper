import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { useCampaign } from '@shared/db/CampaignContext';
import { ensureDefaultGeneratorPack } from '../repository';
import type { GeneratorPack } from '../contracts';
import { useGeneratorTables } from './useGeneratorTables';

interface UseGeneratorPacksOptions {
  customSearch?: string;
  tagFilter?: string;
  favoritesOnly?: boolean;
  favoriteTableIds?: string[];
}

export function useGeneratorPacks(options: UseGeneratorPacksOptions = {}) {
  const { customSearch = '', tagFilter = '', favoritesOnly = false, favoriteTableIds = [] } = options;
  const { db, campaignId } = useCampaign();
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const packs = useLiveQuery(
    () =>
      db.generatorPacks
        .where('campaignId')
        .equals(campaignId)
        .toArray(),
    [db, campaignId],
  );

  const activePack = useMemo(() => {
    const list = packs ?? [];
    if (list.length === 0) return null;
    return (list.find((item) => item.isActive) ?? list[0]) as GeneratorPack;
  }, [packs]);

  const { customTables, filteredCustomTables, systemTables, allTables, getTableById } = useGeneratorTables({
    activePack,
    customSearch,
    tagFilter,
    favoritesOnly,
    favoriteTableIds,
  });

  async function bootstrapDefaultPack() {
    setIsBootstrapping(true);
    try {
      const pack = await ensureDefaultGeneratorPack(db, campaignId);
      toast.success(`Przygotowano zestaw: ${pack.name}`);
    } catch {
      toast.error('Nie udalo sie przygotowac domyslnego zestawu');
    } finally {
      setIsBootstrapping(false);
    }
  }

  return {
    activePack,
    allTables,
    systemTables,
    customTables,
    filteredCustomTables,
    getTableById,
    isBootstrapping,
    bootstrapDefaultPack,
  };
}

