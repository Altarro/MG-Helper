import { useState } from 'react';
import type { GeneratorRollResult } from '../contracts';

interface UseGeneratorRollHistoryOptions {
  limit?: number;
}

const DEFAULT_HISTORY_LIMIT = 8;

export function useGeneratorRollHistory(options: UseGeneratorRollHistoryOptions = {}) {
  const { limit = DEFAULT_HISTORY_LIMIT } = options;
  const [lastRoll, setLastRoll] = useState<GeneratorRollResult | null>(null);
  const [rollHistory, setRollHistory] = useState<GeneratorRollResult[]>([]);

  function pushRoll(roll: GeneratorRollResult) {
    setLastRoll(roll);
    setRollHistory((prev) => [roll, ...prev].slice(0, limit));
  }

  function clearRollHistory() {
    setLastRoll(null);
    setRollHistory([]);
  }

  function removeRoll(rollId: string) {
    setRollHistory((prev) => {
      const next = prev.filter((roll) => roll.id !== rollId);
      setLastRoll(next[0] ?? null);
      return next;
    });
  }

  return {
    lastRoll,
    rollHistory,
    pushRoll,
    removeRoll,
    clearRollHistory,
  };
}

