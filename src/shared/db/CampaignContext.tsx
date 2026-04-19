import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { openCampaignDb, type MgHelperDb } from './database';
import {
  listCampaigns,
  getActiveCampaignId,
  setActiveCampaignId,
} from './campaignStore';
import { migrateLegacyDb } from './migrateLegacyDb';
import { toast } from 'sonner';

// ── Context shape ──────────────────────────────────────────────────────────────

interface CampaignContextValue {
  db: MgHelperDb;
  campaignId: string;
  campaignName: string;
  setActiveCampaign: (id: string) => void;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

interface CampaignProviderProps {
  children: ReactNode;
}

export function CampaignProvider({ children }: CampaignProviderProps) {
  const [campaignId, setCampaignId] = useState<string>(
    () => getActiveCampaignId() ?? '',
  );

  const [db, setDb] = useState<MgHelperDb>(() => {
    const id = getActiveCampaignId();
    return openCampaignDb(id ?? '__placeholder__');
  });

  // Run migration once on first mount; updates state if migration took place
  useEffect(() => {
    migrateLegacyDb().then((migrated) => {
      if (migrated) {
        toast.info('Dane przeniesione do kampanii „Moja kampania"');
        setActiveCampaignId('legacy');
        setCampaignId('legacy');
        setDb(openCampaignDb('legacy'));
      }
    });

  }, []);

  const campaignName =
    listCampaigns().find((c) => c.id === campaignId)?.name ?? '';

  function setActiveCampaign(id: string) {
    setActiveCampaignId(id);
    setCampaignId(id);
    setDb(openCampaignDb(id));
  }

  return (
    <CampaignContext.Provider value={{ db, campaignId, campaignName, setActiveCampaign }}>
      {children}
    </CampaignContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useCampaign(): CampaignContextValue {
  const ctx = useContext(CampaignContext);
  if (!ctx) {
    throw new Error('useCampaign must be used inside <CampaignProvider>');
  }
  return ctx;
}
