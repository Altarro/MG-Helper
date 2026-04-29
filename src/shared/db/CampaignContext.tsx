import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { openCampaignDb, type MgHelperDb } from './database';
import {
  listCampaigns,
  getActiveCampaignId,
  setActiveCampaignId,
} from './campaignStore';
import { migrateLegacyDb } from './migrateLegacyDb';
import { ensureGeneratorDataIntegrity } from '@modules/generator/dataHealth';
import { trackGeneratorEvent } from '@modules/generator/telemetry';
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

  useEffect(() => {
    let cancelled = false;
    async function validateGeneratorData() {
      try {
        const result = await ensureGeneratorDataIntegrity(db, campaignId);
        trackGeneratorEvent({
          name: 'generator_integrity_check',
          campaignId,
          repaired: result.repaired,
          droppedPacks: result.droppedPacks,
          droppedLogs: result.droppedLogs,
        });
        if (cancelled || !result.repaired) return;
        const notices: string[] = [];
        if (result.droppedPacks > 0) notices.push(`usunieto paczki: ${result.droppedPacks}`);
        if (result.droppedLogs > 0) notices.push(`usunieto logi: ${result.droppedLogs}`);
        const suffix = notices.length > 0 ? ` (${notices.join(', ')})` : '';
        toast.warning(`Naprawiono niespójne dane generatora${suffix}.`);
      } catch {
        if (!cancelled) {
          trackGeneratorEvent({
            name: 'generator_integrity_check',
            campaignId,
            repaired: false,
            droppedPacks: 0,
            droppedLogs: 0,
            error: 'startup_integrity_check_failed',
          });
          toast.error('Nie udało się zweryfikować danych generatora po starcie.');
        }
      }
    }
    void validateGeneratorData();
    return () => {
      cancelled = true;
    };
  }, [db, campaignId]);

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
