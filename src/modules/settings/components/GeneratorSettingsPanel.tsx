import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { generateId } from '@shared/utils/id';
import { nowISO } from '@shared/utils/date';
import { useDebounce } from '@shared/hooks';
import type { MgHelperDb } from '@shared/db/database';
import type { GeneratorPackRecord, GeneratorTableRecord } from '@shared/types/generator';
import { GENERATOR_SYSTEM_TABLE_TYPES } from '@modules/generator/contracts';
import { parseGeneratorAiResponse, parseGeneratorCsv, parseGeneratorJson } from '@modules/generator/importFormats';
import { importGeneratorPacks, type GeneratorMergeMode, saveGeneratorPack } from '@modules/generator/repository';
import {
  getMissingAiKeywords,
  normalizeTagList,
  normalizePackTags,
  validateLinkedTableTagCompatibility,
} from '@modules/generator/releaseContract';
import { trackGeneratorEvent } from '@modules/generator/telemetry';

interface GeneratorSettingsPanelProps {
  db: MgHelperDb;
  campaignId: string;
  generatorPacks: GeneratorPackRecord[];
  initialPackId?: string;
  onClose?: () => void;
}

type ImportPreviewState =
  | {
      mode: 'csv';
      ok: boolean;
      rows: number;
      overwriteCollisions?: number;
      errors: string[];
    }
  | {
      mode: 'json';
      ok: boolean;
      packs: number;
      tables: number;
      errors: string[];
    };

type EditorFeedback =
  | { level: 'success' | 'error' | 'info'; message: string }
  | null;

type LastRemovalState =
  | {
      kind: 'table';
      packId: string;
      removedTable: GeneratorTableRecord;
      insertAt: number;
    }
  | {
      kind: 'entry';
      packId: string;
      tableId: string;
      removedEntry: GeneratorTableRecord['entries'][number];
      insertAt: number;
    }
  | null;

type TableNameDraftState = { tableId: string; value: string } | null;
type EntryDraftState = {
  tableId: string;
  entries: Record<string, { value: string; weight: number; tagsText: string }>;
} | null;

