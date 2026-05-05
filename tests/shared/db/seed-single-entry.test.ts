import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');
const dbDir = path.join(repoRoot, 'src', 'shared', 'db');
const srcDir = path.join(repoRoot, 'src');

function walkFiles(root: string): string[] {
  const entries = readdirSync(root);
  const result: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      result.push(...walkFiles(fullPath));
    } else {
      result.push(fullPath);
    }
  }
  return result;
}

describe('seed single entrypoint guard', () => {
  it('keeps only approved seed files under shared/db', () => {
    const seedFiles = readdirSync(dbDir).filter((name) => /^seed.*\.ts$/i.test(name)).sort();
    expect(seedFiles).toEqual(['seed.ts', 'seedCampaign.ts']);
  });

  it('forbids direct imports of seedCampaign outside seed.ts', () => {
    const sourceFiles = walkFiles(srcDir).filter((filePath) => /\.(ts|tsx)$/.test(filePath));
    const offenders = sourceFiles.filter((filePath) => {
      const normalized = filePath.replace(/\\/g, '/');
      if (normalized.endsWith('/src/shared/db/seed.ts')) return false;
      const content = readFileSync(filePath, 'utf8');
      return (
        content.includes("@shared/db/seedCampaign") ||
        content.includes("from './seedCampaign'") ||
        content.includes('from "./seedCampaign"')
      );
    });
    expect(offenders).toEqual([]);
  });
});
