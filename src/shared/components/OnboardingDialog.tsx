import { useState, useEffect } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { seedDemoData, hasExistingData } from '@shared/db/seed';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';

const DISMISSED_KEY = 'mg-helper-onboarding-dismissed';

export function OnboardingDialog() {
  const { db } = useCampaign();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    hasExistingData(db).then((has) => {
      if (!has) setVisible(true);
    });
  }, [db]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  async function handleLoadDemo() {
    setLoading(true);
    try {
      await seedDemoData(db);
      toast.success('Dane demonstracyjne załadowane!');
      dismiss();
    } catch {
      toast.error('Nie udało się załadować danych demo');
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <button
          onClick={dismiss}
          aria-label="Zamknij"
          className="absolute right-4 top-4 rounded-md p-1 text-surface-400 hover:bg-surface-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-7 w-7 text-primary-500" />
          <h2 id="onboarding-title" className="text-lg font-bold text-surface-900">Witaj w MG Helper!</h2>
        </div>

        <p className="mb-2 text-sm text-surface-600">
          MG Helper to narzędzie dla Mistrza Gry do zarządzania kampanią: postacie, lokacje, frakcje, fronty, zegary i sesje — wszystko w jednym miejscu.
        </p>
        <p className="mb-6 text-sm text-surface-600">
          Możesz zacząć od zera lub załadować przykładową kampanię, żeby zobaczyć MG Helper w akcji.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleLoadDemo}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Załaduj dane demonstracyjne
          </button>
          <button
            onClick={dismiss}
            className="rounded-md border border-surface-300 px-4 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
          >
            Zacznij od zera
          </button>
        </div>
      </div>
    </div>
  );
}
