import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..');
const SCAN_DIRS = [
  path.join(ROOT, 'src'),
  path.join(ROOT, 'tests'),
  path.join(ROOT, 'docs'),
];
const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.css',
  '.html',
]);
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.git',
]);
const SUSPICIOUS_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'replacement-char', pattern: /\uFFFD/u },
  { label: 'common-mojibake', pattern: /Ă|Ă…|Ă„|Ä‚|Äą|Ă˘â‚¬Â¦|Ă˘â‚¬â€ť|Ă˘â‚¬â€ś|â€|Ĺ|Ä/u },
];

function collectFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (SKIP_DIRS.has(entry.name)) return [];

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }
    return ALLOWED_EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

describe('encoding smoke', () => {
  it('does not contain suspicious mojibake sequences in repository text files', () => {
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const filePath of collectFiles(dir)) {
        if (path.resolve(filePath) === path.resolve(__filename)) continue;

        const content = fs.readFileSync(filePath, 'utf8');
        for (const { label, pattern } of SUSPICIOUS_PATTERNS) {
          if (pattern.test(content)) {
            offenders.push(`${path.relative(ROOT, filePath)} [${label}]`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
