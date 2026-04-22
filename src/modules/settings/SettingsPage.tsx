import { useEffect, useRef, useState } from 'react';
import { Download, Upload, CheckCircle, AlertCircle, Loader2, Sparkles, Trash2, Archive, FolderArchive, Eraser, HardDrive } from 'lucide-react';
import { exportJson } from '@shared/utils/exportJson';
import { importJson } from '@shared/utils/importJson';
import { exportFull } from '@shared/utils/exportFull';
import { importFull, type ImportFullResult } from '@shared/utils/importFull';
import { cleanupOrphanAssets } from '@shared/db/assets';
import { seedDemoData } from '@shared/db/seedCampaign';
import { useCampaign } from '@shared/db/CampaignContext';
import { listCampaigns } from '@shared/db/campaignStore';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { toast } from 'sonner';

type ImportResultView =
  | { kind: 'json'; ok: boolean; entityCount: number; relationCount: number; errors: string[] }
  | { kind: 'full'; result: ImportFullResult };

export function SettingsPage() {
  const { db, campaignId } = useCampaign();
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'json' | 'full'>('json');
  const [confirmImport, setConfirmImport] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<ImportResultView | null>(null);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{ usage?: number; quota?: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function read() {
      if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return;
      try {
        const est = await navigator.storage.estimate();
        if (!cancelled) setStorageEstimate({ usage: est.usage, quota: est.quota });
      } catch {
        // ignore
      }
    }
    void read();
    return () => { cancelled = true; };
  }, []);

  async function handleExport() {
    try {
      const campaignMeta = listCampaigns().find((campaign) => campaign.id === campaignId) ?? null;
      await exportJson(db, { campaignMeta, campaignId });
      toast.success('Plik backup.json pobrany');
    } catch {
      toast.error('Eksport nie powiódł się');
    }
  }

  async function handleExportFull() {
    try {
      const campaignMeta = listCampaigns().find((campaign) => campaign.id === campaignId) ?? null;
      const result = await exportFull(db, { campaignMeta, campaignId });
      toast.success(
        `Pełny backup ZIP utworzony (${result.entityCount} encji, ${result.assetCount} obrazków)`,
      );
    } catch {
      toast.error('Eksport pełny nie powiódł się');
    }
  }

  function handleFileChange(mode: 'json' | 'full') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileToImport(file);
      setImportMode(mode);
      setConfirmImport(true);
      e.target.value = '';
    };
  }

  async function handleConfirmImport() {
    if (!fileToImport) return;
    setImporting(true);
    setLastImportResult(null);
    try {
      if (importMode === 'full') {
        const result = await importFull(db, fileToImport);
        setLastImportResult({ kind: 'full', result });
        if (result.ok) {
          toast.success(
            `Import pełny: ${result.entityCount} encji, ${result.assetCount} obrazków`,
          );
          if (result.warnings.length > 0) {
            toast.warning('Niektóre obrazki nie mogły zostać przywrócone — szczegóły poniżej.');
          }
        } else {
          toast.error('Import pełny nie powiódł się — sprawdź błędy poniżej');
        }
        return;
      }

      const text = await fileToImport.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        setLastImportResult({ kind: 'json', ok: false, entityCount: 0, relationCount: 0, errors: ['Plik nie jest prawidłowym JSON.'] });
        return;
      }
      const result = await importJson(db, raw);
      setLastImportResult({ kind: 'json', ...result });
      if (result.ok) {
        toast.success(`Import zakończony: ${result.entityCount} encji, ${result.relationCount} relacji`);
      } else {
        toast.error('Import nie powiódł się — sprawdź błędy poniżej');
      }
    } catch {
      toast.error('Błąd podczas importu');
    } finally {
      setImporting(false);
      setFileToImport(null);
    }
  }

  async function handleCleanupOrphans() {
    setCleaningOrphans(true);
    try {
      const summary = await cleanupOrphanAssets(db);
      if (summary.removed === 0) {
        toast.success('Brak osieroconych obrazków — wszystko uporządkowane.');
      } else {
        const mb = summary.reclaimedBytes > 0
          ? ` (${(summary.reclaimedBytes / (1024 * 1024)).toFixed(2)} MB odzyskane)`
          : '';
        toast.success(`Usunięto ${summary.removed} osieroconych obrazków${mb}`);
      }
    } catch {
      toast.error('Nie udało się posprzątać obrazków');
    } finally {
      setCleaningOrphans(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-bold text-surface-900">Ustawienia</h1>

      <section className="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-surface-800">Kopie zapasowe</h2>
        <p className="mb-5 text-sm text-surface-500">
          Wszystkie dane przechowywane są lokalnie w przeglądarce (IndexedDB). Lekki backup JSON zawiera
          tylko dane encji (bez obrazków), pełny backup ZIP zawiera także pliki obrazków.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Download className="h-4 w-4" />
            Backup JSON
          </button>

          <button
            onClick={handleExportFull}
            className="flex items-center gap-2 rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            <Archive className="h-4 w-4" />
            Backup pełny (ZIP)
          </button>

          <button
            onClick={() => jsonInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Importuj JSON
          </button>

          <button
            onClick={() => zipInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderArchive className="h-4 w-4" />
            )}
            Importuj pełny (ZIP)
          </button>

          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange('json')}
          />
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={handleFileChange('full')}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleCleanupOrphans}
            disabled={cleaningOrphans}
            className="flex items-center gap-2 rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
          >
            {cleaningOrphans ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
            Sprzątnij osierocone obrazki
          </button>
        </div>

        {storageEstimate && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-700">
            <HardDrive className="h-4 w-4 text-surface-500" />
            <span>
              Wykorzystanie pamięci przeglądarki:{' '}
              <strong>{formatBytes(storageEstimate.usage)}</strong>
              {storageEstimate.quota ? (
                <> z <strong>{formatBytes(storageEstimate.quota)}</strong></>
              ) : null}
            </span>
          </div>
        )}

        {lastImportResult && (
          <ImportResultPanel result={lastImportResult} />
        )}
      </section>

      <ConfirmDialog
        open={confirmImport}
        title="Importuj dane"
        description={`Importowanie pliku „${fileToImport?.name}" USUNIE wszystkie istniejące dane i zastąpi je zawartością pliku. Czy na pewno chcesz kontynuować?`}
        confirmLabel="Importuj"
        destructive
        onConfirm={() => { setConfirmImport(false); void handleConfirmImport(); }}
        onCancel={() => { setConfirmImport(false); setFileToImport(null); }}
      />

      <section className="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-surface-800">Dane demonstracyjne</h2>
        <p className="mb-5 text-sm text-surface-500">
          Załaduj przykładową kampanię z postaciami, lokacjami, frakcjami, frontami i zegarami.
          <strong className="text-red-600"> Uwaga: usuwa wszystkie istniejące dane!</strong>
        </p>
        <DemoDataSection />
      </section>

      <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-red-700">Strefa niebezpieczna</h2>
        <p className="mb-5 text-sm text-surface-500">
          Trwale usuń wszystkie dane kampanii z tej przeglądarki. Operacja jest nieodwracalna.
        </p>
        <DeleteAllSection />
      </section>
    </div>
  );
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes || !Number.isFinite(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function ImportResultPanel({ result }: { result: ImportResultView }) {
  if (result.kind === 'full') {
    const r = result.result;
    return (
      <div className={`mt-4 rounded-lg border p-4 text-sm ${r.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex items-center gap-2 mb-1 font-medium">
          {r.ok ? (
            <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-green-800">Import pełny zakończony</span></>
          ) : (
            <><AlertCircle className="h-4 w-4 text-red-600" /><span className="text-red-800">Import pełny nie powiódł się</span></>
          )}
        </div>
        {r.ok ? (
          <>
            <p className="text-green-700">
              Zaimportowano {r.entityCount} encji, {r.relationCount} relacji, {r.assetCount} obrazków.
            </p>
            {r.warnings.length > 0 && (
              <ul className="mt-2 list-disc list-inside space-y-1 text-yellow-800">
                {r.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </>
        ) : (
          <ul className="mt-1 list-disc list-inside space-y-1 text-red-700">
            {r.errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={`mt-4 rounded-lg border p-4 text-sm ${result.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-center gap-2 mb-1 font-medium">
        {result.ok ? (
          <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-green-800">Import zakończony pomyślnie</span></>
        ) : (
          <><AlertCircle className="h-4 w-4 text-red-600" /><span className="text-red-800">Import nie powiódł się</span></>
        )}
      </div>
      {result.ok ? (
        <p className="text-green-700">
          Zaimportowano {result.entityCount} encji i {result.relationCount} relacji.
        </p>
      ) : (
        <ul className="mt-1 list-disc list-inside space-y-1 text-red-700">
          {result.errors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
      )}
    </div>
  );
}

function DemoDataSection() {
  const { db } = useCampaign();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  async function handleSeed() {
    setLoading(true);
    try {
      await seedDemoData(db);
      toast.success('Dane demonstracyjne załadowane!');
    } catch {
      toast.error('Błąd podczas ładowania danych demo');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        disabled={loading}
        className="flex items-center gap-2 rounded-md border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Załaduj dane demo
      </button>
      <ConfirmDialog
        open={confirm}
        title="Załaduj dane demonstracyjne"
        description="To usunie wszystkie istniejące dane i zastąpi je przykładową kampanią. Kontynuować?"
        confirmLabel="Załaduj"
        destructive
        onConfirm={() => { setConfirm(false); void handleSeed(); }}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}

function DeleteAllSection() {
  const { db } = useCampaign();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [expectedCode, setExpectedCode] = useState('');
  const [deleting, setDeleting] = useState(false);

  function openDialog() {
    setExpectedCode(String(Math.floor(1000 + Math.random() * 9000)));
    setCode('');
    setOpen(true);
  }

  async function handleDeleteAll() {
    setDeleting(true);
    try {
      await db.transaction('rw', db.entities, db.relations, db.assets, async () => {
        await db.entities.clear();
        await db.relations.clear();
        await db.assets.clear();
      });
      toast.success('Wszystkie dane zostały usunięte');
      setOpen(false);
    } catch {
      toast.error('Nie udało się usunąć danych');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        onClick={openDialog}
        className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
        Usuń wszystkie dane
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-semibold text-red-700">Usuń wszystkie dane</h3>
            <p className="mb-4 text-sm text-surface-600">
              Ta operacja jest <strong>nieodwracalna</strong>. Wszystkie encje i relacje zostaną trwale usunięte.
            </p>
            <p className="mb-2 text-sm text-surface-700">
              Wpisz kod{' '}
              <span className="font-mono font-bold text-red-700">{expectedCode}</span>, aby potwierdzić:
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={4}
              placeholder="____"
              autoFocus
              className="mb-4 w-full rounded-md border border-surface-300 px-3 py-2 text-center font-mono text-lg tracking-widest focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-surface-300 px-4 py-2 text-sm text-surface-700 hover:bg-surface-50"
              >
                Anuluj
              </button>
              <button
                onClick={() => void handleDeleteAll()}
                disabled={code !== expectedCode || deleting}
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Usuń wszystko
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
