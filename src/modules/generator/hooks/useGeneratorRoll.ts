import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { commitRollFromPack, previewRollFromPack } from '../service';
import type { GeneratorCompositeKind, GeneratorPack, GeneratorRollEngineOptions, GeneratorRollResult } from '../contracts';
import { useGeneratorRollHistory } from './useGeneratorRollHistory';
import { trackGeneratorEvent } from '../telemetry';

export type InspirationMode = 'character' | 'location' | 'eventTable' | 'customTable';

interface UseGeneratorRollOptions {
  activePack: GeneratorPack | null;
  historyLimit?: number;
  defaultRollOptions?: GeneratorRollEngineOptions;
  onCommit?: (roll: GeneratorRollResult) => Promise<void> | void;
}

export function useGeneratorRoll(options: UseGeneratorRollOptions) {
  const { activePack, historyLimit, defaultRollOptions, onCommit } = options;
  const [mode, setMode] = useState<InspirationMode>('character');
  const [customTableId, setCustomTableId] = useState('');
  const [pendingCommitCount, setPendingCommitCount] = useState(0);
  const [seed, setSeed] = useState<string>('');
  const [withoutRepetition, setWithoutRepetition] = useState(false);
  const { lastRoll, rollHistory, pushRoll, removeRoll, clearRollHistory } = useGeneratorRollHistory({
    limit: historyLimit,
  });

  const modeIconName = useMemo(() => {
    if (mode === 'character') return 'character';
    if (mode === 'location') return 'location';
    if (mode === 'eventTable') return 'eventTable';
    return 'customTable';
  }, [mode]);

  function toCompositeKind(nextMode: InspirationMode): GeneratorCompositeKind {
    if (nextMode === 'character') return 'character';
    if (nextMode === 'location') return 'location';
    if (nextMode === 'eventTable') return 'eventTable';
    return 'customTable';
  }

  function buildRollOptions(): GeneratorRollEngineOptions {
    return {
      ...defaultRollOptions,
      seed: seed.trim() ? seed.trim() : defaultRollOptions?.seed,
      withoutRepetition,
    };
  }

  function roll(nextMode: InspirationMode = mode, nextCustomTableId = customTableId) {
    if (!activePack) {
      toast.error('Brak aktywnego zestawu generatora');
      return;
    }
    if (nextMode === 'customTable' && !nextCustomTableId) {
      toast.error('Wybierz tabele wlasna');
      return;
    }

    const startedAt = performance.now();
    const result = commitRollFromPack({
      pack: activePack,
      kind: toCompositeKind(nextMode),
      customTableId: nextCustomTableId || undefined,
      options: buildRollOptions(),
    });
    pushRoll(result);
    trackGeneratorEvent({
      name: 'generator_roll_commit',
      kind: result.kind,
      packId: result.packId,
      customTableId: result.kind === 'customTable' ? (result.sourceTableIds[0] ?? nextCustomTableId) : undefined,
      hasSeed: Boolean(buildRollOptions().seed),
      withoutRepetition,
      durationMs: Math.max(0, performance.now() - startedAt),
    });
    setPendingCommitCount((value) => value + 1);
    Promise.resolve(onCommit?.(result))
      .catch(() => {
        removeRoll(result.id);
        toast.error('Nie udalo sie zapisac historii losowania');
      })
      .finally(() => setPendingCommitCount((value) => Math.max(0, value - 1)));
  }

  function preview(nextMode: InspirationMode = mode, nextCustomTableId = customTableId) {
    if (!activePack) return null;
    const startedAt = performance.now();
    const result = previewRollFromPack({
      pack: activePack,
      kind: toCompositeKind(nextMode),
      customTableId: nextCustomTableId || undefined,
      options: buildRollOptions(),
    });
    trackGeneratorEvent({
      name: 'generator_roll_preview',
      kind: result.kind,
      hasSeed: Boolean(buildRollOptions().seed),
      withoutRepetition,
      durationMs: Math.max(0, performance.now() - startedAt),
    });
    return result;
  }

  function rollAgain() {
    if (!lastRoll) {
      roll(mode, customTableId);
      return;
    }
    if (lastRoll.kind === 'customTable') {
      const previousTableId = lastRoll.sourceTableIds[0] ?? customTableId;
      roll('customTable', previousTableId);
      return;
    }
    if (lastRoll.kind === 'character') return roll('character');
    if (lastRoll.kind === 'location') return roll('location');
    roll('eventTable');
  }

  function rollCharacter() {
    roll('character');
  }

  function rollLocation() {
    roll('location');
  }

  function rollEvent() {
    roll('eventTable');
  }

  function rollCustom(tableId?: string) {
    roll('customTable', tableId ?? customTableId);
  }

  return {
    mode,
    setMode,
    customTableId,
    setCustomTableId,
    seed,
    setSeed,
    withoutRepetition,
    setWithoutRepetition,
    isCommitting: pendingCommitCount > 0,
    lastRoll,
    rollHistory,
    roll,
    preview,
    rollAgain,
    rollCharacter,
    rollLocation,
    rollEvent,
    rollCustom,
    modeIconName,
    clearRollHistory,
  };
}