export function GeneratorSettingsPanel({
  db,
  campaignId,
  generatorPacks,
  initialPackId,
  onClose,
}: GeneratorSettingsPanelProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [newTableName, setNewTableName] = useState('');
  const [newTableType, setNewTableType] = useState<(typeof GENERATOR_SYSTEM_TABLE_TYPES)[number] | 'custom'>(
    'custom',
  );
  const [newCustomType, setNewCustomType] = useState('');
  const [feedback, setFeedback] = useState<EditorFeedback>(null);
  const [importPayload, setImportPayload] = useState('');
  const [importKind, setImportKind] = useState<'json' | 'csv'>('json');
  const [importMergeMode, setImportMergeMode] = useState<GeneratorMergeMode>('append');
  const [importPreviewState, setImportPreviewState] = useState<ImportPreviewState | null>(null);
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [lastRemoval, setLastRemoval] = useState<LastRemovalState>(null);
  const [tableNameDraft, setTableNameDraft] = useState<TableNameDraftState>(null);
  const [entryDraftState, setEntryDraftState] = useState<EntryDraftState>(null);
  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const [importFlowStarted, setImportFlowStarted] = useState(false);
  const [importFlowApplied, setImportFlowApplied] = useState(false);

  const selectedPack = useMemo(
    () => generatorPacks.find((pack) => pack.id === selectedPackId) ?? generatorPacks[0] ?? null,
    [generatorPacks, selectedPackId],
  );
  const selectedTable = useMemo(
    () => selectedPack?.tables.find((table) => table.id === selectedTableId) ?? selectedPack?.tables[0] ?? null,
    [selectedPack, selectedTableId],
  );
  const debouncedTableNameDraft = useDebounce(tableNameDraft, 300);
  const debouncedEntryDraftState = useDebounce(entryDraftState, 300);

  useEffect(() => {
    if (!initialPackId) return;
    setSelectedPackId(initialPackId);
  }, [initialPackId]);

  useEffect(() => {
    if (!selectedTable) {
      setTableNameDraft(null);
      setEntryDraftState(null);
      return;
    }
    setTableNameDraft({ tableId: selectedTable.id, value: selectedTable.name });
    setEntryDraftState({
      tableId: selectedTable.id,
      entries: Object.fromEntries(
        selectedTable.entries.map((entry) => [
          entry.id,
          { value: entry.value, weight: entry.weight, tagsText: entry.tags.join(', ') },
        ]),
      ),
    });
  }, [selectedTable?.id, selectedTable?.updatedAt]);

  async function persistPack(pack: GeneratorPackRecord) {
    await saveGeneratorPack(db, { ...pack, updatedAt: nowISO() });
  }

  useEffect(() => {
    if (!selectedPack || !debouncedTableNameDraft) return;
    const targetTable = selectedPack.tables.find((table) => table.id === debouncedTableNameDraft.tableId);
    if (!targetTable) return;
    const original = targetTable.name;
    const next = debouncedTableNameDraft.value.trim();
    if (!next || next === original) return;
    void persistPack({
      ...selectedPack,
      tables: selectedPack.tables.map((table) =>
        table.id === debouncedTableNameDraft.tableId ? { ...table, name: next, updatedAt: nowISO() } : table,
      ),
    });
  }, [debouncedTableNameDraft, selectedPack]);

  useEffect(() => {
    if (!selectedPack || !debouncedEntryDraftState) return;
    const targetTable = selectedPack.tables.find((table) => table.id === debouncedEntryDraftState.tableId);
    if (!targetTable || Object.keys(debouncedEntryDraftState.entries).length === 0) return;
    const hasChanges = targetTable.entries.some((entry) => {
      const draft = debouncedEntryDraftState.entries[entry.id];
      if (!draft) return false;
      return (
        draft.value !== entry.value ||
        draft.weight !== entry.weight ||
        draft.tagsText !== entry.tags.join(', ')
      );
    });
    if (!hasChanges) return;
    void persistPack({
      ...selectedPack,
      tables: selectedPack.tables.map((table) =>
        table.id === debouncedEntryDraftState.tableId
          ? {
              ...table,
              updatedAt: nowISO(),
              entries: table.entries.map((entry) => {
                const draft = debouncedEntryDraftState.entries[entry.id];
                if (!draft) return entry;
                return {
                  ...entry,
                  value: draft.value,
                  weight: Math.max(1, draft.weight),
                  tags: draft.tagsText
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                };
              }),
            }
          : table,
      ),
    });
  }, [debouncedEntryDraftState, selectedPack]);

  useEffect(() => {
    if (!importPayload.trim() || importFlowStarted) return;
    trackGeneratorEvent({
      name: 'generator_import_flow',
      stage: 'started',
      kind: importKind,
      mergeMode: importMergeMode,
    });
    setImportFlowStarted(true);
  }, [importFlowStarted, importKind, importMergeMode, importPayload]);

  useEffect(() => {
    return () => {
      if (!importFlowStarted || importFlowApplied) return;
      trackGeneratorEvent({
        name: 'generator_import_flow',
        stage: 'abandoned',
        kind: importKind,
        mergeMode: importMergeMode,
      });
    };
  }, [importFlowApplied, importFlowStarted, importKind, importMergeMode]);

  async function handleCreateTable() {
    if (!selectedPack) return;
    const type = newTableType === 'custom' ? normalizeCustomType(newCustomType) : newTableType;
    if (!newTableName.trim()) {
      setFeedback({ level: 'error', message: 'Nazwa tabeli jest wymagana.' });
      return;
    }
    if (!type) {
      setFeedback({ level: 'error', message: 'Typ custom musi miec format custom:nazwa.' });
      return;
    }
    setFeedback(null);
    const table: GeneratorTableRecord = {
      id: generateId(),
      name: newTableName.trim(),
      type,
      entries: [],
      isActive: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    await persistPack({ ...selectedPack, tables: [...selectedPack.tables, table] });
    setNewTableName('');
    setNewCustomType('');
    setSelectedTableId(table.id);
    toast.success(`Dodano tabele: ${table.name}`);
  }

  async function handleDeleteTable(tableId: string) {
    if (!selectedPack) return;
    const index = selectedPack.tables.findIndex((table) => table.id === tableId);
    const removedTable = selectedPack.tables[index];
    if (!removedTable) return;
    setLastRemoval({ kind: 'table', packId: selectedPack.id, removedTable, insertAt: index });
    await persistPack({ ...selectedPack, tables: selectedPack.tables.filter((table) => table.id !== tableId) });
    if (selectedTableId === tableId) setSelectedTableId('');
    toast.success('Tabela usunieta');
    setFeedback({ level: 'info', message: 'Usunieto tabele. Mozesz cofnac operacje.' });
  }

  async function handleDuplicateTable(table: GeneratorTableRecord) {
    if (!selectedPack) return;
    const duplicated: GeneratorTableRecord = {
      ...table,
      id: generateId(),
      name: `${table.name} (kopia)`,
      entries: table.entries.map((entry) => ({ ...entry, id: generateId() })),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    await persistPack({ ...selectedPack, tables: [...selectedPack.tables, duplicated] });
    toast.success('Tabela zduplikowana');
  }

  async function handleAddEntry() {
    if (!selectedPack || !selectedTable) return;
    const nextTables = selectedPack.tables.map((table) =>
      table.id === selectedTable.id
        ? {
            ...table,
            updatedAt: nowISO(),
            entries: [
              ...table.entries,
              { id: generateId(), value: 'Nowy wpis', weight: 1, tags: [], isActive: true },
            ],
          }
        : table,
    );
    await persistPack({ ...selectedPack, tables: nextTables });
  }

  function handleUpdateEntryDraft(
    entryId: string,
    patch: Partial<{ value: string; weight: number; tagsText: string }>,
  ) {
    if (!selectedTable) return;
    setEntryDraftState((current) => {
      const currentEntries = current?.tableId === selectedTable.id ? current.entries : {};
      const fallback = selectedTable.entries.find((entry) => entry.id === entryId);
      const existing = currentEntries[entryId] ?? {
        value: fallback?.value ?? '',
        weight: fallback?.weight ?? 1,
        tagsText: fallback?.tags.join(', ') ?? '',
      };
      return {
        tableId: selectedTable.id,
        entries: { ...currentEntries, [entryId]: { ...existing, ...patch } },
      };
    });
  }

  async function handleDeleteEntry(entryId: string) {
    if (!selectedPack || !selectedTable) return;
    const index = selectedTable.entries.findIndex((entry) => entry.id === entryId);
    const removedEntry = selectedTable.entries[index];
    if (!removedEntry) return;
    setLastRemoval({
      kind: 'entry',
      packId: selectedPack.id,
      tableId: selectedTable.id,
      removedEntry,
      insertAt: index,
    });
    const nextTables = selectedPack.tables.map((table) =>
      table.id === selectedTable.id
        ? { ...table, updatedAt: nowISO(), entries: table.entries.filter((entry) => entry.id !== entryId) }
        : table,
    );
    await persistPack({ ...selectedPack, tables: nextTables });
    setFeedback({ level: 'info', message: 'Usunieto wpis. Mozesz cofnac operacje.' });
  }

  async function handleDropEntry(targetEntryId: string) {
    if (!draggedEntryId || !selectedPack || !selectedTable || draggedEntryId === targetEntryId) return;
    const sourceIndex = selectedTable.entries.findIndex((entry) => entry.id === draggedEntryId);
    const targetIndex = selectedTable.entries.findIndex((entry) => entry.id === targetEntryId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const reordered = [...selectedTable.entries];
    const [moved] = reordered.splice(sourceIndex, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);
    const nextTables = selectedPack.tables.map((table) =>
      table.id === selectedTable.id ? { ...table, updatedAt: nowISO(), entries: reordered } : table,
    );
    await persistPack({ ...selectedPack, tables: nextTables });
    setDraggedEntryId(null);
  }

  function buildImportPreview(): ImportPreviewState {
    if (!importPayload.trim()) {
      return {
        mode: importKind,
        ok: false,
        ...(importKind === 'csv' ? { rows: 0 } : { packs: 0, tables: 0 }),
        errors: ['Wklej payload do podgladu importu.'],
      } as ImportPreviewState;
    }
    if (importKind === 'csv') {
      const parsed = parseGeneratorCsv(importPayload);
      const overwriteCollisions =
        importMergeMode === 'overwrite' && selectedTable
          ? countOverwriteCollisions(parsed.rows, selectedTable)
          : 0;
      return {
        mode: 'csv',
        ok: parsed.ok,
        rows: parsed.rows.length,
        overwriteCollisions,
        errors: parsed.errors,
      };
    }
    try {
      const parsedPayload = JSON.parse(importPayload);
      const resolved = resolveJsonImportPayload(parsedPayload, campaignId);
      if (!resolved.ok) {
        return { mode: 'json', ok: false, packs: 0, tables: 0, errors: resolved.errors };
      }
      const packs = resolved.packs.length;
      const tables = resolved.packs.reduce((sum, pack) => sum + pack.tables.length, 0);
      return { mode: 'json', ok: true, packs, tables, errors: [] };
    } catch {
      return { mode: 'json', ok: false, packs: 0, tables: 0, errors: ['Nieprawidlowy JSON.'] };
    }
  }

  async function handleImportApply() {
    if (isApplyingImport) return;
    const preview = buildImportPreview();
    setImportPreviewState(preview);
    if (!preview.ok) {
      const firstError = preview.errors[0] ?? 'Import zawiera bledy.';
      setFeedback({ level: 'error', message: firstError });
      toast.error(firstError);
      return;
    }

    const confirmMessage =
      importMergeMode === 'replace'
        ? importKind === 'csv'
          ? 'Tryb zastap usunie wszystkie wpisy w docelowej tabeli. Kontynuowac?'
          : 'Tryb zastap usunie istniejace paczki generatora dla kampanii. Kontynuowac?'
        : null;
    if (confirmMessage && typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
      setFeedback({ level: 'info', message: 'Anulowano import w trybie zastap.' });
      return;
    }

    setIsApplyingImport(true);
    try {
      if (importKind === 'csv') {
        if (!selectedPack || !selectedTable) {
          const message = 'Dla CSV wybierz zestaw i tabele docelowa.';
          setFeedback({ level: 'error', message });
          toast.error(message);
          return;
        }
        const parsed = parseGeneratorCsv(importPayload);
        if (!parsed.ok) {
          const message = parsed.errors[0] ?? 'CSV zawiera bledy.';
          setFeedback({ level: 'error', message });
          toast.error(message);
          return;
        }
        const csvRows = parsed.rows.map((row) => ({
          id: generateId(),
          value: row.value,
          weight: row.weight,
          tags: row.tags,
          isActive: true,
        }));
        const nextTables = selectedPack.tables.map((table) => {
          if (table.id !== selectedTable.id) return table;
          if (importMergeMode === 'replace') {
            return { ...table, entries: csvRows, updatedAt: nowISO() };
          }
          if (importMergeMode === 'overwrite') {
            const existingByValue = new Map(
              table.entries.map((entry) => [entry.value.trim().toLowerCase(), entry]),
            );
            for (const row of csvRows) {
              existingByValue.set(row.value.trim().toLowerCase(), row);
            }
            return { ...table, entries: Array.from(existingByValue.values()), updatedAt: nowISO() };
          }
          return { ...table, entries: [...table.entries, ...csvRows], updatedAt: nowISO() };
        });
        await persistPack({ ...selectedPack, tables: nextTables });
        trackGeneratorEvent({
          name: 'generator_import_flow',
          stage: 'applied',
          kind: 'csv',
          mergeMode: importMergeMode,
        });
        setImportFlowApplied(true);
        const collisionCount =
          importMergeMode === 'overwrite' ? countOverwriteCollisions(parsed.rows, selectedTable) : 0;
        toast.success(`Import CSV OK: ${csvRows.length} wpisow (${importMergeMode}).`);
        setFeedback({
          level: 'success',
          message:
            collisionCount > 0
              ? `Import CSV zakonczony (${csvRows.length} wpisow, nadpisano kolizje: ${collisionCount}).`
              : `Import CSV zakonczony (${csvRows.length} wpisow).`,
        });
        return;
      }

      const parsedPayload = JSON.parse(importPayload);
      const resolved = resolveJsonImportPayload(parsedPayload, campaignId);
      if (!resolved.ok) {
        const message = resolved.errors[0] ?? 'JSON zawiera bledy.';
        setFeedback({ level: 'error', message });
        toast.error(message);
        return;
      }
      await importGeneratorPacks(db, campaignId, resolved.packs, importMergeMode);
      trackGeneratorEvent({
        name: 'generator_import_flow',
        stage: 'applied',
        kind: 'json',
        mergeMode: importMergeMode,
      });
      setImportFlowApplied(true);
      toast.success(`Import JSON OK: ${resolved.packs.length} paczek (${importMergeMode}).`);
      setFeedback({ level: 'success', message: `Import JSON zakonczony (${resolved.packs.length} paczek).` });
    } catch {
      trackGeneratorEvent({
        name: 'generator_import_flow',
        stage: 'failed',
        kind: importKind,
        mergeMode: importMergeMode,
        error: 'runtime_error',
      });
      const message = 'Import nie powiodl sie z powodu bledu wykonania.';
      setFeedback({ level: 'error', message });
      toast.error(message);
    } finally {
      setIsApplyingImport(false);
    }
  }

  async function handleUndoLastRemoval() {
    if (!lastRemoval) return;
    const targetPack = generatorPacks.find((pack) => pack.id === lastRemoval.packId);
    if (!targetPack) return;
    if (lastRemoval.kind === 'table') {
      const nextTables = [...targetPack.tables];
      nextTables.splice(lastRemoval.insertAt, 0, lastRemoval.removedTable);
      await persistPack({ ...targetPack, tables: nextTables });
      setLastRemoval(null);
      setFeedback({ level: 'success', message: 'Przywrocono usunieta tabele.' });
      return;
    }
    const nextTables = targetPack.tables.map((table) => {
      if (table.id !== lastRemoval.tableId) return table;
      const nextEntries = [...table.entries];
      nextEntries.splice(lastRemoval.insertAt, 0, lastRemoval.removedEntry);
      return { ...table, entries: nextEntries, updatedAt: nowISO() };
    });
    await persistPack({ ...targetPack, tables: nextTables });
    setLastRemoval(null);
    setFeedback({ level: 'success', message: 'Przywrocono usuniety wpis.' });
  }

  const selectedTableName =
    selectedTable && tableNameDraft?.tableId === selectedTable.id ? tableNameDraft.value : selectedTable?.name ?? '';
  const selectedEntryDrafts =
    selectedTable && entryDraftState?.tableId === selectedTable.id ? entryDraftState.entries : {};

  return (
    <div className="mt-5 grid gap-4">
      {feedback && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            feedback.level === 'error'
              ? 'border-danger-300 bg-danger-50 text-danger-700'
              : feedback.level === 'success'
                ? 'border-success-300 bg-success-50 text-success-700'
                : 'border-primary-200 bg-primary-50 text-primary-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p>{feedback.message}</p>
            {lastRemoval ? (
              <button type="button" onClick={() => void handleUndoLastRemoval()} className="app-button-secondary rounded-md px-2 py-1 text-[11px]">
                Cofnij
              </button>
            ) : (
              <button type="button" onClick={() => setFeedback(null)} className="app-button-secondary rounded-md px-2 py-1 text-[11px]">
                Zamknij
              </button>
            )}
          </div>
        </div>
      )}
      <div className="app-input-shell rounded-[1.15rem] p-4">
        <p className="text-surface-500 mb-2 text-xs font-semibold tracking-[0.14em] uppercase">Edytor zestawu</p>
        <div className="grid gap-2 md:grid-cols-3">
          <select
            value={selectedPack?.id ?? ''}
            onChange={(event) => setSelectedPackId(event.target.value)}
            className="app-input rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Wybierz zestaw...</option>
            {generatorPacks.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.name}
              </option>
            ))}
          </select>
          <input
            value={newTableName}
            onChange={(event) => setNewTableName(event.target.value)}
            placeholder="Nowa tabela..."
            className="app-input rounded-xl px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={newTableType}
              onChange={(event) => setNewTableType(event.target.value as 'custom')}
              className="app-input w-full rounded-xl px-3 py-2 text-sm"
            >
              <option value="custom">custom</option>
              {GENERATOR_SYSTEM_TABLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void handleCreateTable()} className="app-button-primary rounded-xl px-3 py-2 text-xs font-semibold">
              Dodaj
            </button>
          </div>
        </div>
        {newTableType === 'custom' && (
          <input
            value={newCustomType}
            onChange={(event) => setNewCustomType(event.target.value)}
            placeholder="custom:nazwa"
            className="app-input mt-2 w-full rounded-xl px-3 py-2 text-sm"
          />
        )}
      </div>

      {selectedPack && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="app-input-shell rounded-[1.15rem] p-3">
            <p className="text-surface-500 mb-2 text-xs font-semibold tracking-[0.14em] uppercase">Tabele</p>
            <div className="flex flex-col gap-2" role="listbox" aria-label="Lista tabel">
              {selectedPack.tables.map((table) => (
                <div
                  key={table.id}
                  role="option"
                  aria-selected={table.id === selectedTable?.id}
                  tabIndex={0}
                  onClick={() => setSelectedTableId(table.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedTableId(table.id);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border px-3 py-2 transition ${
                    table.id === selectedTable?.id
                      ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-200'
                      : 'border-surface-200'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-left text-sm font-semibold text-surface-800">
                      {table.name}
                    </span>
                    <span className="text-surface-500 text-xs">{table.type}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDuplicateTable(table);
                        }}
                        className="app-button-secondary rounded-md px-2 py-1 text-[11px]"
                      >
                        Duplikuj
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteTable(table.id);
                        }}
                        className="app-button-secondary rounded-md px-2 py-1 text-[11px]"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="app-input-shell rounded-[1.15rem] p-3">
            {selectedTable && (
              <div className="mb-3">
                <label className="text-surface-500 mb-1 block text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Nazwa tabeli
                </label>
                <input
                  value={selectedTableName}
                  onChange={(event) =>
                    setTableNameDraft(selectedTable ? { tableId: selectedTable.id, value: event.target.value } : null)
                  }
                  className="app-input w-full rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
            )}
            <div className="mb-2 flex items-center justify-between">
              <p className="text-surface-500 text-xs font-semibold tracking-[0.14em] uppercase">Wpisy tabeli</p>
              <button type="button" onClick={() => void handleAddEntry()} className="app-button-secondary rounded-md px-2 py-1 text-[11px]">
                Dodaj wpis
              </button>
            </div>
            {!selectedTable ? (
              <p className="text-surface-500 text-sm">Wybierz tabele.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedTable.entries.map((entry) => {
                  const entryDraft = selectedEntryDrafts[entry.id] ?? {
                    value: entry.value,
                    weight: entry.weight,
                    tagsText: entry.tags.join(', '),
                  };
                  return (
                    <div
                    key={entry.id}
                    draggable
                    onDragStart={() => setDraggedEntryId(entry.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void handleDropEntry(entry.id)}
                    className="rounded-xl border border-surface-200 p-2"
                    >
                    <input
                      value={entryDraft.value}
                      onChange={(event) => handleUpdateEntryDraft(entry.id, { value: event.target.value })}
                      className="app-input mb-1 w-full rounded-lg px-2 py-1 text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={entryDraft.weight}
                        onChange={(event) =>
                          handleUpdateEntryDraft(entry.id, { weight: Number(event.target.value) || 1 })
                        }
                        className="app-input w-20 rounded-lg px-2 py-1 text-xs"
                      />
                      <input
                        value={entryDraft.tagsText}
                        onChange={(event) => handleUpdateEntryDraft(entry.id, { tagsText: event.target.value })}
                        placeholder="tag1, tag2"
                        className="app-input w-full rounded-lg px-2 py-1 text-xs"
                      />
                      <button type="button" onClick={() => void handleDeleteEntry(entry.id)} className="app-button-secondary rounded-md px-2 py-1 text-[11px]">
                        Usuń
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="app-input-shell rounded-[1.15rem] p-4">
        <p className="text-surface-500 mb-2 text-xs font-semibold tracking-[0.14em] uppercase">Import z podgladem</p>
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => setImportKind('json')} className={`rounded-full px-3 py-1 text-xs ${importKind === 'json' ? 'app-pill' : 'app-pill-muted'}`}>JSON</button>
          <button type="button" onClick={() => setImportKind('csv')} className={`rounded-full px-3 py-1 text-xs ${importKind === 'csv' ? 'app-pill' : 'app-pill-muted'}`}>CSV</button>
          <select
            value={importMergeMode}
            onChange={(event) => setImportMergeMode(event.target.value as GeneratorMergeMode)}
            className="app-input rounded-xl px-2 py-1 text-xs"
          >
            <option value="append">dopisz</option>
            <option value="overwrite">nadpisz</option>
            <option value="replace">zastap</option>
          </select>
        </div>
        <textarea
          value={importPayload}
          onChange={(event) => setImportPayload(event.target.value)}
          className="app-input min-h-32 w-full rounded-xl px-3 py-2 text-xs"
          placeholder={importKind === 'json' ? '{"packs":[...]}' : 'value,weight,tags'}
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              const preview = buildImportPreview();
              setImportPreviewState(preview);
              if (!preview.ok) {
                const message = preview.errors[0] ?? 'Bledny import';
                setFeedback({ level: 'error', message });
                toast.error(message);
                return;
              }
              if (preview.mode === 'csv') {
                trackGeneratorEvent({
                  name: 'generator_import_flow',
                  stage: 'preview_ok',
                  kind: 'csv',
                  mergeMode: importMergeMode,
                });
                setFeedback({ level: 'info', message: `Podglad CSV: ${preview.rows} wierszy gotowych do importu.` });
                toast.success(`Podglad CSV OK: ${preview.rows} wierszy`);
              } else {
                trackGeneratorEvent({
                  name: 'generator_import_flow',
                  stage: 'preview_ok',
                  kind: 'json',
                  mergeMode: importMergeMode,
                });
                setFeedback({
                  level: 'info',
                  message: `Podglad JSON: ${preview.packs} paczek i ${preview.tables} tabel gotowych do importu.`,
                });
                toast.success(`Podglad JSON OK: ${preview.packs} paczek, ${preview.tables} tabel`);
              }
            }}
            className="app-button-secondary rounded-xl px-3 py-2 text-xs font-semibold"
          >
            Podglad
          </button>
          <button
            type="button"
            disabled={isApplyingImport}
            onClick={() => void handleImportApply()}
            className="app-button-primary rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60"
          >
            {isApplyingImport ? 'Importowanie...' : 'Zastosuj import'}
          </button>
        </div>
        {importPreviewState && (
          <div className="mt-2 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-xs text-surface-700">
            {importPreviewState.ok ? (
              importPreviewState.mode === 'csv' ? (
                <p>
                  Preview: CSV gotowy ({importPreviewState.rows} wierszy)
                  {importPreviewState.overwriteCollisions
                    ? `, kolizje overwrite: ${importPreviewState.overwriteCollisions}`
                    : ''}
                  .
                </p>
              ) : (
                <p>
                  Preview: JSON gotowy ({importPreviewState.packs} paczek, {importPreviewState.tables} tabel).
                </p>
              )
            ) : (
              <p>Preview: blad — {importPreviewState.errors[0] ?? 'nieznany problem'}.</p>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="app-button-secondary rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Zakoncz edycje
        </button>
      </div>
    </div>
  );
}

function normalizeCustomType(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const prefixed = normalized.startsWith('custom:') ? normalized : `custom:${normalized}`;
  return /^custom:[a-z0-9][a-z0-9_-]{1,62}$/i.test(prefixed) ? prefixed : null;
}

function resolveJsonImportPayload(
  payload: unknown,
  campaignId: string,
): { ok: true; packs: GeneratorPackRecord[] } | { ok: false; errors: string[] } {
  const strictImport = parseGeneratorJson(payload);
  if (strictImport.ok) {
    const packs = (strictImport.data.packs as GeneratorPackRecord[]).map(normalizePackTags);
    const compatibilityErrors = packs.flatMap((pack) => validateLinkedTableTagCompatibility(pack));
    if (compatibilityErrors.length > 0) {
      return { ok: false, errors: compatibilityErrors };
    }
    return { ok: true, packs };
  }

  const aiImport = parseGeneratorAiResponse(payload);
  if (!aiImport.ok) {
    return { ok: false, errors: strictImport.errors };
  }
  const missingKeywords = getMissingAiKeywords(aiImport.data.pack.description ?? '');
  if (missingKeywords.length > 0) {
    return {
      ok: false,
      errors: [
        `Payload AI nie spelnia kontraktu keywordow. Brakuje: ${missingKeywords.join(', ')}.`,
      ],
    };
  }

  const now = nowISO();
  const normalizedPack: GeneratorPackRecord = {
    id: generateId(),
    campaignId,
    name: aiImport.data.pack.name,
    description: aiImport.data.pack.description ?? '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    tables: aiImport.data.pack.tables.map((table) => ({
      id: generateId(),
      name: table.name,
      type: table.type,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      entries: table.entries.map((entry) => ({
        id: generateId(),
        value: entry.value,
        weight: entry.weight,
        tags: normalizeTagList(entry.tags ?? []),
        isActive: true,
      })),
    })),
  };
  const withNormalizedTags = normalizePackTags(normalizedPack);
  const compatibilityErrors = validateLinkedTableTagCompatibility(withNormalizedTags);
  if (compatibilityErrors.length > 0) {
    return { ok: false, errors: compatibilityErrors };
  }
  return { ok: true, packs: [withNormalizedTags] };
}

function countOverwriteCollisions(
  rows: Array<{ value: string; weight: number; tags: string[] }>,
  table: GeneratorTableRecord,
): number {
  const existing = new Set(table.entries.map((entry) => entry.value.trim().toLowerCase()));
  return rows.reduce((count, row) => count + (existing.has(row.value.trim().toLowerCase()) ? 1 : 0), 0);
}

